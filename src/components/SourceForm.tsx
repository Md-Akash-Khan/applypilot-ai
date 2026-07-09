"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const response = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Could not save source. Check URL and required fields.");
      router.refresh();
      const form = document.getElementById("source-form") as HTMLFormElement | null;
      form?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="source-form" action={submit} className="glass grid gap-4 rounded-3xl p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Source name</label>
          <input className="input" name="name" placeholder="Company / career page name" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Career page URL</label>
          <input className="input" name="url" placeholder="https://company.com/careers" type="url" required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Role keywords</label>
          <input className="input" name="keywords" placeholder="software engineer, executive, research assistant" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Exclude keywords</label>
          <input className="input" name="excludedKeywords" placeholder="unpaid, senior, sales" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Locations</label>
          <input className="input" name="locationPreference" placeholder="Dhaka, Remote, Germany" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Job types</label>
          <input className="input" name="jobTypes" placeholder="Full-time, Internship, Contract" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-white/70">Scan frequency</label>
          <select className="input" name="scanFrequency" defaultValue="DAILY">
            <option value="MANUAL">Manual</option>
            <option value="DAILY">Daily</option>
            <option value="TWICE_DAILY">Twice daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
      </div>
      {error ? <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
      <button className="btn-primary" disabled={busy} type="submit">{busy ? "Saving..." : "Add smart source"}</button>
    </form>
  );
}
