"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanButton({ sourceId }: { sourceId?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function scan() {
    setBusy(true);
    setMessage(null);
    try {
      const url = sourceId ? `/api/sources/${sourceId}/scan` : "/api/scan/run";
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed");
      setMessage(sourceId ? `${data.created || 0} new jobs imported.` : "All sources scanned.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button className="btn-secondary text-sm" disabled={busy} onClick={scan} type="button">{busy ? "Scanning..." : sourceId ? "Scan now" : "Scan all sources"}</button>
      {message ? <div className="text-xs text-white/55">{message}</div> : null}
    </div>
  );
}
