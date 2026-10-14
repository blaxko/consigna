import type { ReactNode } from "react";
import { ArrowUpRight, Lock01, XCircle } from "@untitledui/icons";
import { BentoCard } from "../bento.tsx";
import { CONSIGNA_ADDRESS, EXPLORER } from "../../lib/chain.ts";
import { Reveal } from "../motion.tsx";


const FALLBACK_ADDRESS = "0x7416bfbed0d79e8604c09e0225e6baab56f0c728";

/** Five bento cards, each with a small slice of the real Consigna UI. All figures are true or labelled as sample. */
export function BentoShowcase() {
  const contract = CONSIGNA_ADDRESS || FALLBACK_ADDRESS;
  const short = `${contract.slice(0, 6)}…${contract.slice(-4)}`;

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Reveal className="md:col-span-2">
        <Card title="One payment, enforced" line="A second payment for the same invoice reverts in the contract.">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono font-semibold">INV-0042</span>
              <span className="font-mono tabular-nums text-[color:var(--color-muted)]">0.50 USDC</span>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white">
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
              Blocked by contract · AlreadyPaid
            </span>
          </div>
        </Card>
      </Reveal>

      <Reveal>
        <Card title="Settles in under a second" line="Arc finalises in under a second, so paid means paid.">
          <div className="relative flex items-center justify-between px-1">
            <span aria-hidden="true" className="absolute inset-x-1 top-1/2 h-px bg-[color:var(--color-line)]" />
            {["Created", "Paid", "Final"].map((label, i) => (
              <div key={label} className="relative flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-3 rounded-full border bg-white ${
                    i === 1 ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]" : "border-[color:var(--color-line)]"
                  }`}
                />
                <span className="text-xs text-[color:var(--color-muted)]">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-sm font-semibold">paid in 0.6s</p>
        </Card>
      </Reveal>

      <Reveal className="md:row-span-2">
        <Card title="Books close themselves" line="The ledger and CSV rebuild from chain reads alone.">
          <div className="overflow-hidden rounded-xl border border-[color:var(--color-line)] bg-white text-sm">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-[color:var(--color-line)] px-3 py-2 text-xs text-[color:var(--color-muted)]">
              <span>Ref</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {SAMPLE_ROWS.map((r) => (
              <div key={r.ref} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-[color:var(--color-line)] px-3 py-2.5 last:border-b-0">
                <span className="font-mono">{r.ref}</span>
                <span className="font-mono tabular-nums">{r.amount}</span>
                <span className={r.paid ? "text-xs font-medium text-emerald-800" : "text-xs text-[color:var(--color-muted)]"}>{r.status}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[color:var(--color-muted)]">Sample rows</p>
        </Card>
      </Reveal>

      <Reveal className="md:col-span-2">
        <Card title="No admin keys" line="No owner, no pause, no proxy. The contract never holds funds.">
          <div className="flex items-start gap-4 rounded-xl bg-[#14122b] p-4 text-white">
            <Lock01 className="mt-0.5 size-5 shrink-0 text-white/80" aria-hidden="true" />
            <div className="flex flex-col gap-1 font-mono text-xs leading-relaxed">
              <p>pay(bytes32 id)</p>
              <p className="text-white/70">owner: none</p>
              <p className="text-white/70">pause: none</p>
              <p className="text-white/70">upgrade: none</p>
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal className="md:col-span-2">
        <Card title="Live on Arc mainnet" line="Check the contract and every payment on the explorer.">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[rgb(20_18_43/0.06)] px-2.5 py-1 font-mono text-xs font-semibold text-[color:var(--color-muted)]">
              Chain 5042
            </span>
            <a
              href={`${EXPLORER}/address/${contract}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-line)] bg-white px-3 py-1.5 font-mono text-sm font-medium text-[color:var(--color-accent)] underline-offset-4 hover:underline"
            >
              {short}
              <span className="sr-only"> (opens in a new tab)</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}

const SAMPLE_ROWS = [
  { ref: "INV-0042", amount: "0.50 USDC", status: "Paid", paid: true },
  { ref: "INV-0041", amount: "0.10 USDC", status: "Open", paid: false },
  { ref: "INV-0040", amount: "0.25 USDC", status: "Cancelled", paid: false },
];

function Card({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <BentoCard as="article" className="h-full gap-5">
      <div className="flex flex-1 flex-col justify-center">{children}</div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-[color:var(--color-muted)]">{line}</p>
      </div>
    </BentoCard>
  );
}

