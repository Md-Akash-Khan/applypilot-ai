"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";

type Props = {
  id: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  name: string;
};

export default function SourceActions({ id, status, name }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paused = status === "PAUSED";
  const needsResume = paused || status === "ERROR";

  async function toggle() {
    setBusy("toggle");
    setError(null);
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: needsResume ? "ACTIVE" : "PAUSED" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update this source");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this source");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const confirmed = window.confirm(`Remove “${name}” from monitored sources? Imported jobs will remain in your workspace.`);
    if (!confirmed) return;
    setBusy("delete");
    setError(null);
    try {
      const response = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not remove this source");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove this source");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={busy !== null} onClick={toggle} type="button">
          {needsResume ? <Play size={15} /> : <Pause size={15} />}
          {busy === "toggle" ? "Updating..." : status === "ERROR" ? "Retry monitoring" : paused ? "Resume monitoring" : "Pause monitoring"}
        </button>
        <button className="btn-ghost text-[var(--danger)]" disabled={busy !== null} onClick={remove} type="button">
          <Trash2 size={15} /> {busy === "delete" ? "Removing..." : "Remove source"}
        </button>
      </div>
      {error ? <p className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
