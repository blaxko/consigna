import { createBrowserRouter, Outlet, useLocation } from "react-router";
import { WalletButton } from "./components/WalletButton.tsx";
import { SiteHeader } from "./components/SiteHeader.tsx";
import { SiteFooter } from "./components/SiteFooter.tsx";
import { Placeholder } from "./pages/Placeholder.tsx";
import { NewInvoice } from "./pages/NewInvoice.tsx";
import { PayInvoice } from "./pages/PayInvoice.tsx";
import { Ledger } from "./pages/Ledger.tsx";

// Marketing layout: opaque nav, the page, one-line footer.
function MarketingLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// App layout: the same nav (no Launch button here), the wallet control, then the screen.
function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader cta={false} right={<WalletButton />} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Marketing pages are code-split with route-level lazy loading, so the app screens stay under the bundle budget (NFR-P4).
export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { index: true, lazy: () => import("./pages/Home.tsx").then((m) => ({ Component: m.Home })) },
      { path: "how-it-works", lazy: () => import("./pages/HowItWorks.tsx").then((m) => ({ Component: m.HowItWorks })) },
      { path: "why-arc", lazy: () => import("./pages/WhyArc.tsx").then((m) => ({ Component: m.WhyArc })) },
      { path: "proof", lazy: () => import("./pages/Proof.tsx").then((m) => ({ Component: m.Proof })) },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "new", element: <NewInvoice /> },
      { path: "i/:id", element: <PayInvoice /> },
      { path: "ledger/:issuer", element: <Ledger /> },
      { path: "*", element: <Placeholder title="Not found" /> },
    ],
  },
]);
