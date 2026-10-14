import type { ReactNode } from "react";
import { CheckCircle, XCircle } from "@untitledui/icons";
import { Logo } from "../Logo.tsx";
import "./landing.css";

/**
 * Floating Consigna UI around the hero headline. Decorative only (aria-hidden).
 * Shown from 1024px up, so it never crowds the text or causes horizontal scroll on phones.
 * The gentle float stops under reduced motion (landing.css). No scroll work.
 */
export function HeroFloats() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <Layer className="left-0 top-4">
        <NoteCard />
      </Layer>
      <Layer className="right-0 top-0">
        <PaidTile />
      </Layer>
      <Layer className="bottom-6 left-10">
        <UsdcTile />
      </Layer>
      <Layer className="bottom-2 right-6">
        <BlockedChip />
      </Layer>
    </div>
  );
}

function Layer({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`absolute ${className}`}>{children}</div>;
}

const CARD = "border border-[color:var(--color-line)] bg-white shadow-[var(--shadow-card)]";

function NoteCard() {
  return (
    <div className={`landing-float w-[156px] rounded-xl p-4 ${CARD}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--color-muted)]">Invoice</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[color:var(--color-ink)]">INV-0042</p>
      <p className="mt-3 font-mono text-xs tabular-nums text-[color:var(--color-muted)]">0.50 USDC</p>
    </div>
  );
}

function PaidTile() {
  return (
    <div className={`landing-float landing-float--alt inline-flex items-center gap-2 rounded-xl px-4 py-3 ${CARD}`}>
      <CheckCircle className="size-5 text-emerald-700" aria-hidden="true" />
      <span className="text-sm font-semibold text-emerald-800">Paid</span>
      <span className="font-mono text-xs tabular-nums text-[color:var(--color-muted)]">0.6s</span>
    </div>
  );
}

function UsdcTile() {
  return (
    <div className={`landing-float inline-flex items-center gap-3 rounded-xl py-3 pl-3 pr-4 ${CARD}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
        <Logo size={16} markOnly />
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">0.50 USDC</span>
    </div>
  );
}

function BlockedChip() {
  return (
    <div className="landing-float landing-float--alt inline-flex items-center gap-2 rounded-full bg-red-700 py-1.5 pl-2.5 pr-3.5 text-xs font-semibold text-white">
      <XCircle className="size-4" aria-hidden="true" />
      Blocked · AlreadyPaid
    </div>
  );
}
