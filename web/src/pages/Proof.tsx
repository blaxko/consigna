import { Link } from "react-router";
import { BentoCard, PageHead } from "../components/bento.tsx";
import { Reveal } from "../components/motion.tsx";
import { EXPLORER, CONSIGNA_ADDRESS } from "../lib/chain.ts";
import { BLOCKED_DUPLICATE_TX, DEMO_ISSUER, DEMO_PAID_REF, invoiceIdFor } from "../lib/demo.ts";

const FALLBACK_CONTRACT = "0x7416bfbed0d79e8604c09e0225e6baab56f0c728";
const REPO = "https://github.com/blaxko/consigna";

/** Every link here is a real mainnet record or the public repo. */
export function Proof() {
  const paidPath = `/i/${invoiceIdFor(DEMO_ISSUER, DEMO_PAID_REF)}`;
  const contract = CONSIGNA_ADDRESS || FALLBACK_CONTRACT;
  const rows = [
    {
      label: "Contract on Arc mainnet",
      href: `${EXPLORER}/address/${contract}`,
      text: contract,
      external: true,
    },
    { label: "Paid invoice TEST-001", href: paidPath, text: `${paidPath.slice(0, 12)}…`, external: false },
    {
      label: "Blocked duplicate (failed transaction)",
      href: `${EXPLORER}/tx/${BLOCKED_DUPLICATE_TX}`,
      text: "0xa16c4bcc…520c",
      external: true,
    },
    { label: "Ledger for the demo issuer", href: `/ledger/${DEMO_ISSUER}`, text: "/ledger", external: false },
    { label: "Public repository", href: REPO, text: "github.com/blaxko/consigna", external: true },
  ];

  const linkClass = "break-all font-mono text-sm font-medium text-[color:var(--color-accent)] underline underline-offset-4";

  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <PageHead label="Proof" title="Proof on Arc mainnet" sub="Chain 5042. Check each link yourself." />
      </Reveal>

      <Reveal>
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-line)] bg-white shadow-[var(--shadow-card)]">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex flex-col gap-1 border-b border-[color:var(--color-line)] px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <span className="font-medium">{r.label}</span>
              {r.external ? (
                <a href={r.href} target="_blank" rel="noreferrer" className={linkClass}>
                  {r.text}
                </a>
              ) : (
                <Link to={r.href} className={linkClass.replace(" break-all", "")}>
                  {r.text}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal>
        <BentoCard className="gap-3">
          <h2 className="text-xl font-semibold">Verify the bytecode</h2>
          <p className="text-[color:var(--color-muted)]">
            Compile the repo, then compare with the chain. The script prints MATCH when they agree.
          </p>
          <code className="overflow-x-auto rounded-lg bg-[#14122b] px-4 py-3 text-sm text-white">
            npx hardhat run scripts/verify-bytecode.ts --network arc
          </code>
        </BentoCard>
      </Reveal>
    </div>
  );
}
