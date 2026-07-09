export default function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <div className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-cyan-200/80">{eyebrow}</div> : null}
        <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white md:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 md:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
