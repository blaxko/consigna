import { Link, NavLink } from "react-router";
import { useAccount } from "wagmi";
import { Home02, Plus, Receipt } from "@untitledui/icons";
import { Logo } from "./Logo.tsx";
import { DEMO_ISSUER } from "../lib/demo.ts";
import { shortAddress } from "../lib/format.ts";

/**
 * Desktop app sidebar (lg and up only). Mobile uses the header menu instead.
 * White, hairline right border, no glass and no glow. Sticks under the 72px header.
 */
export function AppSidebar() {
  const { address, isConnected } = useAccount();
  const issuer = isConnected && address ? address : DEMO_ISSUER;

  return (
    <aside
      aria-label="App navigation"
      className="hidden w-60 shrink-0 flex-col gap-6 border-r border-[color:var(--color-line)] bg-white px-4 py-6 lg:sticky lg:top-[72px] lg:flex lg:h-[calc(100vh-72px)] lg:self-start"
    >
      <Link to="/dashboard" className="px-2" aria-label="Consigna dashboard">
        <Logo size={24} />
      </Link>

      <Link to="/new" className="btn-primary !py-2 text-sm">
        <Plus className="size-4" aria-hidden="true" /> New invoice
      </Link>

      <nav aria-label="Pages" className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted)]">General</p>
        <SideLink to="/dashboard" icon={Home02} label="Dashboard" />
        <SideLink to={`/ledger/${issuer}`} icon={Receipt} label="Invoices" />
      </nav>

      <div className="mt-auto rounded-xl border border-[color:var(--color-line)] bg-white p-3 text-sm">
        {isConnected && address ? (
          <>
            <p className="text-xs text-[color:var(--color-muted)]">Connected</p>
            <p className="font-mono" title={address}>{shortAddress(address)}</p>
          </>
        ) : (
          <>
            <p className="font-medium">Demo issuer</p>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">Connect a wallet to see your invoices</p>
          </>
        )}
      </div>
    </aside>
  );
}

function SideLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Home02;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
          isActive
            ? "bg-[rgb(45_100_214/0.08)] text-[color:var(--color-accent)]"
            : "text-[color:var(--color-ink)] hover:bg-[rgb(20_18_43/0.05)]"
        }`
      }
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </NavLink>
  );
}
