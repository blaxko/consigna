import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle, XCircle } from "@untitledui/icons";
import "./landing.css";

/** Scroll position for the parallax, throttled to animation frames. Stays 0 under reduced motion. */
function useScrollY(): number {
  const [y, setY] = useState(0);

  useEffect(() => {
    // Only where the floats are shown (lg and up) and motion is allowed. No scroll work on phones.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(min-width: 1024px)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setY(Math.min(window.scrollY, 600)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return y;
}

/**
 * Floating Consigna UI around the hero headline. Decorative only (aria-hidden).
 * Shown from 1024px up, so it never crowds the text or causes horizontal scroll on phones.
 * The outer layer carries the parallax, the inner one the float, so the two transforms never fight.
 */
export function HeroFloats() {
  const y = useScrollY();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <Layer className="left-0 top-4" y={y} speed={-0.06}>
        <NoteCard />
      </Layer>
      <Layer className="right-0 top-0" y={y} speed={0.05}>
        <PaidTile />
      </Layer>
      <Layer className="bottom-6 left-10" y={y} speed={0.08}>
        <UsdcTile />
      </Layer>
      <Layer className="bottom-2 right-6" y={y} speed={-0.04}>
        <BlockedChip />
      </Layer>
    </div>
  );
}

function Layer({ className, y, speed, children }: { className: string; y: number; speed: number; children: ReactNode }) {
  return (
    <div className={`absolute ${className}`} style={{ transform: `translate3d(0, ${(y * speed).toFixed(1)}px, 0)` }}>
      {children}
    </div>
  );
}

const SHADOW = "shadow-[0_28px_48px_-24px_rgb(17_20_24/0.3),inset_0_1px_0_rgb(255_255_255/0.9)]";

function NoteCard() {
  return (
    <div className={`landing-float w-[156px] rounded-2xl border border-[color:var(--color-line)] bg-linear-to-b from-white to-[#f3f4f6] p-4 ${SHADOW}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--color-muted)]">Invoice</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[color:var(--color-ink)]">INV-0042</p>
      <p className="mt-3 font-mono text-xs tabular-nums text-[color:var(--color-muted)]">0.50 USDC</p>
    </div>
  );
}

function PaidTile() {
  return (
    <div className={`landing-float landing-float--alt inline-flex items-center gap-2 rounded-2xl border border-[color:var(--color-line)] bg-white px-4 py-3 ${SHADOW}`}>
      <CheckCircle className="size-5 text-emerald-700" />
      <span className="text-sm font-semibold text-emerald-800">Paid</span>
      <span className="font-mono text-xs tabular-nums text-[color:var(--color-muted)]">0.6s</span>
    </div>
  );
}

function UsdcTile() {
  return (
    <div className={`landing-float inline-flex items-center gap-3 rounded-2xl border border-[color:var(--color-line)] bg-white py-3 pl-3 pr-4 ${SHADOW}`}>
      <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] font-mono text-sm font-semibold text-[color:var(--color-accent)]">
        U
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">0.50 USDC</span>
    </div>
  );
}

function BlockedChip() {
  return (
    <div className="landing-float landing-float--alt inline-flex items-center gap-2 rounded-full bg-red-700 py-1.5 pl-2.5 pr-3.5 text-xs font-semibold text-white shadow-[0_16px_32px_-16px_rgb(185_28_28/0.6)]">
      <XCircle className="size-4" />
      Blocked · AlreadyPaid
    </div>
  );
}
