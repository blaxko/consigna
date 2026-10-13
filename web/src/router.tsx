import { createBrowserRouter, Outlet, Link } from "react-router";
import { WalletButton } from "./components/WalletButton.tsx";
import { Placeholder } from "./pages/Placeholder.tsx";

function Layout() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[color:var(--color-line)] bg-white px-4 py-3">
        <Link to="/" className="font-semibold">
          Consigna
        </Link>
        <WalletButton />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

// Phase 3 step 1: placeholder routes only. Real pages arrive in step 3.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Placeholder title="Home" /> },
      { path: "new", element: <Placeholder title="Create invoice" /> },
      { path: "i/:id", element: <Placeholder title="Invoice" /> },
      { path: "ledger/:issuer", element: <Placeholder title="Ledger" /> },
    ],
  },
]);
