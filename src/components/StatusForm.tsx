"use client";

import { useRouter } from "next/navigation";
import type { JobStatus } from "@prisma/client";

const statuses: JobStatus[] = ["NEW", "SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "ARCHIVED"];

export default function StatusForm({ jobId, status }: { jobId: string; status: JobStatus }) {
  const router = useRouter();
  async function updateStatus(nextStatus: JobStatus) {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((item) => (
        <button key={item} onClick={() => updateStatus(item)} className={item === status ? "btn-primary px-4 py-2 text-xs" : "btn-secondary px-4 py-2 text-xs"} type="button">
          {item}
        </button>
      ))}
    </div>
  );
}
