import { Link } from "react-router";
import { Reveal } from "../components/motion.tsx";

const STEPS = [
  {
    n: "1",
    title: "Create",
    body: "The issuer creates an invoice. Its id is derived from the issuer and a reference, so nobody else can take it. Amount, token and payee are fixed on-chain.",
  },
  {
    n: "2",
    title: "Pay once",
    body: "The payer approves the exact amount and pays. USDC goes straight to the issuer. A second payment reverts with AlreadyPaid.",
  },
  {
    n: "3",
    title: "Books close themselves",
    body: "The ledger and CSV are rebuilt from chain reads. There is no backend, no database and no indexer to keep in sync.",
  },
];

export function HowItWorks() {
  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">How it works</h1>
          <p className="text-lg text-[color:var(--color-muted)]">Three steps. The contract enforces the middle one.</p>
        </div>
      </Reveal>

      <ol className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 120}>
            <div className="glass flex h-full flex-col gap-4 p-6">
              <span className="font-mono text-sm font-semibold text-[color:var(--color-accent)]">0{s.n}</span>
              <h2 className="font-display text-2xl font-bold">{s.title}</h2>
              <p className="text-[color:var(--color-muted)]">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal>
        <div className="flex flex-wrap gap-3">
          <Link to="/new" className="btn-primary">
            Launch app
          </Link>
          <Link to="/why-arc" className="btn-secondary">
            Why Arc
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
