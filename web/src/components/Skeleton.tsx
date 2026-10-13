// Placeholder that mirrors the shape of the content while it loads. Announced as busy, not as text.
export function Skeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse flex-col gap-2 rounded-lg bg-white p-4" aria-hidden="true">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
