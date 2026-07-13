"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

type Preview = {
  title: string;
  company: string;
  location: string;
  deadline: string;
  jobType: string;
  salary: string;
  description: string;
  requirements: string;
  applyUrl: string;
  category: "GOVERNMENT" | "PRIVATE_CORPORATE" | "ACADEMIC_RESEARCH" | "UNCATEGORIZED";
};

const emptyPreview: Preview = {
  title: "",
  company: "",
  location: "",
  deadline: "",
  jobType: "",
  salary: "",
  description: "",
  requirements: "",
  applyUrl: "",
  category: "UNCATEGORIZED"
};

export default function PasteImporter() {
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"parse" | "save" | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Preview>(key: K, value: Preview[K]) {
    setPreview((current) => ({ ...(current || emptyPreview), [key]: value }));
  }

  async function parsePost() {
    setBusy("parse");
    setError(null);
    setJobId(null);
    try {
      const response = await fetch("/api/import/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text, sourceUrl, action: "preview" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not extract this job post");
      setPreview(data.parsed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not extract this job post");
    } finally {
      setBusy(null);
    }
  }

  async function saveJob() {
    if (!preview) return;
    setBusy("save");
    setError(null);
    try {
      const response = await fetch("/api/import/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text, sourceUrl, action: "save", parsed: preview })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this job");
      setJobId(data.job.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this job");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setText("");
    setSourceUrl("");
    setPreview(null);
    setJobId(null);
    setError(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="card p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-strong)]"><Sparkles size={19} /></div>
          <div>
            <h2 className="section-title">Paste the original post</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">The parser extracts only the details you need: role, company, location, deadline, type, summary, and direct link.</p>
          </div>
        </div>
        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-bold text-[var(--muted)]">Original job URL <span className="font-medium text-[var(--subtle)]">(recommended)</span></span>
          <input
            className="input"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://company.com/jobs/role-id"
          />
          <span className="mt-2 block text-xs leading-5 text-[var(--subtle)]">Copied text often excludes its webpage address. Add it here once so the saved job always keeps the direct application link.</span>
        </label>
        <textarea
          className="input min-h-[360px]"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste content from a company website, LinkedIn post, email, job circular, or PDF text..."
        />
        <button className="btn-primary mt-4 w-full" disabled={busy !== null || text.trim().length < 20} onClick={parsePost} type="button">
          {busy === "parse" ? "Extracting details..." : "Extract job details"} <ArrowRight size={17} />
        </button>
        {error && !preview ? <div className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</div> : null}
      </section>

      <section className="card p-5">
        <div className="mb-5">
          <h2 className="section-title">Review before saving</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Correct any field if the source uses an unusual format. The full pasted post is not shown on the job card.</p>
        </div>

        {!preview ? (
          <div className="empty-state min-h-[420px] grid place-items-center">
            <div>
              <Sparkles className="mx-auto text-[var(--primary)]" size={30} />
              <h3 className="mt-3 font-bold text-[var(--text-strong)]">Extracted fields will appear here</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Paste a job post and click “Extract job details.”</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Job title"><input className="input" value={preview.title} onChange={(e) => update("title", e.target.value)} /></Field>
              <Field label="Company"><input className="input" value={preview.company} onChange={(e) => update("company", e.target.value)} /></Field>
              <Field label="Location"><input className="input" value={preview.location} onChange={(e) => update("location", e.target.value)} /></Field>
              <Field label="Application deadline"><input className="input" type="date" value={preview.deadline} onChange={(e) => update("deadline", e.target.value)} /></Field>
              <Field label="Job type"><input className="input" value={preview.jobType} onChange={(e) => update("jobType", e.target.value)} /></Field>
              <Field label="Category">
                <select className="input" value={preview.category} onChange={(e) => update("category", e.target.value as Preview["category"])}>
                  <option value="PRIVATE_CORPORATE">Private & Corporate</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="ACADEMIC_RESEARCH">Academic & Research</option>
                  <option value="UNCATEGORIZED">Uncategorized</option>
                </select>
              </Field>
            </div>
            <Field label="Direct job/application link"><input className="input" type="url" value={preview.applyUrl} onChange={(e) => update("applyUrl", e.target.value)} placeholder="https://..." /></Field>
            <Field label="Concise summary"><textarea className="input min-h-28" value={preview.description} onChange={(e) => update("description", e.target.value)} /></Field>
            <Field label="Essential requirements"><textarea className="input min-h-28" value={preview.requirements} onChange={(e) => update("requirements", e.target.value)} /></Field>

            {error ? <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</div> : null}
            {jobId ? (
              <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] p-4">
                <div className="flex items-center gap-2 font-bold text-[var(--success)]"><CheckCircle2 size={18} /> Job saved successfully</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/jobs/${jobId}`} className="btn-primary">Open saved job</Link>
                  <button type="button" className="btn-secondary" onClick={reset}>Import another</button>
                </div>
              </div>
            ) : (
              <button className="btn-primary w-full" disabled={busy !== null || !preview.title || !preview.company || !preview.description} onClick={saveJob} type="button">
                {busy === "save" ? "Saving..." : "Save reviewed job"}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">{label}</span>{children}</label>;
}
