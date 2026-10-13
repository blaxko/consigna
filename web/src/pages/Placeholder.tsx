import { useParams } from "react-router";

export function Placeholder({ title }: { title: string }) {
  const params = useParams();
  const detail = Object.values(params).join(" / ");
  return (
    <section>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted)]">
        Not built yet.{detail ? ` Route parameter: ${detail}` : ""}
      </p>
    </section>
  );
}
