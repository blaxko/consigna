import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useAccount } from "wagmi";
import { DEMO_ISSUER } from "../lib/demo.ts";
import { Logo } from "./Logo.tsx";

const LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/why-arc", label: "Why Arc" },
  { to: "/proof", label: "Proof" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-md px-2 font-medium transition duration-100 ease-linear ${
    isActive ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
  }`;

/**
 * Site header. One compact row on every screen: logo left, then Launch app and ☰ on the right.
 * Below 1024px the links live in the menu. From 1024px they sit inline and ☰ is hidden.
 * Solid and opaque with a hairline border. No blur, no glass, no shadow. Sticky, so it reserves its own space.
 */
export function SiteHeader({ right, cta = true }: { right?: ReactNode; cta?: boolean }) {
  const { address } = useAccount();
  const location = useLocation();
  const ledgerTo = `/ledger/${address ?? DEMO_ISSUER}`;

  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Esc and the ☰ button return focus to ☰. An outside tap does not, so it keeps the element the user tapped.
  const returnFocus = useRef(true);

  function closeMenu(restoreFocus: boolean) {
    returnFocus.current = restoreFocus;
    setOpen(false);
  }

  // Closes on every route change, including a link tap.
  useEffect(() => {
    closeMenu(false);
  }, [location.pathname]);

  // Focus: move into the menu on open, back to ☰ on close.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    } else if (wasOpen.current && returnFocus.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Esc, outside tap, and a Tab trap that stays inside ☰ plus the menu links while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu(true);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current || !toggleRef.current) return;
      const items = [toggleRef.current, ...panelRef.current.querySelectorAll<HTMLElement>("a, button")];
      const idx = items.indexOf(document.activeElement as HTMLElement);
      const last = items.length - 1;
      e.preventDefault();
      const next = e.shiftKey ? (idx <= 0 ? last : idx - 1) : idx === -1 || idx === last ? 0 : idx + 1;
      items[next].focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) closeMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const allLinks = [...LINKS, { to: ledgerTo, label: "Ledger" }];

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-[color:var(--color-line)] bg-white"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:h-[72px] lg:gap-8 lg:px-6">
        <Link to="/" aria-label="Consigna home" className="shrink-0 rounded-md text-[color:var(--color-ink)]">
          <Logo size={26} />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {allLinks.map((l) => (
            <NavLink key={l.label} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          {right}
          {cta && (
            <Link to="/new" className="btn-primary min-h-11 !px-4 !py-2 text-sm !shadow-none">
              Launch app
            </Link>
          )}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => {
              if (open) closeMenu(true);
              else {
                returnFocus.current = true;
                setOpen(true);
              }
            }}
            className="flex size-11 items-center justify-center rounded-full text-[color:var(--color-ink)] transition duration-100 ease-linear hover:bg-[rgb(20_18_43/0.06)] lg:hidden"
          >
            <span aria-hidden="true" className={`menu-icon ${open ? "is-open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <div
        id="site-menu"
        ref={panelRef}
        inert={!open}
        className={`menu-panel absolute inset-x-0 top-full border-b border-[color:var(--color-line)] bg-white lg:hidden ${open ? "is-open" : ""}`}
      >
        <nav aria-label="Menu" className="mx-auto flex max-w-6xl flex-col px-4 py-2">
          {allLinks.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              onClick={() => closeMenu(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center border-b border-[color:var(--color-line)] py-2 text-base font-medium last:border-b-0 ${
                  isActive ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-ink)]"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
