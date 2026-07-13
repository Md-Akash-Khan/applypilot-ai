"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Radar } from "lucide-react";

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function SourceForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: String(formData.get("name") || ""),
        url: String(formData.get("url") || ""),
        keywords: split(String(formData.get("keywords") || "")),
        excludedKeywords: split(String(formData.get("excludedKeywords") || "")),
        locationPreference: split(String(formData.get("locationPreference") || "")),
        jobTypes: split(String(formData.get("jobTypes") || "")),
        scanFrequency: String(formData.get("scanFrequency") || "DAILY")
      };
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save this source. Check the URL and try again.");
      (document.getElementById("source-form") as HTMLFormElement | null)?.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this source");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="source-form" action={submit} className="card p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Radar size={19} /></div>
        <div>
          <h2 className="section-title">Add a monitored career source</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Add the main careers page once. The scheduled scanner discovers individual role links, follows them, and imports only jobs matching your rules.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Source name"><input className="input" name="name" placeholder="Therap (BD) Ltd." required /></Field>
        <Field label="Career page URL"><input className="input" name="url" placeholder="https://company.com/careers" type="url" required /></Field>
        <Field label="Relevant role keywords"><input className="input" name="keywords" placeholder="software engineer, devops, associate" /></Field>
        <Field label="Exclude keywords"><input className="input" name="excludedKeywords" placeholder="senior director, unpaid, sales" /></Field>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Field label="Locations"><input className="input" name="locationPreference" placeholder="Dhaka, Remote, Bangladesh" /></Field>
        <Field label="Job types"><input className="input" name="jobTypes" placeholder="Full-time, Internship, Contract" /></Field>
        <Field label="Automatic scan frequency">
          <select className="input" name="scanFrequency" defaultValue="DAILY">
            <option value="TWICE_DAILY">Every 12 hours</option>
            <option value="DAILY">Every 24 hours</option>
            <option value="WEEKLY">Every 7 days</option>
            <option value="MANUAL">Manual only</option>
          </select>
        </Field>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</div> : null}
      <button className="btn-primary mt-5 w-full md:w-auto" disabled={busy} type="submit"><Plus size={17} /> {busy ? "Saving source..." : "Add monitored source"}</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-[var(--muted)]">{label}</span>{children}</label>;
}
