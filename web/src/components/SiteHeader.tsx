import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { useAccount } from "wagmi";
import { DEMO_ISSUER } from "../lib/demo.ts";

const LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/why-arc", label: "Why Arc" },
  { to: "/proof", label: "Proof" },
];

/**
 * Site nav. Solid and opaque, with no blur and no transparency, even when scrolled. Sticky only.
 * The Ledger link goes to the connected issuer, or to the demo ledger when no wallet is connected.
 */
export function SiteHeader({ right, cta = true }: { right?: ReactNode; cta?: boolean }) {
  const { address } = useAccount();
  const ledgerTo = `/ledger/${address ?? DEMO_ISSUER}`;
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--color-line)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          Consigna
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-1 py-0.5 font-medium ${isActive ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to={ledgerTo}
            className={({ isActive }) =>
              `rounded-md px-1 py-0.5 font-medium ${isActive ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"}`
            }
          >
            Ledger
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {right}
          {cta && (
            <Link to="/new" className="btn-primary !py-2">
              Launch app
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
