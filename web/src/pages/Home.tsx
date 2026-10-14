import type { ReactNode } from "react";
import { Link } from "react-router";
import { CountUp, Reveal } from "../components/motion.tsx";
import { HeroDemo } from "../components/HeroDemo.tsx";

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

/** Landing: one hero with one primary action and the demo, the stats, three points, and a quiet closing. */
export function Home() {
  return (
    <div className="flex flex-col gap-24 pb-8 sm:gap-32">
      <section className="grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="flex flex-col gap-6">
            <h1 className="text-[34px] font-semibold leading-[1.12] tracking-tight lg:text-[56px]">
              One invoice. One payment.
              <span className="block text-[color:var(--color-accent)]">Enforced by Arc.</span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-[color:var(--color-muted)] sm:text-[17px]">
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
          <HeroDemo />
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
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built so the rules hold.</h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {POINTS.map((p, i) => (
            <Reveal key={p.n} delay={i * 120}>
              <article className="glass flex h-full flex-col gap-4 p-6">
                <span className="font-mono text-sm font-medium text-[color:var(--color-accent)]">{p.n}</span>
                <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
                <p className="text-[15px] leading-relaxed text-[color:var(--color-muted)]">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="glass flex flex-col items-center gap-6 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Put your next invoice on Arc.</h2>
          <p className="max-w-md text-[color:var(--color-muted)]">Create the invoice, send the link, and it can be paid once.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="btn-secondary">
              Open app
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
      <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
      <p className="text-sm text-[color:var(--color-muted)]">{caption}</p>
    </div>
  );
}
