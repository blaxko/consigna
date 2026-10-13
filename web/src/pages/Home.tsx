import type { ReactNode } from "react";
import { Link } from "react-router";
import { BlockedCard } from "../components/BlockedCard.tsx";
import { InvoicePaper } from "../components/InvoicePaper.tsx";
import { CountUp, Reveal } from "../components/motion.tsx";
import { BLOCKED_DUPLICATE_TX, DEMO_ISSUER } from "../lib/demo.ts";

// Static sample data for the hero only. It is labelled "Sample data" on screen and is never sent anywhere.
const SAMPLE_PAYER = "0x9f3c1a7b2d4e6f8a0b1c2d3e4f5a6b7c8d9e0f12";
const SAMPLE_PAID_AT = Math.floor(Date.UTC(2026, 9, 13, 10, 42, 7) / 1000);

const POINTS = [
  {
    n: "01",
    title: "The contract never holds funds",
    body: "USDC moves from the payer straight to the issuer. There is no escrow, no pool and no refund path to get wrong.",
  },
  {
    n: "02",
    title: "No admin keys",
    body: "The contract has no owner, no pause and no upgrade. What it does today is what it does on every later day.",
  },
  {
    n: "03",
    title: "Books from chain reads",
    body: "The ledger and CSV are rebuilt from the chain itself. Nothing lives off-chain, so there is nothing to reconcile.",
  },
];

/** Landing: hero with real components, stats strip, three short points, closing CTA. */
export function Home() {
  return (
    <div className="flex flex-col gap-24 pb-8 sm:gap-32">
      <section className="grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              One invoice. One payment.
              <span className="block text-[color:var(--color-accent)]">Enforced by Arc.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-[color:var(--color-muted)]">
              Duplicate USDC payments settle before anyone notices. Consigna stops the second one in the contract.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/new" className="btn-primary">
                Launch app
              </Link>
              <Link to="/how-it-works" className="btn-secondary">
                How it works
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="flex flex-col gap-4">
            <div className="glass glass-liquid float p-5 sm:p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                Sample data
              </p>
              <InvoicePaper
                ref_="INV-0042"
                issuer={DEMO_ISSUER}
                status="paid"
                amountUnits={500_000n}
                lines={[{ desc: "Design retainer", qty: 1, unit: "0.50" }]}
              />
            </div>
            <div className="ml-auto w-[94%]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
                Sample data
              </p>
              <BlockedCard payer={SAMPLE_PAYER} paidAt={SAMPLE_PAID_AT} txHash={BLOCKED_DUPLICATE_TX} scroll={false} />
            </div>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section aria-label="Key numbers" className="glass grid grid-cols-2 gap-8 p-6 sm:p-10 md:grid-cols-4">
          <Stat value={<CountUp to={1} />} caption="payment per invoice" />
          <Stat value={<span>&lt;1s</span>} caption="finality on Arc" />
          <Stat value={<CountUp to={0.01} decimals={2} prefix="~$" />} caption="per transaction" />
          <Stat value={<CountUp to={0} />} caption="admin keys" />
        </section>
      </Reveal>

      <section className="flex flex-col gap-10">
        <Reveal>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Built so the rules hold.</h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {POINTS.map((p, i) => (
            <Reveal key={p.n} delay={i * 120}>
              <article className="glass flex h-full flex-col gap-4 p-6">
                <span className="font-mono text-sm font-semibold text-[color:var(--color-accent)]">{p.n}</span>
                <h3 className="font-display text-xl font-bold leading-snug">{p.title}</h3>
                <p className="text-[color:var(--color-muted)]">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="glass flex flex-col items-center gap-6 px-6 py-14 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Put your next invoice on Arc.</h2>
          <p className="max-w-md text-[color:var(--color-muted)]">Create the invoice, send the link, and it can be paid once.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/new" className="btn-primary">
              Launch app
            </Link>
            <Link to="/proof" className="btn-secondary">
              See the proof
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function Stat({ value, caption }: { value: ReactNode; caption: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{value}</p>
      <p className="text-sm text-[color:var(--color-muted)]">{caption}</p>
    </div>
  );
}
