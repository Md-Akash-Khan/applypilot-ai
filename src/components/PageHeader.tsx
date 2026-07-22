export default function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="page-header mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="max-w-4xl text-3xl font-extrabold tracking-[-0.035em] text-[var(--text-strong)] md:text-[2.65rem] md:leading-[1.08]">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)] md:text-[15px]">{description}</p> : null}
      </div>
      {action ? <div className="page-header-actions flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
