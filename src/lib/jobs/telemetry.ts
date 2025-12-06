import type { JobResponseMeta } from "./types";

const TELEMETRY_KEY = "sn-job-search-telemetry";
const MAX_ENTRIES = 20;

type JobSearchTelemetryEntry = {
  id: string;
  conversationId?: string;
  timestamp: string;
  broadenedSearch?: boolean;
  lowResultCount?: number;
  requestedCount?: number;
};

export function recordJobSearchTelemetry(meta?: JobResponseMeta) {
  if (typeof window === "undefined") {
    return;
  }
  if (!meta?.telemetryId) {
    return;
  }
  if (!meta.broadenedSearch && (typeof meta.lowResultCount !== "number" || meta.lowResultCount >= 3)) {
    return;
  }

  const payload: JobSearchTelemetryEntry = {
    id: meta.telemetryId,
    conversationId: meta.conversationId,
    timestamp: new Date().toISOString(),
    broadenedSearch: meta.broadenedSearch,
    lowResultCount: meta.lowResultCount,
    requestedCount: meta.requestedCount,
  };

  const existing = readTelemetry();
  if (existing.some((entry) => entry.id === payload.id)) {
    return;
  }

  const next = [payload, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
}

export function getJobSearchTelemetry(limit = MAX_ENTRIES): JobSearchTelemetryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  return readTelemetry().slice(0, limit);
}

function readTelemetry(): JobSearchTelemetryEntry[] {
  try {
    const raw = window.localStorage.getItem(TELEMETRY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobSearchTelemetryEntry[]) : [];
  } catch {
    return [];
  }
}
