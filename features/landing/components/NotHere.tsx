const items = [
  { gone: "Automatic broker sync", instead: "Manual entry — your data, your control" },
  { gone: "Tax reporting", instead: "Use a real accountant for that" },
  { gone: "Options, forex, crypto", instead: "Stocks only, on purpose" },
  { gone: "Live charting", instead: "Quotes and RSI, nothing more" },
  { gone: "Multi-user collaboration", instead: "One portfolio, one person" },
  { gone: "CSV / broker import", instead: "Type it. You'll remember it." },
];

export function NotHere() {
  return (
    <section
      id="not-here"
      className="mx-auto w-full max-w-[1200px] px-6 lg:px-8 py-16 sm:py-24"
    >
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-text-tertiary font-medium">What&apos;s not here</div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
          The features we&apos;re proud not to have.
        </h2>
        <p className="mt-3 text-text-secondary">
          Focus is a feature. Here&apos;s what you won&apos;t find — and why.
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ gone, instead }) => (
          <li
            key={gone}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] p-5"
          >
            <div className="text-sm font-semibold text-text-primary line-through decoration-[color:var(--text-tertiary)] decoration-1">
              {gone}
            </div>
            <div className="mt-1 text-sm text-text-secondary">{instead}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
