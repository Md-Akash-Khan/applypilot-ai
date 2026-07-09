export default function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-cyan-100/65">{hint}</div> : null}
    </div>
  );
}
