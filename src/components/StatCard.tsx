export default function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div>
          <div className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-strong)]">{value}</div>
          {hint ? <div className="mt-2 text-xs text-[var(--muted)]">{hint}</div> : null}
        </div>
        {icon ? <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]">{icon}</div> : null}
      </div>
    </div>
  );
}
