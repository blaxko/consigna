import { Link } from "react-router";
import { Reveal } from "../components/motion.tsx";

const POINTS = [
  {
    title: "USDC is the gas",
    body: "Fees are about $0.01 per transaction and paid in USDC, the same token as the invoice. The cost is small and predictable.",
  },
  {
    title: "Sub-second finality",
    body: "Arc finalises in under a second. Once a payment is included it is final, so “paid” means paid.",
  },
  {
    title: "Native Circle tokens",
    body: "USDC and EURC are both native on Arc, as 6-decimal ERC-20s. The contract accepts both.",
  },
];

export function WhyArc() {
  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Why Arc</h1>
          <p className="text-lg text-[color:var(--color-muted)]">Three properties this product depends on.</p>
        </div>
      </Reveal>

      <div className="grid gap-5">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 120}>
            <div className="glass grid gap-3 p-6 sm:grid-cols-[1fr_2fr] sm:items-baseline sm:gap-8 sm:p-8">
              <h2 className="font-display text-xl font-bold">{p.title}</h2>
              <p className="text-[color:var(--color-muted)]">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <Link to="/proof" className="btn-secondary w-fit">
          See the mainnet proof
        </Link>
      </Reveal>
    </div>
  );
}
