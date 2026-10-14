import { useState } from "react";
import { Link } from "react-router";
import { encodeFunctionData } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { HintText } from "@/components/base/input/hint-text";
import { CheckCircle, AlertCircle, Copy01, Clock, XClose } from "@untitledui/icons";
import { InvoicePaper } from "../components/InvoicePaper.tsx";
import { CONSIGNA_ADDRESS, EXPLORER, USDC_ADDRESS } from "../lib/chain.ts";
import { parseUsdc, formatUsdc } from "../lib/format.ts";
import { encodeDetails, hashDetails, type Details } from "../lib/details.ts";
import {
  COPY,
  isUserRejection,
  lineTotal,
  paymentLink,
  validateRef,
} from "../lib/invoice-logic.ts";
import { useWalletPicker } from "../components/WalletPicker.tsx";
import { invoiceIdFor } from "../lib/demo.ts";
import { create, decodeRevert, idFor, isRefAvailable, waitForConfirmation, NotConfirmedError } from "../lib/consigna.ts";
import { consignaAbi } from "../lib/abi.ts";

type Line = { desc: string; qty: string; unit: string };
type Phase = "form" | "review" | "waiting" | "submitted" | "confirmed" | "failed";

const EMPTY_LINE: Line = { desc: "", qty: "1", unit: "" };

