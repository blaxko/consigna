import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "@untitledui/icons";
import { BLOCKED_DUPLICATE_TX } from "../lib/demo.ts";
import { EXPLORER } from "../lib/chain.ts";

// The story, in order. Each phase has a duration in ms. Phases 3 and 4 are the retry and the blocked state.
const PHASES = [
  { ms: 2400 }, // 0 open
  { ms: 1000 }, // 1 paying
  { ms: 2000 }, // 2 paid
  { ms: 1100 }, // 3 trying again
  { ms: 3200 }, // 4 blocked
  { ms: 1600 }, // 5 hold, then loop
] as const;

// Indicator step for each phase: 1 = open and paying, 2 = paid, 3 = retry and blocked.
const STEP_OF = [1, 1, 2, 3, 3, 3] as const;
const STEP_START = [0, 2, 3] as const; // phase index where each indicator step starts

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Hero demo: one invoice card that tells the story in place, on a gentle loop.
 * Pauses on hover and focus. Reduced motion shows the final state, statically.
 * Labelled "Demo". The sample data is static and nothing is sent anywhere.
 */
export function HeroDemo() {
  const reduced = reducedMotion();
  const [phase, setPhase] = useState<number>(reduced ? 4 : 0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].ms);
    return () => window.clearTimeout(t);
  }, [phase, paused, reduced]);

  const step = STEP_OF[phase];
  const blocked = phase >= 4 && phase <= 5;
  const paid = phase >= 2;

  return (
    <div
      className="relative flex flex-col gap-4 rounded-[var(--radius-card)] border border-[color:var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-[color:var(--color-line)] bg-white px-3 py-1 text-xs font-medium text-[color:var(--color-muted)] shadow-[0_1px_2px_rgb(17_20_24/0.04)]">
          Demo
        </span>
        <span className="text-xs text-[color:var(--color-muted)]">Sample data</span>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--color-line)] bg-[#f7f7f8] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-base font-semibold">INV-0042</p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${
              paid ? "bg-emerald-50 text-emerald-800" : "bg-[rgb(20_18_43/0.06)] text-[color:var(--color-muted)]"
            }`}
          >
            {paid ? "Paid" : "Open"}
            {paid && <CheckCircle className="size-3.5" aria-hidden="true" />}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-[color:var(--color-muted)]">Total</span>
          <span className="font-mono text-xl font-semibold tabular-nums">0.50 USDC</span>
        </div>

        <div className="min-h-[84px] border-t border-[color:var(--color-line)] pt-4" aria-live="polite">
          {phase === 0 && <p className="fade-in text-sm text-[color:var(--color-muted)]">Awaiting payment.</p>}
          {phase === 1 && <p className="fade-in text-sm text-[color:var(--color-ink)]">Paying…</p>}
          {phase === 2 && (
            <p className="fade-in text-sm font-medium text-emerald-800">Paid · settled in 0.6s</p>
          )}
          {phase === 3 && <p className="fade-in text-sm text-[color:var(--color-muted)]">Trying to pay again…</p>}
          {blocked && (
            <div className="fade-in flex flex-col gap-1 rounded-lg border border-red-700 bg-red-50 p-3 text-red-950">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <XCircle className="size-4 shrink-0 text-red-700" aria-hidden="true" />
                Blocked by contract · AlreadyPaid
              </p>
              <p className="text-xs">No USDC moved.</p>
              <a
                href={`${EXPLORER}/tx/${BLOCKED_DUPLICATE_TX}`}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-xs font-semibold text-red-800 underline underline-offset-4"
              >
                View failed transaction
              </a>
            </div>
          )}
        </div>
      </div>

      <ol className="flex items-center justify-center gap-2 text-xs" aria-label="Demo steps">
        {[1, 2, 3].map((n) => (
          <li key={n}>
            <button
              type="button"
              aria-label={`Step ${n}`}
              aria-current={step === n ? "step" : undefined}
              onClick={() => setPhase(STEP_START[n - 1])}
              className={`flex size-8 items-center justify-center rounded-full font-mono font-semibold transition-colors duration-200 ${
                step === n
                  ? "bg-[color:var(--color-accent)] text-white"
                  : "bg-[rgb(20_18_43/0.06)] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
              }`}
            >
              {n}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
