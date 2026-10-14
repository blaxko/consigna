import type { ReactNode } from "react";
import { formatUsdc } from "../../lib/format.ts";

/** Dashboard bento card: solid white, hairline border, soft shadow. No glass. */
export function DashCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-3 rounded-[1.25rem] border border-[color:var(--color-line)] bg-white p-5 shadow-[0_24px_48px_-28px_rgb(17_20_24/0.16)] ${className}`}
    >
      {children}
    </div>
  );
}

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Activity ring: paid share in the accent blue, the rest in a light neutral. Plain SVG, no chart library.
 * The percentage and the legend repeat every value in text.
 */
export function ActivityRing({
  paid,
  outstanding,
  paidPct,
  hasAmounts,
}: {
  paid: bigint;
  outstanding: bigint;
  paidPct: number;
  hasAmounts: boolean;
}) {
  const paidLen = (paidPct / 100) * RING_C;
  const label = `Paid ${formatUsdc(paid)} USDC, outstanding ${formatUsdc(outstanding)} USDC, ${paidPct} percent paid`;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center lg:flex-col">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" role="img" aria-label={label}>
          <circle cx="64" cy="64" r={RING_R} fill="none" strokeWidth="12" style={{ stroke: "rgb(20 18 43 / 0.08)" }} />
          <circle
            cx="64"
            cy="64"
            r={RING_R}
            fill="none"
            strokeWidth="12"
            style={{ stroke: "var(--color-accent)" }}
            strokeDasharray={`${paidLen} ${RING_C}`}
            className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-500"
          />
        </svg>
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-semibold tabular-nums">
          {paidPct}%
        </span>
      </div>
      <dl className="flex w-full flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: "var(--color-accent)" }} />
            Paid
          </dt>
          <dd className="font-mono tabular-nums">{formatUsdc(paid)} USDC</dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-[color:var(--color-muted)]">
          <dt className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-[rgb(20_18_43/0.18)]" />
            Outstanding
          </dt>
          <dd className="font-mono tabular-nums">{formatUsdc(outstanding)} USDC</dd>
        </div>
        {!hasAmounts && <p className="text-[color:var(--color-muted)]">No amounts yet.</p>}
      </dl>
    </div>
  );
}
