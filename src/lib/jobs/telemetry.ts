/**
 * Job Search Telemetry Tracking
 * 
 * Client-side telemetry for tracking job search quality.
 * Records searches with low result counts or fallback triggers
 * to localStorage for analysis.
 * 
 * Purpose:
 * - Track when searches return < 3 results
 * - Track when fallback (broadened) search is triggered
 * - Help identify search quality issues
 * 
 * Data is stored locally and never sent to external services.
 * 
 * @module lib/jobs/telemetry
 * @see {@link ../../components/chat/JobCard.tsx} for usage
 */

import type { JobResponseMeta } from "./types";

// ============================================================================
// Configuration
// ============================================================================

/** LocalStorage key for telemetry data */
const TELEMETRY_KEY = "sn-job-search-telemetry";

/** Maximum number of telemetry entries to keep (FIFO) */
const MAX_ENTRIES = 20;

// ============================================================================
// Types
// ============================================================================

/**
 * Single telemetry entry stored in localStorage.
 * Only records "interesting" events (low results, fallback searches).
 */
type JobSearchTelemetryEntry = {
  /** Unique request ID */
  id: string;
  /** Conversation this search belonged to */
  conversationId?: string;
  /** When the search occurred */
  timestamp: string;
  /** True if fallback search was triggered */
  broadenedSearch?: boolean;
  /** Number of results if < 3 */
  lowResultCount?: number;
  /** Number of results requested by user */
  requestedCount?: number;
};

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Records a job search event to telemetry if it meets recording criteria.
 * 
 * Recording criteria:
 * - Search had broadenedSearch flag (fallback was triggered), OR
 * - Search returned < 3 results
 * 
 * Duplicate entries (same telemetryId) are ignored.
 * 
 * @param meta - Response metadata from job search
 */
export function recordJobSearchTelemetry(meta?: JobResponseMeta) {
  // Only run in browser
  if (typeof window === "undefined") {
    return;
  }

  // Must have telemetry ID
  if (!meta?.telemetryId) {
    return;
  }

  // Only record "interesting" events
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

  // Avoid duplicates
  const existing = readTelemetry();
  if (existing.some((entry) => entry.id === payload.id)) {
    return;
  }

  // Add new entry, keep most recent MAX_ENTRIES
  const next = [payload, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
}

/**
 * Retrieves telemetry entries from localStorage.
 * 
 * @param limit - Maximum number of entries to return (default: 20)
 * @returns Array of telemetry entries, newest first
 */
export function getJobSearchTelemetry(limit = MAX_ENTRIES): JobSearchTelemetryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  return readTelemetry().slice(0, limit);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Reads and parses telemetry from localStorage.
 * Returns empty array on parse errors.
 */
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

