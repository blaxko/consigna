import { Link } from "react-router";
import { PageHead } from "../components/bento.tsx";
import { Reveal } from "../components/motion.tsx";

const POINTS = [
  {
    title: "USDC is the gas",
    figure: "~$0.01 per transaction",
    body: "Fees are about $0.01 and paid in USDC, the same token as the invoice. The cost is small and predictable.",
  },
  {
    title: "Sub-second finality",
    figure: "under 1s to final",
    body: "Arc finalises in under a second. Once a payment is included it is final, so paid means paid.",
  },
  {
    title: "Native Circle tokens",
    figure: null,
    body: "USDC and EURC are both native on Arc, as 6-decimal ERC-20s. The contract accepts both.",
  },
];

export function WhyArc() {
  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <PageHead label="Arc" title="Why Arc" sub="Three properties this product depends on." />
      </Reveal>

      <Reveal>
        <ol className="flex flex-col border-y border-[color:var(--color-line)]">
          {POINTS.map((p) => (
            <li
              key={p.title}
              className="grid gap-4 border-b border-[color:var(--color-line)] py-8 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                {p.figure && <p className="font-mono text-sm font-medium text-[color:var(--color-accent)]">{p.figure}</p>}
              </div>
              <p className="leading-relaxed text-[color:var(--color-muted)]">{p.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal>
        <div>
          <Link to="/proof" className="btn-secondary">
            See the mainnet proof
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
