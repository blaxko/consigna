import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Button } from "@/components/base/buttons/button";
import { AlertTriangle, CheckCircle } from "@untitledui/icons";
import { BlockedCard } from "../components/BlockedCard.tsx";
import { InvoicePaper } from "../components/InvoicePaper.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { Skeleton } from "../components/Skeleton.tsx";
import { CONSIGNA_ADDRESS, EXPLORER, USDC_ADDRESS, ARC_CHAIN_ID } from "../lib/chain.ts";
import { consignaAbi, erc20Abi } from "../lib/abi.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { ensureArc } from "../lib/arc-wallet.ts";
import { useWalletPicker } from "../components/WalletPicker.tsx";
import {
  allowanceOf,
  approveExact,
  decodeRevert,
  NotConfirmedError,
  paidEvent,
  pay,
  payUnsimulated,
  readInvoice,
  waitForConfirmation,
  type Invoice,
} from "../lib/consigna.ts";
import {
  alreadyPaidCopy,
  checkBalance,
  COPY,
  feeLabel,
  formatShortTime,
  insufficientCopy,
  isUserRejection,
  matchDetails,
  settledLabel,
} from "../lib/invoice-logic.ts";

type Step = "view" | "review";
type PaidInfo = { txHash: Hex; payer: Address };
type PayResult =
  | { kind: "paid"; settledMs: number; fee: bigint; txHash: Hex }
  | { kind: "failed"; message: string; txHash?: Hex };

const POLL_EVERY_MS = 3_000; // PRD E13: re-read every 3 s
const POLL_FOR_MS = 60_000; // for 60 s, then stop. Never resend.
const CCTP_HELP = "https://docs.arc.io";

/** The fragment after #d= stays client-side. It is never sent to a server. */
function fragmentFrom(hash: string): string | null {
  const m = /^#d=(.*)$/.exec(hash);
  return m ? m[1] : null;
}

