import { Link } from "react-router";
import { BentoCard, PageHead } from "../components/bento.tsx";
import { Reveal } from "../components/motion.tsx";

const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "The issuer creates an invoice. Its ID comes from the issuer and a reference, so no one else can claim it. Amount, token and payee are fixed on-chain.",
  },
  {
    n: "02",
    title: "Pay once",
    body: "The payer approves the exact amount and pays. USDC goes straight to the issuer. A second payment reverts with AlreadyPaid.",
  },
  {
    n: "03",
    title: "Books close themselves",
    body: "The ledger and CSV are rebuilt from chain reads. There is no backend, no database and no indexer to keep in sync.",
  },
];

export function HowItWorks() {
  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <PageHead label="Three steps" title="How it works" sub="The contract enforces the middle one." />
      </Reveal>

      <ol className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 120}>
            <BentoCard as="article" className="h-full gap-4">
              <span className="font-mono text-sm font-semibold text-[color:var(--color-accent)]">{s.n}</span>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="leading-relaxed text-[color:var(--color-muted)]">{s.body}</p>
            </BentoCard>
          </Reveal>
        ))}
      </ol>

      <Reveal>
        <div className="flex flex-wrap gap-3">
          <Link to="/why-arc" className="btn-secondary">
            Why Arc
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            Open app
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
