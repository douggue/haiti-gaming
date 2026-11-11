/**
 * Text pages (about, terms, privacy, refunds, guides…): a glowing header card with a small eyebrow,
 * then the content. `wide` gives guides and help pages the full container width.
 */
export function ContentPage({
  title,
  eyebrow,
  intro,
  icon,
  wide = false,
  children,
}: {
  title: string;
  eyebrow?: string;
  intro?: React.ReactNode;
  icon?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`container-page py-6 sm:py-10 ${wide ? "" : "max-w-3xl"}`}>
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1d4ed8]/25 via-surface/70 to-[#7c3aed]/15 p-5 sm:p-8">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <div className="relative flex items-start gap-4">
          {icon && <span aria-hidden className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary sm:grid">{icon}</span>}
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow link-accent text-primary">{eyebrow}</p>}
            <h1 className="display mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            {intro && <div className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{intro}</div>}
          </div>
        </div>
      </header>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

/** Numbered rules (terms, privacy, refunds): one surface, a divider between clauses, the same step dots as everywhere. */
export function NumberedCards({ items }: { items: string[] }) {
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((p, i) => (
        <li key={i} className="flex gap-4 p-4 sm:p-5">
          <span className="step-dot" aria-hidden>{i + 1}</span>
          <p className="text-[15px]">{p}</p>
        </li>
      ))}
    </ol>
  );
}
