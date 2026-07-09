"use client";

import Link from "next/link";
import { useState } from "react";

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
      const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save job");
      setJobId(data.job.id);
      const form = document.getElementById("manual-job-form") as HTMLFormElement | null;
      form?.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="manual-job-form" action={submit} className="glass grid gap-4 rounded-3xl p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <input className="input" name="title" placeholder="Job title" required />
        <input className="input" name="company" placeholder="Company / organization" required />
        <input className="input" name="location" placeholder="Location" />
        <input className="input" name="deadline" type="date" />
        <select className="input" name="category" defaultValue="UNCATEGORIZED">
          <option value="UNCATEGORIZED">Auto / Uncategorized</option>
          <option value="GOVERNMENT">Government</option>
          <option value="PRIVATE_CORPORATE">Private & Corporate</option>
          <option value="ACADEMIC_RESEARCH">Academic & Research</option>
        </select>
        <input className="input" name="jobType" placeholder="Full-time, Internship, Contract" />
        <input className="input" name="salary" placeholder="Salary / compensation" />
        <input className="input" name="applyUrl" placeholder="Apply URL" />
      </div>
      <textarea className="input min-h-40" name="description" placeholder="Job description" required />
      <textarea className="input min-h-28" name="requirements" placeholder="Requirements / qualifications" />
      {error ? <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      {jobId ? <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">Saved. <Link href={`/jobs/${jobId}`} className="font-bold underline">Open job</Link></div> : null}
      <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving..." : "Save job"}</button>
    </form>
  );
}
