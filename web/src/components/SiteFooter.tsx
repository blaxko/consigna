/** One-line footer: wordmark, network, source. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[color:var(--color-line)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-[color:var(--color-muted)]">
        <span className="font-semibold text-[color:var(--color-ink)]">Consigna</span>
        <span>Arc mainnet · chain 5042</span>
        <a
          href="https://github.com/blaxko/consigna"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4 hover:text-[color:var(--color-ink)]"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
