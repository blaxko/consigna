import { Link } from "react-router";
import { useAccount } from "wagmi";
import { Button } from "@/components/base/buttons/button";
import { Download01, Plus } from "@untitledui/icons";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { Skeleton } from "../components/Skeleton.tsx";
import { Ledger } from "./Ledger.tsx";
import { ActivityRing, DashCard } from "../components/dashboard/DashCard.tsx";
import { useLedgerData } from "../components/dashboard/useLedgerData.ts";
import { formatUsdc, shortAddress } from "../lib/format.ts";
import { formatShortTime } from "../lib/invoice-logic.ts";
import { DEMO_ISSUER } from "../lib/demo.ts";
import { toCsv } from "../lib/csv.ts";
import { csvFilename, csvRows, totals } from "../lib/ledger-logic.ts";

/** Local-time greeting. Before 12:00, 12:00 to 17:59, and after. */
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * /dashboard: the issuer's overview, built only from existing reads (invoicesOf, getInvoice via Multicall3)
 * and the InvoicePaid lookups the ledger already uses. The list is read once here and passed to the ledger table.
 * Connected issuer when a wallet is connected. Otherwise the demo issuer, labelled as such.
 * No duplicate count is shown. Reverted transactions leave no record that these reads can see.
 */
export function Dashboard() {
  const { address } = useAccount();
  const issuer = address ?? DEMO_ISSUER;
  const isDemo = !address;
  const { rows, paidTx, loadError, reload } = useLedgerData(issuer, true);

  const sums = rows ? totals(rows) : undefined;
  const paid = sums?.paid ?? 0n;
  const outstanding = sums?.outstanding ?? 0n;
  const paidNum = Number(paid);
  const outNum = Number(outstanding);
  const sumAll = paidNum + outNum;
  const paidPct = sumAll > 0 ? Math.round((paidNum / sumAll) * 100) : 0;
  const count = rows?.length ?? 0;
  const recent = rows ? [...rows].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5) : [];
  const hasRows = count > 0;

  function downloadAll() {
    if (!rows) return;
    const csv = toCsv(csvRows(rows, paidTx));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename(issuer, new Date());
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{greetingFor(new Date().getHours())}</h1>
          <p className="font-mono text-sm text-[color:var(--color-muted)]" title={isDemo ? undefined : issuer}>
            {isDemo ? "Demo issuer" : shortAddress(issuer)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="md" color="secondary" iconLeading={Download01} isDisabled={!hasRows} onClick={downloadAll}>
            Download CSV
          </Button>
          <Link to="/new" className="btn-primary !py-2 text-sm">
            New invoice
          </Link>
        </div>
      </div>

      {loadError && <p role="alert" className="text-sm font-medium text-red-700">{loadError}</p>}

      {!rows && !loadError && <Skeleton rows={2} label="Loading your invoices" />}

      {rows && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <DashCard className="lg:col-span-2">
            <p className="text-sm text-[color:var(--color-muted)]">Total paid</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{formatUsdc(paid)} USDC</p>
          </DashCard>
          <DashCard className="lg:col-span-2">
            <p className="text-sm text-[color:var(--color-muted)]">Outstanding</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{formatUsdc(outstanding)} USDC</p>
          </DashCard>
          <DashCard className="lg:col-span-2">
            <p className="text-sm text-[color:var(--color-muted)]">Invoices</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{count}</p>
          </DashCard>

          <DashCard className="sm:col-span-2 lg:col-span-4 lg:row-span-2">
            <h2 className="text-base font-semibold">Recent invoices</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted)]">No invoices yet. Create the first one.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[color:var(--color-line)]">
                {recent.map((i) => (
                  <li key={i.id} className="flex flex-col gap-2 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <Link to={`/i/${i.id}`} className="truncate font-mono font-medium underline underline-offset-4">
                          {i.ref}
                        </Link>
                        <span className="text-xs tabular-nums text-[color:var(--color-muted)]">{formatShortTime(i.createdAt)}</span>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgb(20_18_43/0.08)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--color-accent)] motion-safe:transition-[width] motion-safe:duration-500"
                          style={{ width: i.status === "paid" ? "100%" : "0%" }}
                        />
                      </div>
                      <span className="shrink-0 font-mono tabular-nums">{formatUsdc(i.amount)} USDC</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>

          <DashCard className="lg:col-span-2">
            <h2 className="text-base font-semibold">Paid vs outstanding</h2>
            <ActivityRing paid={paid} outstanding={outstanding} paidPct={paidPct} hasAmounts={sumAll > 0} />
          </DashCard>

          <DashCard className="lg:col-span-2">
            <h2 className="text-base font-semibold">Create invoice</h2>
            <p className="text-sm text-[color:var(--color-muted)]">
              Set the reference, client and line items.
            </p>
            <div className="mt-auto pt-1">
              <Link to="/new" className="btn-secondary !py-2 text-sm">
                <Plus className="size-4" aria-hidden="true" /> New invoice
              </Link>
            </div>
          </DashCard>
        </div>
      )}

      {rows && (
        <section aria-labelledby="all-invoices" className="flex flex-col gap-3">
          <h2 id="all-invoices" className="text-base font-semibold">All invoices</h2>
          <Ledger issuer={issuer} rows={rows} paidTx={paidTx} embedded onChanged={reload} />
        </section>
      )}
    </section>
  );
}