/** Flow A (PRD 5.2): /new. Form, then review, then Create on Arc, then the payment link. */
export function NewInvoice() {
  const { address, isConnected } = useAccount();
  const openWalletPicker = useWalletPicker().open;
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [ref, setRef] = useState("");
  const [client, setClient] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [link, setLink] = useState<string | undefined>();
  const [invoiceId, setInvoiceId] = useState<`0x${string}` | undefined>();
  const [copied, setCopied] = useState(false);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  function lineError(l: Line): string | undefined {
    if (!l.desc.trim()) return "Describe the item.";
    if (!/^\d+$/.test(l.qty) || Number(l.qty) < 1) return "Quantity must be a whole number, 1 or more.";
    try {
      parseUsdc(l.unit);
    } catch (e) {
      return /6 decimal/.test((e as Error).message) ? COPY.decimals : "Enter a unit price such as 5.00.";
    }
    return undefined;
  }

  /** Runs every rule and returns the error map. An empty map means the form is valid. */
  function validateForm(): Record<string, string> {
    const out: Record<string, string> = {};
    const refErr = validateRef(ref);
    if (refErr) out.ref = refErr;
    if (!client.trim()) out.client = "Enter the client name.";
    lines.forEach((l, i) => {
      const e = lineError(l);
      if (e) out[`line${i}`] = e;
    });
    if (!Object.keys(out).length) {
      try {
        const total = lineTotal(lines.map((l) => ({ qty: Number(l.qty), unit: l.unit })));
        const details = buildDetails();
        encodeDetails(details); // throws over 1500 bytes
        if (total <= 0n) out.total = "Total must be greater than 0.";
      } catch (e) {
        out.form = (e as Error).message;
      }
    }
    return out;
  }

  function buildDetails(): Details {
    return {
      v: 1,
      client: client.trim(),
      ...(due ? { due } : {}),
      items: lines.map((l) => ({ desc: l.desc.trim(), qty: Number(l.qty), unit: l.unit.trim() })),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
  }

  /** E11: checked before the wallet opens. */
  async function checkRefFree(): Promise<boolean> {
    if (!publicClient || !address) return true;
    try {
      const free = await isRefAvailable(publicClient, address, ref);
      if (!free) setErrors((e) => ({ ...e, ref: COPY.refUsed(ref) }));
      return free;
    } catch {
      setErrors((e) => ({ ...e, form: COPY.rpcDown })); // E14: cannot check, so never claim the ref is free
      return false;
    }
  }

  async function onReview() {
    const e = validateForm();
    setErrors(e);
    if (Object.keys(e).length) return;
    // With no wallet we cannot check the ref yet; the check runs again before the wallet opens.
    if (await checkRefFree()) setPhase("review");
  }

  async function onCreate() {
    if (!publicClient || !walletClient || !address) return;
    if (!(await checkRefFree())) {
      setPhase("form");
      return;
    }
    const details = buildDetails();
    const amount = lineTotal(lines.map((l) => ({ qty: Number(l.qty), unit: l.unit })));
    setFailure(undefined);
    setPhase("waiting");
    let txHash: `0x${string}`;
    try {
      txHash = await create(publicClient, walletClient, {
        ref,
        token: USDC_ADDRESS,
        amount,
        detailsHash: hashDetails(details),
      });
    } catch (e) {
      // Rejected in the wallet: back to review with no error banner (PRD E3).
      if (isUserRejection(e)) {
        setPhase("review");
        return;
      }
      setFailure((e as Error).message?.split("\n")[0] ?? "The wallet could not send the transaction.");
      setPhase("failed");
      return;
    }
    setHash(txHash);
    setPhase("submitted");
    try {
      const receipt = await waitForConfirmation(publicClient, txHash);
      if (receipt.status !== "success") {
        // Re-run the same createInvoice calldata at the failed block to name the revert (PRD 5.4 rule, reused here).
        const decoded = await decodeRevert(publicClient, {
          from: address,
          to: CONSIGNA_ADDRESS,
          data: encodeFunctionData({
            abi: consignaAbi,
            functionName: "createInvoice",
            args: [ref, USDC_ADDRESS, amount, hashDetails(details)],
          }),
          blockNumber: receipt.blockNumber,
        });
        setFailure(`Transaction failed on-chain${decoded.errorName !== "unknown" ? `: ${decoded.errorName}` : ""}.`);
        setPhase("failed");
        return;
      }
      const id = await idFor(publicClient, address, ref);
      setInvoiceId(id);
      setLink(paymentLink(window.location.origin, id, details));
      setPhase("confirmed");
    } catch (e) {
      if (e instanceof NotConfirmedError) {
        setFailure(COPY.notConfirmed);
        setInvoiceId(invoiceIdFor(address, ref)); // E13: a link to check the invoice; never resend
      } else {
        setFailure((e as Error).message);
      }
      setPhase("failed");
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ---- Success (Step 5) ----
  if (phase === "confirmed" && link && invoiceId) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-[color:var(--color-ink)]">
          <CheckCircle className="size-5 text-[color:var(--color-accent)]" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Invoice created on Arc</h1>
        </div>
        <div className="glass p-5">
          <p className="text-sm text-[color:var(--color-muted)]">Payment link</p>
          <p className="mt-1 break-all font-mono text-sm">{link}</p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="md" color="primary" iconLeading={Copy01} onClick={copyLink}>
              Copy link
            </Button>
            {copied && <span className="text-sm text-[color:var(--color-muted)]">Copied</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`/i/${invoiceId}`} className="text-sm font-medium text-[color:var(--color-accent)] underline">
            View invoice
          </Link>
          <Link to={`/ledger/${address}`} className="text-sm font-medium text-[color:var(--color-accent)] underline">
            Go to ledger
          </Link>
          <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="text-sm underline">
            View transaction
          </a>
        </div>
      </section>
    );
  }

  // ---- Submitting states (Step 4) ----
  if (phase === "waiting" || phase === "submitted" || phase === "failed") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Create invoice</h1>
        {phase === "waiting" && (
          <p className="flex items-center gap-2 text-sm"><Clock className="size-5" aria-hidden="true" /> Waiting for your wallet…</p>
        )}
        {phase === "submitted" && (
          <p className="flex items-center gap-2 text-sm"><Clock className="size-5" aria-hidden="true" /> Submitted. Waiting for confirmation…</p>
        )}
        {phase === "failed" && (
          <p role="alert" className="flex items-center gap-2 text-sm text-[color:var(--color-ink)]">
            <AlertCircle className="size-5 text-red-600" aria-hidden="true" /> {failure}
          </p>
        )}
        {hash && (
          <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="text-sm underline">
            View transaction on the explorer
          </a>
        )}
        {phase === "failed" && invoiceId && (
          <Link to={`/i/${invoiceId}`} className="text-sm font-medium underline">
            Check the invoice
          </Link>
        )}
        {phase === "failed" && (
          <Button size="md" color="secondary" onClick={() => setPhase("review")}>
            Back to review
          </Button>
        )}
      </section>
    );
  }

  // ---- Review (Step 3) ----
  if (phase === "review") {
    const total = lineTotal(lines.map((l) => ({ qty: Number(l.qty), unit: l.unit })));
    return (
      <section className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Review invoice</h1>
        <InvoicePaper
          ref_={ref}
          issuer={address ?? "0x0000000000000000000000000000000000000000"}
          amountUnits={total}
          client={client}
          lines={lines.map((l) => ({ desc: l.desc, qty: Number(l.qty), unit: l.unit }))}
        />
        <p className="text-sm text-[color:var(--color-muted)]">
          Payee is the connected wallet. Fee about $0.01 on Arc. {COPY.reviewWarning}
        </p>
        <div className="flex flex-wrap gap-3">
          {isConnected ? (
            <Button size="md" color="primary" onClick={onCreate}>
              Create on Arc
            </Button>
          ) : (
            <Button size="md" color="primary" onClick={openWalletPicker}>
              Connect wallet
            </Button>
          )}
          <Button size="md" color="secondary" onClick={() => setPhase("form")}>
            Edit
          </Button>
        </div>
      </section>
    );
  }

  // ---- Form (Step 1) ----
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Create invoice</h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">Amounts are in USDC on Arc mainnet.</p>
      </div>

      <div className="flex flex-col gap-4 glass p-6">
        <Input
          label="Reference"
          placeholder="INV-0042"
          value={ref}
          onChange={setRef}
          onBlur={() => setErrors((e) => ({ ...e, ref: validateRef(ref) ?? "" }))}
          isInvalid={Boolean(errors.ref)}
          hint={errors.ref ?? COPY.refWarning}
        />
        <Input
          label="Client"
          placeholder="Acme Inc."
          value={client}
          onChange={setClient}
          isInvalid={Boolean(errors.client)}
          hint={errors.client}
        />
        <Input label="Due date (optional)" type="date" value={due} onChange={setDue} />

        <fieldset className="flex flex-col gap-3">
          <Label>Line items</Label>
          {lines.map((l, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[1.25rem] border border-[color:var(--color-line)] bg-white p-4 shadow-[0_1px_2px_rgb(17_20_24/0.04),0_12px_24px_-16px_rgb(17_20_24/0.12)]">
              <Input
                aria-label={`Item ${i + 1} description`}
                placeholder="Description"
                value={l.desc}
                onChange={(v) => setLine(i, { desc: v })}
                isInvalid={Boolean(errors[`line${i}`])}
              />
              <div className="flex items-end gap-3">
                <div className="w-24 shrink-0">
                  <Input aria-label={`Item ${i + 1} quantity`} placeholder="Qty" value={l.qty} onChange={(v) => setLine(i, { qty: v })} />
                </div>
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label={`Item ${i + 1} unit price in USDC`}
                    placeholder="Unit price (USDC)"
                    value={l.unit}
                    onChange={(v) => setLine(i, { unit: v })}
                    isInvalid={Boolean(errors[`line${i}`])}
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove item ${i + 1}`}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-[color:var(--color-muted)] transition duration-200 ease-out hover:bg-[rgb(20_18_43/0.06)] hover:text-[color:var(--color-ink)]"
                  >
                    <XClose className="size-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              {errors[`line${i}`] && <HintText isInvalid>{errors[`line${i}`]}</HintText>}
            </div>
          ))}
          <div>
            <Button size="sm" color="link-color" onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}>
              Add line item
            </Button>
          </div>
        </fieldset>

        <Input label="Note (optional)" value={note} onChange={setNote} />

        {errors.total && <HintText isInvalid>{errors.total}</HintText>}
        {errors.form && <HintText isInvalid>{errors.form}</HintText>}
      </div>

      <div className="flex justify-between">
        {address ? (
          <Link to={`/ledger/${address}`} className="text-sm underline text-[color:var(--color-muted)]">Back to ledger</Link>
        ) : (
          <span />
        )}
        <Button size="md" color="primary" onClick={onReview}>
          Review
        </Button>
      </div>
    </section>
  );
}
