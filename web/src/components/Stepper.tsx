import { CheckCircle } from "@untitledui/icons";

// Two-step progress for the pay flow: 1 Allow USDC, 2 Pay. Status is text plus icon.
export function Stepper({ steps, current }: { steps: { label: string; done: boolean; skipped?: boolean }[]; current: number }) {
  return (
    <ol className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
      {steps.map((s, i) => {
        const state = s.done ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.label} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
            {state === "done" ? (
              <CheckCircle className="size-5 text-[color:var(--color-accent)]" aria-hidden="true" />
            ) : (
              <span className={`flex size-5 items-center justify-center rounded-full border text-xs ${state === "current" ? "border-[color:var(--color-accent)] font-semibold" : "text-[color:var(--color-muted)]"}`}>
                {i + 1}
              </span>
            )}
            <span className={state === "todo" ? "text-[color:var(--color-muted)]" : "font-medium"}>
              {s.label}
              {s.skipped ? " (already allowed)" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
