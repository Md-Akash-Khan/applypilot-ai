"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";

export default function ManualJobForm() {
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    setJobId(null);
    try {
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save job");
      setJobId(data.job.id);
      (document.getElementById("manual-job-form") as HTMLFormElement | null)?.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="manual-job-form" action={submit} className="card p-5 md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Job title"><input className="input" name="title" placeholder="Software Engineer" required /></Field>
        <Field label="Company / organization"><input className="input" name="company" placeholder="Company name" required /></Field>
        <Field label="Location"><input className="input" name="location" placeholder="Dhaka, Remote, Germany..." /></Field>
        <Field label="Application deadline"><input className="input" name="deadline" type="date" /></Field>
        <Field label="Category">
          <select className="input" name="category" defaultValue="UNCATEGORIZED">
            <option value="UNCATEGORIZED">Auto classify</option>
            <option value="GOVERNMENT">Government</option>
            <option value="PRIVATE_CORPORATE">Private & Corporate</option>
            <option value="ACADEMIC_RESEARCH">Academic & Research</option>
          </select>
        </Field>
        <Field label="Job type"><input className="input" name="jobType" placeholder="Full-time, Internship, Contract" /></Field>
        <Field label="Salary / compensation"><input className="input" name="salary" placeholder="Optional" /></Field>
        <Field label="Direct job or application link"><input className="input" name="applyUrl" type="url" placeholder="https://..." /></Field>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Short role summary"><textarea className="input min-h-36" name="description" placeholder="Keep only the key purpose of the role." required /></Field>
        <Field label="Essential requirements"><textarea className="input min-h-36" name="requirements" placeholder="Degree, experience, skills, or eligibility." /></Field>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</div> : null}
      {jobId ? (
        <div className="mt-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success-soft)] p-4">
          <div className="flex items-center gap-2 font-bold text-[var(--success)]"><CheckCircle2 size={18} /> Job saved</div>
          <Link href={`/jobs/${jobId}`} className="btn-primary mt-3">Open job</Link>
        </div>
      ) : null}
      <button className="btn-primary mt-5 w-full md:w-auto" disabled={busy} type="submit"><Save size={17} /> {busy ? "Saving..." : "Save opportunity"}</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">{label}</span>{children}</label>;
}
