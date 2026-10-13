import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { Address, Hex } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Button } from "@/components/base/buttons/button";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { Skeleton } from "../components/Skeleton.tsx";
import { EXPLORER } from "../lib/chain.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { formatShortTime, isUserRejection, COPY } from "../lib/invoice-logic.ts";
import { ensureArc } from "../lib/arc-wallet.ts";
import { toCsv } from "../lib/csv.ts";
import {
  cancelConfirmCopy,
  csvFilename,
  csvRows,
  filterInvoices,
  totals,
  type Filter,
} from "../lib/ledger-logic.ts";
import {
  cancel,
  listInvoices,
  NotConfirmedError,
  paidEvent,
  waitForConfirmation,
  type Invoice,
} from "../lib/consigna.ts";
import { ARC_CHAIN_ID } from "../lib/chain.ts";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

/** Flow D (PRD 5.5): /ledger/:issuer. Read-only without a wallet. Cancel is issuer-only, on Open rows. */
export function Ledger() {
  const { issuer = "" } = useParams();
  const validIssuer = /^0x[0-9a-fA-F]{40}$/.test(issuer);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [rows, setRows] = useState<Invoice[] | undefined>(undefined); // undefined = loading
  const [paidTx, setPaidTx] = useState<Record<string, Hex>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmId, setConfirmId] = useState<Hex | undefined>();
  const [busyId, setBusyId] = useState<Hex | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [csvBusy, setCsvBusy] = useState(false);

  const isIssuer = Boolean(address && validIssuer && address.toLowerCase() === issuer.toLowerCase());

  async function load() {
    if (!publicClient || !validIssuer) {
      setRows([]);
      return;
    }
    const list = await listInvoices(publicClient, issuer as Address);
    setRows(list);
    // One single-block InvoicePaid lookup per paid invoice, at its paidBlock only (CLAUDE.md §9).
    const entries = await Promise.all(
      list
        .filter((i) => i.status === "paid")
        .map(async (i) => {
          try {
            const ev = await paidEvent(publicClient, i.id, i.paidBlock);
            return [i.id, ev?.txHash] as const;
          } catch (e) {
            console.error("paidEvent failed", i.ref, e);
            return [i.id, undefined] as const;
          }
        }),
    );
    const map: Record<string, Hex> = {};
    for (const [id, tx] of entries) if (tx) map[id] = tx;
    setPaidTx(map);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer, publicClient]);

  async function doCancel(inv: Invoice) {
    if (!publicClient || !walletClient) return;
    setMessage(undefined);
    setBusyId(inv.id);
    try {
      if (chainId !== ARC_CHAIN_ID) await ensureArc(switchChainAsync);
      const hash = await cancel(publicClient, walletClient, inv.id);
      await waitForConfirmation(publicClient, hash);
      setConfirmId(undefined);
    } catch (e) {
      if (e instanceof NotConfirmedError) setMessage(COPY.notConfirmed);
      else if (!isUserRejection(e)) setMessage((e as Error).message?.split("\n")[0]);
    } finally {
      setBusyId(undefined);
      await load(); // re-read from chain (NFR-R2)
    }
  }

  async function downloadCsv() {
    if (!publicClient || !rows) return;
    const scope = filterInvoices(rows, filter);
    setCsvBusy(true);
    try {
      const csv = toCsv(csvRows(scope, paidTx));
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = csvFilename(issuer, new Date());
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage((e as Error).message?.split("\n")[0]);
    } finally {
      setCsvBusy(false);
    }
  }

  if (!validIssuer) {
    return <p className="text-sm">That is not a valid issuer address.</p>;
  }
  if (rows === undefined) {
    return <Skeleton rows={4} label="Loading invoices from Arc" />;
  }

  const scope = filterInvoices(rows, filter);
  const sums = totals(rows);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Ledger</h1>
          <p className="mt-1 font-mono text-sm text-[color:var(--color-muted)]" title={issuer}>
            Issuer {shortAddress(issuer)}
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <Button size="md" color="secondary" isLoading={csvBusy} onClick={downloadCsv}>
              Download CSV
            </Button>
            <p className="text-xs text-[color:var(--color-muted)]">
              Exports the {filterInvoices(rows, filter).length} invoices shown. Paid rows include their payment transaction.
            </p>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-line)] bg-white p-6">
          <p className="text-sm">No invoices yet.</p>
          <div>
            <Link to="/new">
              <Button size="md" color="primary">Create your first invoice</Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-[color:var(--color-line)] bg-white p-5 text-sm sm:max-w-md">
            <div>
              <dt className="text-[color:var(--color-muted)]">Paid</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatUsdc(sums.paid)} USDC</dd>
            </div>
            <div>
              <dt className="text-[color:var(--color-muted)]">Outstanding</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatUsdc(sums.outstanding)} USDC</dd>
            </div>
          </dl>

          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-sm ${filter === f.value ? "border-[color:var(--color-accent)] bg-white font-semibold" : "border-[color:var(--color-line)] text-[color:var(--color-muted)]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {message && <p role="alert" className="text-sm font-medium text-red-700">{message}</p>}

          <div className="overflow-x-auto rounded-xl border border-[color:var(--color-line)] bg-white">
            <table className="w-full min-w-[56rem] text-sm">
              <caption className="sr-only">Invoices issued by {shortAddress(issuer)}</caption>
              <thead className="bg-gray-50 text-left text-[color:var(--color-muted)]">
                <tr>
                  <th scope="col" className="sticky left-0 bg-gray-50 px-3 py-2 font-medium">Ref</th>
                  <th scope="col" className="px-3 py-2 font-medium">Created</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                  <th scope="col" className="px-3 py-2 font-medium">Token</th>
                  <th scope="col" className="px-3 py-2 font-medium">Payer</th>
                  <th scope="col" className="px-3 py-2 font-medium">Paid at</th>
                  <th scope="col" className="px-3 py-2 font-medium">Tx</th>
                  <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {scope.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-[color:var(--color-muted)]">No invoices with this status.</td>
                  </tr>
                )}
                {scope.map((i) => (
                  <Row
                    key={i.id}
                    inv={i}
                    txHash={paidTx[i.id]}
                    canCancel={isIssuer && isConnected && i.status === "open"}
                    confirming={confirmId === i.id}
                    busy={busyId === i.id}
                    onAsk={() => setConfirmId(i.id)}
                    onKeep={() => setConfirmId(undefined)}
                    onConfirm={() => doCancel(i)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Row(props: {
  inv: Invoice;
  txHash?: Hex;
  canCancel: boolean;
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const i = props.inv;
  const isPaid = i.status === "paid";
  return (
    <>
      <tr className="border-t border-[color:var(--color-line)] align-top">
        <td className="sticky left-0 bg-white px-3 py-2 font-mono">
          <Link to={`/i/${i.id}`} className="underline">{i.ref}</Link>
        </td>
        <td className="px-3 py-2 tabular-nums">{formatShortTime(i.createdAt)}</td>
        <td className="px-3 py-2"><StatusBadge status={i.status} /></td>
        <td className="px-3 py-2 text-right tabular-nums">{formatUsdc(i.amount)}</td>
        <td className="px-3 py-2">USDC</td>
        <td className="px-3 py-2 font-mono">{isPaid ? shortAddress(i.payer) : "—"}</td>
        <td className="px-3 py-2 tabular-nums">{isPaid ? formatShortTime(i.paidAt) : "—"}</td>
        <td className="px-3 py-2">
          {isPaid && props.txHash ? (
            <a className="underline" href={`${EXPLORER}/tx/${props.txHash}`} target="_blank" rel="noreferrer">View</a>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {props.canCancel && !props.confirming && (
            <Button size="sm" color="link-destructive" onClick={props.onAsk}>Cancel</Button>
          )}
        </td>
      </tr>
      {props.confirming && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-3 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{cancelConfirmCopy(i.ref)}</span>
              <Button size="sm" color="primary-destructive" isLoading={props.busy} onClick={props.onConfirm}>
                Cancel invoice
              </Button>
              <Button size="sm" color="secondary" isDisabled={props.busy} onClick={props.onKeep}>
                Keep invoice
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
