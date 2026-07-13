"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function JobActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`Delete “${title}” from ApplyPilot? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete this job");
      router.push("/jobs");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this job");
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn-ghost text-[var(--danger)]" disabled={busy} onClick={remove} type="button">
        <Trash2 size={15} /> {busy ? "Deleting..." : "Delete job"}
      </button>
      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
