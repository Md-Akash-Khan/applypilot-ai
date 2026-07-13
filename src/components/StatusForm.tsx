"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobStatus } from "@prisma/client";
import { Archive, Bookmark, BriefcaseBusiness, CheckCircle2, Clock3, Send, ThumbsDown } from "lucide-react";

const statuses: Array<{ value: JobStatus; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { value: "NEW", label: "New", icon: Clock3 },
  { value: "SAVED", label: "Saved", icon: Bookmark },
  { value: "APPLIED", label: "Applied", icon: Send },
  { value: "INTERVIEW", label: "Interview", icon: BriefcaseBusiness },
  { value: "OFFER", label: "Offer", icon: CheckCircle2 },
  { value: "REJECTED", label: "Rejected", icon: ThumbsDown },
  { value: "ARCHIVED", label: "Archived", icon: Archive }
];

export default function StatusForm({ jobId, status }: { jobId: string; status: JobStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<JobStatus | null>(null);

  async function updateStatus(nextStatus: JobStatus) {
    setBusy(nextStatus);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
      {statuses.map((item) => {
        const Icon = item.icon;
        const active = item.value === status;
        return (
          <button
            key={item.value}
            onClick={() => updateStatus(item.value)}
            className={active ? "btn-primary px-3 py-2 text-xs" : "btn-secondary px-3 py-2 text-xs"}
            disabled={busy !== null}
            type="button"
          >
            <Icon size={14} /> {busy === item.value ? "Updating..." : item.label}
          </button>
        );
      })}
    </div>
  );
}