/** Flow B (PRD 5.3): /i/:id. Chain state is the only source for amount and payee. */
export function PayInvoice() {
  const { id = "" } = useParams();
  const location = useLocation();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const validId = /^0x[0-9a-fA-F]{64}$/.test(id);
  // Follows the URL hash, so a change to #d= on the same route is picked up without a remount.
  const fragment = useMemo(() => fragmentFrom(location.hash), [location.hash]);
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined); // undefined = loading, null = not found
  const [rpcDown, setRpcDown] = useState(false); // E14: shown as a status line, last known state stays on screen
  const retries = useRef(0);
  const [paid, setPaid] = useState<PaidInfo | undefined>();
  const [balance, setBalance] = useState<bigint | undefined>();
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [step, setStep] = useState<Step>("view");
  const [busy, setBusy] = useState<"approve" | "pay" | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [result, setResult] = useState<PayResult | undefined>();
  const [pending, setPending] = useState<Hex | undefined>();
  const sentAt = useRef<number>(0);
  // Flow C (PRD 5.4): the deliberate duplicate. Explain first, then send unsimulated so the revert lands on-chain.
  const [dupOpen, setDupOpen] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);
  const [dupPending, setDupPending] = useState<Hex | undefined>();
  const [dupResult, setDupResult] = useState<
    | { kind: "blocked"; payer: Address; paidAt: number; txHash: Hex }
    | { kind: "unexpected"; txHash: Hex }
    | { kind: "unknown"; message: string; txHash?: Hex }
    | undefined
  >();

  const onArc = chainId === ARC_CHAIN_ID;

  /**
   * Re-reads the invoice from chain (NFR-R2). Balances and allowance too, when a wallet is connected.
   * Returns undefined when Arc cannot be reached (E14). The page keeps its last state and retries with backoff.
   */
  async function refresh(): Promise<Invoice | null | undefined> {
    if (!publicClient || !validId) {
      setInvoice(null);
      return null;
    }
    let inv: Invoice;
    try {
      inv = await readInvoice(publicClient, id as Hex);
    } catch {
      setRpcDown(true);
      if (retries.current < 5) window.setTimeout(() => void refresh(), 3_000 * (++retries.current));
      return undefined;
    }
    setRpcDown(false);
    retries.current = 0;
    if (inv.status === "none") {
      setInvoice(null);
      return null;
    }
    setInvoice(inv);
    if (inv.status === "paid") {
      const ev = await paidEvent(publicClient, id as Hex, inv.paidBlock).catch(() => undefined);
      if (ev) setPaid(ev);
    }
    if (address && onArc) {
      const [bal, allow] = await Promise.all([
        publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
        allowanceOf(publicClient, address),
      ]);
      setBalance(bal as bigint);
      setAllowance(allow);
    }
    return inv;
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, address, onArc, publicClient]);

  // Line items are display-only until their hash matches the on-chain detailsHash (NFR-S7).
  const match = useMemo(
    () => (invoice ? matchDetails(fragment, invoice.detailsHash) : undefined),
    [fragment, invoice],
  );

  // ---- Not found (E8) ----
  if (invoice === null) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Invoice</h1>
        <p className="text-sm">{COPY.notFound}</p>
        <Link to="/" className="text-sm font-medium text-[color:var(--color-accent)] underline">
          Back to home
        </Link>
      </section>
    );
  }
  if (!invoice) {
    return <Skeleton rows={2} label="Loading invoice from Arc" />;
  }

  const amount = invoice.amount;
  const balanceCheck = balance !== undefined ? checkBalance(balance, amount) : undefined;
  const needsApproval = allowance < amount;

  // The banner under the paper: match, mismatch (E9) or absent (E10).
  const banner =
    match?.status === "match" ? (
      <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-ink)]">
        <CheckCircle className="size-5 text-[color:var(--color-accent)]" aria-hidden="true" /> Details match the on-chain invoice
      </p>
    ) : match?.status === "mismatch" ? (
      <div role="note" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <span>{COPY.detailsMismatch}</span>
      </div>
    ) : match?.status === "absent" ? (
      <p className="text-sm text-[color:var(--color-muted)]">{COPY.noFragment}</p>
    ) : undefined;

  // ---- Wallet and network (E1, E2): one shared picker, see WalletPicker.tsx ----
  const openWalletPicker = useWalletPicker().open;

  // ---- Step 1: approve exactly the invoice amount (E5 handled by the allowance read) ----
  async function approve() {
    if (!publicClient || !walletClient) return;
    setMessage(undefined);
    setBusy("approve");
    try {
      const hash = await approveExact(publicClient, walletClient, amount);
      setPending(hash);
      await waitForConfirmation(publicClient, hash);
      await refresh();
    } catch (e) {
      if (!isUserRejection(e)) setMessage(e instanceof NotConfirmedError ? COPY.notConfirmed : (e as Error).message?.split("\n")[0]);
    } finally {
      setBusy(undefined);
      setPending(undefined);
    }
  }

  // ---- Step 2: pay. Re-read first (E6), then send, then confirm. ----
  async function payNow() {
    if (!publicClient || !walletClient || !address) return;
    setMessage(undefined);
    setResult(undefined);
    const fresh = await refresh();
    if (!fresh) {
      setMessage(COPY.rpcDown);
      return;
    }
    // E6: someone else paid while this page was open. Show who and when, and never send.
    if (fresh.status === "paid") {
      setMessage(alreadyPaidCopy(fresh.payer, fresh.paidAt));
      return;
    }
    if (fresh.status !== "open") return; // cancelled: the page already shows it

    setBusy("pay");
    let hash: Hex;
    sentAt.current = Date.now();
    try {
      hash = await pay(publicClient, walletClient, id as Hex);
    } catch (e) {
      if (!isUserRejection(e)) setMessage((e as Error).message?.split("\n")[0]);
      setBusy(undefined);
      return; // rejected in wallet: stay on this step, no banner (E3)
    }
    setPending(hash);
    try {
      const receipt = await waitForConfirmation(publicClient, hash);
      const settledMs = Date.now() - sentAt.current;
      if (receipt.status === "success") {
        const fee = receipt.gasUsed * receipt.effectiveGasPrice;
        setResult({ kind: "paid", settledMs, fee, txHash: hash });
      } else {
        // Name the revert by re-running the same calldata at the failed block (E6 / PRD 5.4 rule).
        const decoded = await decodeRevert(publicClient, {
          from: address,
          to: CONSIGNA_ADDRESS,
          data: encodeFunctionData({ abi: consignaAbi, functionName: "pay", args: [id as Hex] }),
          blockNumber: receipt.blockNumber,
        });
        if (decoded.errorName === "AlreadyPaid") {
          const [, payer, paidAt] = decoded.args as [Hex, Address, bigint];
          setResult({ kind: "failed", message: alreadyPaidCopy(payer, Number(paidAt)), txHash: hash });
        } else {
          setResult({ kind: "failed", message: "Transaction failed on-chain.", txHash: hash });
        }
      }
    } catch (e) {
      if (e instanceof NotConfirmedError) {
        setResult({ kind: "failed", message: COPY.notConfirmed, txHash: hash });
        pollAfterTimeout();
      } else {
        setMessage((e as Error).message?.split("\n")[0]);
      }
    } finally {
      setBusy(undefined);
      setPending(undefined);
      await refresh();
    }
  }

  /** E13: after the 30 s timeout, re-read status every 3 s for 60 s. Never resend. */
  function pollAfterTimeout() {
    const started = Date.now();
    const timer = window.setInterval(async () => {
      const inv = await refresh();
      if ((inv && inv.status !== "open") || Date.now() - started > POLL_FOR_MS) window.clearInterval(timer);
    }, POLL_EVERY_MS);
  }

  /** Flow C: sends the duplicate without simulation, gas 120000n (in payUnsimulated). E13 applies. Never resends. */
  async function sendDuplicate() {
    if (!publicClient || !walletClient || !address) return;
    setDupBusy(true);
    setDupResult(undefined);
    const data = encodeFunctionData({ abi: consignaAbi, functionName: "pay", args: [id as Hex] });
    let hash: Hex;
    try {
      hash = await payUnsimulated(publicClient, walletClient, id as Hex);
    } catch (e) {
      if (!isUserRejection(e)) setDupResult({ kind: "unknown", message: (e as Error).message?.split("\n")[0] ?? "Not sent." });
      setDupBusy(false);
      return;
    }
    setDupPending(hash);
    try {
      const receipt = await waitForConfirmation(publicClient, hash);
      if (receipt.status === "success") {
        // Should never happen. A second payment settled, which the contract is meant to prevent.
        setDupResult({ kind: "unexpected", txHash: hash });
      } else {
        const decoded = await decodeRevert(publicClient, {
          from: address,
          to: CONSIGNA_ADDRESS,
          data,
          blockNumber: receipt.blockNumber,
        });
        if (decoded.errorName === "AlreadyPaid") {
          const [, payer, paidAt] = decoded.args as [Hex, Address, bigint];
          setDupResult({ kind: "blocked", payer, paidAt: Number(paidAt), txHash: hash });
        } else {
          // Decoding failed: build the card from the chain state instead (PRD 5.4 fallback).
          const fresh = await readInvoice(publicClient, id as Hex);
          setDupResult({ kind: "blocked", payer: fresh.payer, paidAt: fresh.paidAt, txHash: hash });
        }
      }
    } catch (e) {
      if (e instanceof NotConfirmedError) {
        setDupResult({ kind: "unknown", message: COPY.notConfirmed, txHash: hash });
        pollAfterTimeout();
      } else {
        setDupResult({ kind: "unknown", message: (e as Error).message?.split("\n")[0] ?? "Unknown error", txHash: hash });
      }
    } finally {
      setDupBusy(false);
      setDupPending(undefined);
    }
  }

  // ---- Paid or cancelled (PRD 5.3 step 6, E7) ----
  const txLink = (h: Hex) => `${EXPLORER}/tx/${h}`;

  return (
    <section className="flex flex-col gap-6">
      {rpcDown && (
        <p role="status" className="text-sm font-medium text-amber-800">
          {COPY.rpcDown}
        </p>
      )}
      <InvoicePaper
        ref_={invoice.ref}
        issuer={invoice.issuer}
        status={invoice.status}
        amountUnits={amount}
        createdAtSeconds={invoice.createdAt}
        client={match?.status === "match" ? match.details.client : undefined}
        lines={match?.status === "match" ? match.details.items : undefined}
        banner={banner}
      />

      {invoice.status === "paid" && (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">
            {result?.kind === "paid"
              ? `${settledLabel(result.settledMs)} · ${feeLabel(result.fee)}`
              : `Paid by ${shortAddress(paid?.payer ?? invoice.payer)} · ${formatShortTime(invoice.paidAt)}`}
          </p>
          {(paid?.txHash || (result?.kind === "paid" && result.txHash)) && (
            <a className="underline" href={txLink((result?.kind === "paid" ? result.txHash : paid!.txHash) as Hex)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          )}
        </div>
      )}

      {invoice.status === "cancelled" && <p className="text-sm">{COPY.cancelled}</p>}

      {invoice.status === "paid" && (
        <div className="flex flex-col gap-4">
          {!dupOpen && !dupResult && (
            <div>
              <Button size="md" color="secondary" onClick={() => setDupOpen(true)}>
                Try paying again
              </Button>
            </div>
          )}

          {dupOpen && !dupResult && (
            <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-line)] bg-white p-5 text-sm">
              <p>This sends a real transaction to show the contract refusing it. It costs about $0.01 in fees and no USDC is transferred.</p>
              <div className="flex flex-wrap gap-3">
                {!isConnected ? (
                  <Button size="md" color="primary" onClick={openWalletPicker}>Connect wallet</Button>
                ) : (
                  <Button size="md" color="primary" isLoading={dupBusy} isDisabled={!onArc} onClick={sendDuplicate}>
                    Send duplicate payment
                  </Button>
                )}
                <Button size="md" color="secondary" isDisabled={dupBusy} onClick={() => setDupOpen(false)}>
                  Cancel
                </Button>
              </div>
              {dupPending && (
                <a className="underline" href={txLink(dupPending)} target="_blank" rel="noreferrer">
                  View transaction on the explorer
                </a>
              )}
            </div>
          )}

          {dupResult?.kind === "blocked" && (
            <BlockedCard payer={dupResult.payer} paidAt={dupResult.paidAt} txHash={dupResult.txHash} />
          )}

          {dupResult?.kind === "unexpected" && (
            <p role="alert" className="text-sm font-medium text-red-700">
              The contract accepted a second payment. Check the transaction on the explorer and report it.
            </p>
          )}

          {dupResult?.kind === "unknown" && (
            <div role="alert" className="flex flex-col gap-2 text-sm">
              <p className="font-medium">{dupResult.message}</p>
              {dupResult.txHash && (
                <a className="underline" href={txLink(dupResult.txHash)} target="_blank" rel="noreferrer">
                  View on explorer
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {invoice.status === "open" && step === "view" && (
        <div className="flex flex-col gap-3">
          {!isConnected ? (
            <Button size="md" color="primary" onClick={openWalletPicker}>Connect wallet</Button>
          ) : !onArc ? (
            <Button size="md" color="primary" onClick={() => ensureArc(switchChainAsync).catch((e) => setMessage(e.message))}>
              Switch to Arc
            </Button>
          ) : (
            <Button size="md" color="primary" onClick={() => setStep("review")}>
              {`Pay ${formatUsdc(amount)} USDC`}
            </Button>
          )}
        </div>
      )}

      {invoice.status === "open" && step === "review" && (
        <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--color-line)] bg-white p-6">
          <h2 className="text-base font-semibold">Review payment</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-[color:var(--color-muted)]">Amount</dt>
            <dd className="tabular-nums">{formatUsdc(amount)} USDC</dd>
            <dt className="text-[color:var(--color-muted)]">Recipient</dt>
            <dd className="font-mono">{shortAddress(invoice.issuer)}</dd>
            <dt className="text-[color:var(--color-muted)]">Fee</dt>
            <dd>about $0.01</dd>
            <dt className="text-[color:var(--color-muted)]">Your USDC on Arc</dt>
            <dd className="tabular-nums">{balance !== undefined ? `${formatUsdc(balance)} USDC` : "…"}</dd>
          </dl>

          {balanceCheck && !balanceCheck.ok && (
            <div role="note" className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <span>{insufficientCopy(amount, balance ?? 0n)}</span>
              <a href={CCTP_HELP} target="_blank" rel="noreferrer" className="underline">
                How to move USDC to Arc (CCTP)
              </a>
            </div>
          )}

          <Stepper
            steps={[
              { label: "Allow USDC", done: !needsApproval, skipped: !needsApproval },
              { label: "Pay", done: false },
            ]}
            current={needsApproval ? 0 : 1}
          />

          {needsApproval && (
            <p className="text-sm text-[color:var(--color-muted)]">
              {`Allow Consigna to send exactly ${formatUsdc(amount)} USDC for this invoice`}
            </p>
          )}

          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
          {pending && (
            <a className="text-sm underline" href={txLink(pending)} target="_blank" rel="noreferrer">
              View transaction on the explorer
            </a>
          )}

          <div className="flex flex-wrap gap-3">
            {needsApproval ? (
              <Button size="md" color="primary" isLoading={busy === "approve"} isDisabled={Boolean(balanceCheck && !balanceCheck.ok)} onClick={approve}>
                {`Allow ${formatUsdc(amount)} USDC`}
              </Button>
            ) : (
              <Button size="md" color="primary" isLoading={busy === "pay"} isDisabled={Boolean(balanceCheck && !balanceCheck.ok)} onClick={payNow}>
                {`Pay ${formatUsdc(amount)} USDC`}
              </Button>
            )}
            <Button size="md" color="secondary" onClick={() => setStep("view")}>Back</Button>
          </div>
        </div>
      )}

      {result?.kind === "failed" && (
        <div role="alert" className="flex flex-col gap-2 text-sm">
          <p className="font-medium text-red-700">{result.message}</p>
          {result.txHash && (
            <a className="underline" href={txLink(result.txHash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          )}
        </div>
      )}
    </section>
  );
}
