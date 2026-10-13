import { createBrowserRouter, Outlet, Link } from "react-router";
import { WalletButton } from "./components/WalletButton.tsx";
import { SiteNav } from "./components/SiteNav.tsx";
import { Placeholder } from "./pages/Placeholder.tsx";
import { NewInvoice } from "./pages/NewInvoice.tsx";
import { PayInvoice } from "./pages/PayInvoice.tsx";
import { Ledger } from "./pages/Ledger.tsx";

function Layout() {
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-line)] bg-white px-4 py-3">
        <SiteNav />
        <WalletButton />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <section className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold">Consigna</h1>
            <p className="text-sm text-[color:var(--color-muted)]">
              One invoice, one payment, enforced by Arc mainnet.
            </p>
            <div className="flex gap-3 text-sm">
              <Link to="/new" className="font-medium text-[color:var(--color-accent)] underline">Create an invoice</Link>
            </div>
          </section>
        ),
      },
      { path: "new", element: <NewInvoice /> },
      { path: "i/:id", element: <PayInvoice /> },
      { path: "ledger/:issuer", element: <Ledger /> },
      { path: "*", element: <Placeholder title="Not found" /> },
    ],
  },
]);
