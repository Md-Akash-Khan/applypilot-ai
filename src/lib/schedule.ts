import type { JobSource, ScanFrequency } from "@prisma/client";

const HOUR_MS = 60 * 60 * 1000;

export function scanIntervalMs(frequency: ScanFrequency | string) {
  switch (frequency) {
    case "TWICE_DAILY":
      return 12 * HOUR_MS;
    case "DAILY":
      return 24 * HOUR_MS;
    case "WEEKLY":
      return 7 * 24 * HOUR_MS;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

export function isSourceDue(source: Pick<JobSource, "scanFrequency" | "lastScannedAt" | "status">, now = new Date()) {
  if (source.scanFrequency === "MANUAL" || source.status === "PAUSED") return false;
  if (!source.lastScannedAt) return true;

  const normalInterval = scanIntervalMs(source.scanFrequency);
  const interval = source.status === "ERROR" ? Math.min(normalInterval, 6 * HOUR_MS) : normalInterval;
  return now.getTime() - source.lastScannedAt.getTime() >= interval;
}

export function nextScanAt(source: Pick<JobSource, "scanFrequency" | "lastScannedAt" | "status">) {
  if (source.scanFrequency === "MANUAL" || source.status === "PAUSED") return null;
  if (!source.lastScannedAt) return new Date();

  const normalInterval = scanIntervalMs(source.scanFrequency);
  const interval = source.status === "ERROR" ? Math.min(normalInterval, 6 * HOUR_MS) : normalInterval;
  return new Date(source.lastScannedAt.getTime() + interval);
}

export function frequencyLabel(frequency: ScanFrequency | string) {
  const labels: Record<string, string> = {
    MANUAL: "Manual only",
    DAILY: "Every 24 hours",
    TWICE_DAILY: "Every 12 hours",
    WEEKLY: "Every 7 days"
  };
  return labels[frequency] || String(frequency).replaceAll("_", " ");
}
