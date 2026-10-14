import { CheckCircle } from "@untitledui/icons";
import { DEMO_ISSUER } from "../../lib/demo.ts";
import { shortAddress } from "../../lib/format.ts";
import "./landing.css";

const TILES = [
  { label: "Invoices", value: "3" },
  { label: "Paid", value: "1" },
  { label: "Open", value: "1" },
  { label: "Cancelled", value: "1" },
];

const ROWS = [
  { ref: "INV-0042", amount: "0.50 USDC", status: "Paid", paid: true },
  { ref: "INV-0041", amount: "0.10 USDC", status: "Open", paid: false },
  { ref: "INV-0040", amount: "0.25 USDC", status: "Cancelled", paid: false },
];

/**
 * Large preview of the /dashboard screen, as a static mock with labelled sample data.
 * It sits on a soft blue panel, fades out at the bottom, and two small tiles sit over its lower edge.
 */
export function DashboardPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-[var(--radius-card)] border border-[color:var(--color-line)]"
        style={{ background: "linear-gradient(180deg, var(--color-panel) 0%, rgb(247 247 248) 85%)" }}
      />

      <div className="relative p-4 sm:p-8">
        <div className="landing-fade-bottom h-[360px] overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-line)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-base font-semibold">Dashboard</p>
              <p className="font-mono text-xs text-[color:var(--color-muted)]">{shortAddress(DEMO_ISSUER)}</p>
            </div>
            <span className="rounded-lg bg-[rgb(20_18_43/0.06)] px-2 py-1 text-xs text-[color:var(--color-muted)]">Sample data</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TILES.map((t) => (
              <div key={t.label} className="rounded-xl border border-[color:var(--color-line)] bg-[#f7f7f8] p-4">
                <p className="text-xs text-[color:var(--color-muted)]">{t.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{t.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-[color:var(--color-line)] text-sm">
            {ROWS.map((r) => (
              <div key={r.ref} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-[color:var(--color-line)] px-4 py-3 last:border-b-0">
                <span className="font-mono font-medium">{r.ref}</span>
                <span className="font-mono tabular-nums">{r.amount}</span>
                <span className={r.paid ? "font-medium text-emerald-800" : "text-[color:var(--color-muted)]"}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="landing-float absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-line)] bg-white px-4 py-3 text-sm shadow-[var(--shadow-card)] sm:bottom-10 sm:left-14"
      >
        <CheckCircle className="size-4 text-emerald-700" />
        <span className="font-medium">Paid</span>
        <span className="font-mono text-xs tabular-nums text-[color:var(--color-muted)]">0.6s</span>
      </div>
      <div
        aria-hidden="true"
        className="landing-float landing-float--alt absolute bottom-2 right-6 rounded-xl border border-[color:var(--color-line)] bg-white px-4 py-3 shadow-[var(--shadow-card)] sm:bottom-6 sm:right-14"
      >
        <p className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted)]">Ledger</p>
        <p className="font-mono text-sm font-semibold">3 rows, 1 paid</p>
      </div>
    </div>
  );
}
