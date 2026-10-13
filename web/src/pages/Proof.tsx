import { Link } from "react-router";
import { Reveal } from "../components/motion.tsx";
import { EXPLORER, CONSIGNA_ADDRESS } from "../lib/chain.ts";
import { BLOCKED_DUPLICATE_TX, DEMO_ISSUER, DEMO_PAID_REF, invoiceIdFor } from "../lib/demo.ts";

const CONTRACT = "0x7416bfbed0d79e8604c09e0225e6baab56f0c728";
const REPO = "https://github.com/blaxko/consigna";

/** Every link here is a real mainnet record or the public repo. */
export function Proof() {
  const paidPath = `/i/${invoiceIdFor(DEMO_ISSUER, DEMO_PAID_REF)}`;
  const contract = CONSIGNA_ADDRESS || CONTRACT;
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

  return (
    <div className="flex flex-col gap-12 py-10 sm:py-16">
      <Reveal>
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Proof on Arc mainnet</h1>
          <p className="text-lg text-[color:var(--color-muted)]">Chain 5042. Check each link yourself.</p>
        </div>
      </Reveal>

      <ul className="grid gap-3">
        {rows.map((r, i) => (
          <Reveal as="li" key={r.label} delay={i * 80}>
            <div className="glass flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="font-medium">{r.label}</span>
              {r.external ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-sm font-medium text-[color:var(--color-accent)] underline underline-offset-4"
                >
                  {r.text}
                </a>
              ) : (
                <Link to={r.href} className="font-mono text-sm font-medium text-[color:var(--color-accent)] underline underline-offset-4">
                  {r.text}
                </Link>
              )}
            </div>
          </Reveal>
        ))}
      </ul>

      <Reveal>
        <div className="glass flex flex-col gap-3 p-6">
          <h2 className="font-display text-xl font-bold">Verify the bytecode</h2>
          <p className="text-[color:var(--color-muted)]">
            Compile the repo, then compare with the chain. The script prints MATCH when they agree.
          </p>
          <code className="overflow-x-auto rounded-lg bg-[#14122b] px-4 py-3 text-sm text-white">
            npx hardhat run scripts/verify-bytecode.ts --network arc
          </code>
        </div>
      </Reveal>
    </div>
  );
}
