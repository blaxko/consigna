import { useEffect, useState } from "react";
import { Link } from "react-router";
import { usePublicClient, useAccount } from "wagmi";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { Skeleton } from "../components/Skeleton.tsx";
import { Ledger } from "./Ledger.tsx";
import { formatUsdc } from "../lib/format.ts";
import { formatShortTime, COPY } from "../lib/invoice-logic.ts";
import { DEMO_ISSUER } from "../lib/demo.ts";
import { listInvoices, type Invoice } from "../lib/consigna.ts";
import { totals } from "../lib/ledger-logic.ts";

/**
 * /dashboard: the issuer's overview, built only from existing reads (invoicesOf, getInvoice via Multicall3).
 * Connected issuer when a wallet is connected. Otherwise the demo issuer, labelled as such.
 * Duplicates blocked is not shown. Reverted transactions leave no record that these reads can see.
 */
export function Dashboard() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const issuer = address ?? DEMO_ISSUER;
  const isDemo = !address;

  const [rows, setRows] = useState<Invoice[] | undefined>(undefined);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setRows(undefined);
    setError(undefined);
    if (!publicClient) return;
    listInvoices(publicClient, issuer)
      .then((list) => !cancelled && setRows(list))
      .catch(() => !cancelled && setError(COPY.rpcDown));
    return () => {
      cancelled = true;
    };
  }, [publicClient, issuer]);

  const sums = rows ? totals(rows) : undefined;
  const count = rows?.length ?? 0;
  const paidNum = Number(sums?.paid ?? 0n);
  const outNum = Number(sums?.outstanding ?? 0n);
  const sumAll = paidNum + outNum;
  const paidPct = sumAll > 0 ? Math.round((paidNum / sumAll) * 100) : 0;
  const recent = rows ? [...rows].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5) : [];

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            {isDemo ? (
              <>
                Demo issuer <span className="font-mono">{DEMO_ISSUER.slice(0, 6)}…{DEMO_ISSUER.slice(-4)}</span>. Connect a wallet to see your own invoices.
              </>
            ) : (
              <>
                Your invoices on Arc mainnet, <span className="font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
              </>
            )}
          </p>
        </div>
        <Link to="/new" className="btn-primary !py-2 text-sm">
          New invoice
        </Link>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}

      {!rows && !error && <Skeleton rows={2} label="Loading your invoices" />}

      {rows && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Tile label="Total paid" value={`${formatUsdc(sums!.paid)} USDC`} />
            <Tile label="Outstanding" value={`${formatUsdc(sums!.outstanding)} USDC`} />
            <Tile label="Invoices" value={String(count)} />
          </div>

          <div className="glass flex flex-col gap-4 p-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold">Paid vs outstanding</h2>
              <span className="text-sm tabular-nums text-[color:var(--color-muted)]">{sumAll > 0 ? `${paidPct}% paid` : "No amounts yet"}</span>
            </div>
            <div
              role="img"
              aria-label={`Paid ${formatUsdc(sums!.paid)} USDC, outstanding ${formatUsdc(sums!.outstanding)} USDC`}
              className="flex h-3 w-full overflow-hidden rounded-full bg-[rgb(20_18_43/0.08)]"
            >
              <div className="h-full bg-[color:var(--color-accent)] transition-[width] duration-300 ease-out" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[color:var(--color-accent)]" />
                Paid
              </span>
              <span className="flex items-center gap-2 text-[color:var(--color-muted)]">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[rgb(20_18_43/0.18)]" />
                Outstanding
              </span>
            </div>
          </div>

          <div className="glass flex flex-col gap-3 p-5">
            <h2 className="text-base font-semibold">Recent activity</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted)]">No invoices yet. Create the first one.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--color-line)]">
                {recent.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <Link to={`/i/${i.id}`} className="font-mono font-medium underline underline-offset-4">
                      {i.ref}
                    </Link>
                    <span className="text-[color:var(--color-muted)] tabular-nums">{formatShortTime(i.createdAt)}</span>
                    <StatusBadge status={i.status} />
                    <span className="font-mono tabular-nums">{formatUsdc(i.amount)} USDC</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">All invoices</h2>
        <Ledger issuer={issuer} />
      </div>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass flex flex-col gap-2 p-5">
      <p className="text-sm text-[color:var(--color-muted)]">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
