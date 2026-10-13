import { Link } from "react-router";
import { useAccount } from "wagmi";

// Header links: home, new invoice, and the ledger for the connected issuer.
export function SiteNav() {
  const { address } = useAccount();
  return (
    <nav aria-label="Main" className="flex items-center gap-4 text-sm">
      <Link to="/" className="font-semibold">
        Consigna
      </Link>
      <Link to="/new" className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">
        New invoice
      </Link>
      {address && (
        <Link to={`/ledger/${address}`} className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]">
          Ledger
        </Link>
      )}
    </nav>
  );
}
