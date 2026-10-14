import { Link } from "react-router";
import { BentoCard, PageHead } from "../components/bento.tsx";
import { Reveal } from "../components/motion.tsx";

const POINTS = [
  {
    title: "USDC is the gas",
    figure: "~$0.01",
    figureNote: "per transaction",
    body: "Fees are about $0.01 per transaction and paid in USDC, the same token as the invoice. The cost is small and predictable.",
  },
  {
    title: "Sub-second finality",
    figure: "<1s",
    figureNote: "to final",
    body: "Arc finalises in under a second. Once a payment is included it is final, so “paid” means paid.",
  },
  {
    title: "Native Circle tokens",
    figure: "USDC · EURC",
    figureNote: "6 decimals each",
    body: "USDC and EURC are both native on Arc, as 6-decimal ERC-20s. The contract accepts both.",
  },
];

export function WhyArc() {
  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <PageHead label="Arc" title="Why Arc" sub="Three properties this product depends on." />
      </Reveal>

      <div className="grid gap-5 md:grid-cols-3">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 120}>
            <BentoCard as="article" className="h-full gap-5">
              <div className="flex flex-col gap-1 rounded-xl bg-[#f7f7f8] p-5">
                <span className="font-mono text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">{p.figure}</span>
                <span className="text-sm text-[color:var(--color-muted)]">{p.figureNote}</span>
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                <p className="leading-relaxed text-[color:var(--color-muted)]">{p.body}</p>
              </div>
            </BentoCard>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="flex justify-center">
          <Link to="/proof" className="btn-secondary">
            See the mainnet proof
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
