import { Link } from "react-router";
import { HairlineRow, SectionHead } from "../components/bento.tsx";
import { HeroDemo } from "../components/HeroDemo.tsx";
import { Reveal } from "../components/motion.tsx";
import { HeroFloats } from "../components/landing/HeroFloats.tsx";
import { BentoShowcase } from "../components/landing/BentoShowcase.tsx";
import { DashboardPreview } from "../components/landing/DashboardPreview.tsx";

const PROBLEM_FIX_RESULT = [
  { label: "Problem", text: "Stablecoin duplicates settle before anyone notices." },
  { label: "Fix", text: "The contract refuses a second payment for the same invoice." },
  { label: "Result", text: "Books rebuild from the chain, with nothing to reconcile." },
];

/** Landing: hero with one primary action and the demo, the bento, the three-part row with the dashboard, and a short close. */
export function Home() {
  return (
    <div className="flex flex-col gap-24 pb-8 sm:gap-32">
      <section className="mx-auto w-full max-w-6xl overflow-x-clip pt-10 sm:pt-16">
        <div className="relative flex flex-col items-center gap-10">
          <HeroFloats />

          <Reveal>
            <div className="relative flex max-w-2xl flex-col items-center gap-6 text-center">
              <h1 className="font-display text-[34px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[48px] lg:text-[56px]">
                <span className="block text-[color:var(--color-ink)]">One invoice. One payment.</span>
                <span className="block text-[color:var(--color-muted)]">Enforced by Arc.</span>
              </h1>

              <p className="max-w-lg text-base text-[color:var(--color-muted)] sm:text-[17px]">
                Consigna stops a duplicate USDC payment in the contract, before it settles.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-6">
                <Link to="/new" className="btn-primary">
                  Launch app
                </Link>
                <Link to="/how-it-works" className="text-sm font-semibold text-[color:var(--color-ink)] underline underline-offset-4">
                  How it works
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <div className="mx-auto mt-14 max-w-md">
            <HeroDemo />
          </div>
        </Reveal>
      </section>

      <section className="flex flex-col gap-12">
        <Reveal>
          <SectionHead label="Why it holds" title="Keep the books honest" sub="What you can check on Arc, not promises." />
        </Reveal>
        <BentoShowcase />
      </section>

      <section className="flex flex-col gap-16">
        <HairlineRow columns={3}>
          {PROBLEM_FIX_RESULT.map((c) => (
            <Reveal key={c.label} className="flex flex-col gap-3 py-8 md:px-8">
              <span className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-muted)]">{c.label}</span>
              <p className="text-lg leading-snug text-[color:var(--color-ink)]">{c.text}</p>
            </Reveal>
          ))}
        </HairlineRow>

        <Reveal>
          <DashboardPreview />
        </Reveal>
      </section>

      <Reveal>
        <section className="flex flex-col items-center gap-6 rounded-[var(--radius-card)] bg-[color:var(--color-navy)] px-6 py-16 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl font-medium tracking-[-0.01em] text-white sm:text-4xl">Put your next invoice on Arc.</h2>
          <p className="max-w-md text-[color:var(--color-navy-muted)]">Create the invoice and send the link. It can be paid once.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/dashboard" className="btn-light">
              Open app
            </Link>
            <Link to="/proof" className="text-sm font-semibold text-white underline underline-offset-4">
              See the proof
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
