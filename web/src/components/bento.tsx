import type { ReactNode } from "react";

/** Small rounded pill above a section heading, e.g. "How it works". */
export function PillLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--color-line)] bg-white px-3 py-1 text-xs font-medium text-[color:var(--color-muted)] shadow-[0_1px_2px_rgb(17_20_24/0.04)]">
      {children}
    </span>
  );
}

/** Centred section header: pill label, heading and a one-line grey subheading. */
export function SectionHead({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
      <PillLabel>{label}</PillLabel>
      <h2 className="text-3xl font-medium leading-[1.15] tracking-[-0.01em] sm:text-4xl">{title}</h2>
      {sub && <p className="text-base text-[color:var(--color-muted)]">{sub}</p>}
    </div>
  );
}

/** Sub-page header: pill label, page heading (h1) and a one-line grey subheading. Left-aligned, so sub-pages read differently from the centred landing sections. */
export function PageHead({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div className="flex max-w-2xl flex-col items-start gap-4 text-left">
      <PillLabel>{label}</PillLabel>
      <h1 className="text-4xl font-medium leading-[1.12] tracking-[-0.015em] sm:text-5xl">{title}</h1>
      {sub && <p className="text-base text-[color:var(--color-muted)] sm:text-lg">{sub}</p>}
    </div>
  );
}

/** Bento card: solid white, 1rem radius, one soft shadow. `className` sets the grid footprint. */
export function BentoCard({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  return (
    <Tag className={`relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </Tag>
  );
}

/**
 * Hairline row with small node dots at the ends and joins, as section dividers.
 * `columns` sets how many cells the row holds, each with its own top rule.
 */
export function HairlineRow({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 }) {
  return (
    <div className={`relative grid gap-0 ${columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[color:var(--color-line)]" />
      {[0, 1, 2].slice(0, columns).map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute top-0 hidden size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--color-line)] bg-white md:block"
          style={{ left: `${(100 / columns) * i}%` }}
        />
      ))}
      {children}
    </div>
  );
}
