"use client";

import Link from "next/link";
import { useState } from "react";

type Result = { job: { id: string; title: string; company: string; relevanceScore: number } };

export default function PasteImporter() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/import/paste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not import pasted job");
      setResult(data);
      setText("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <textarea className="input min-h-[360px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste full job post content here from LinkedIn, company page, email, PDF text, or any job circular..." />
      {error ? <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      {result ? (
        <div className="glass rounded-3xl p-5">
          <div className="text-sm text-cyan-100/80">Imported successfully</div>
          <h3 className="mt-2 text-xl font-black">{result.job.title}</h3>
          <p className="mt-1 text-white/60">{result.job.company} • Match score {result.job.relevanceScore}</p>
          <Link href={`/jobs/${result.job.id}`} className="btn-primary mt-4 inline-block">Open job</Link>
        </div>
      ) : null}
      <button className="btn-primary" disabled={busy || text.trim().length < 20} onClick={submit} type="button">{busy ? "Parsing..." : "Parse and save job"}</button>
    </div>
  );
}
