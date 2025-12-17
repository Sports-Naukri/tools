/**
 * Resume Profile Storage
 *
 * IndexedDB-based storage for extracted resume profiles using Dexie.
 * Stores globally (one profile shared across all conversations).
 *
 * Features:
 * - Single profile storage (one resume at a time)
 * - Upload tracking for rate limiting (3/day)
 * - Toggle state for context injection
 */

import Dexie, { type Table } from "dexie";
import type { ExtractedProfile } from "./types";

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Profile storage record
 */
interface StoredProfile {
  /** Always "global" for single-profile storage */
  id: "global";
  profile: ExtractedProfile;
  /** Whether to inject this profile into Navigator context */
  contextEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Upload record for rate limiting
 */
interface StoredUpload {
  id: string;
  fileName: string;
  uploadedAt: string;
}

// ============================================================================
// Database Setup
// ============================================================================

class ResumeDatabase extends Dexie {
  profiles!: Table<StoredProfile, "global">;
  uploads!: Table<StoredUpload, string>;

  constructor() {
    super("sportsnaukri-resume");
    this.version(1).stores({
      profiles: "&id, updatedAt",
      uploads: "&id, uploadedAt",
    });
  }
}

export const resumeDb = new ResumeDatabase();

// ============================================================================
// Profile Operations
// ============================================================================

/**
 * Save extracted profile to storage
 */
export async function saveProfile(profile: ExtractedProfile): Promise<void> {
  const now = new Date().toISOString();
  await resumeDb.profiles.put({
    id: "global",
    profile,
    contextEnabled: true, // Default to enabled when first uploaded
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Get the stored profile (if any)
 */
export async function getProfile(): Promise<ExtractedProfile | null> {
  const stored = await resumeDb.profiles.get("global");
  return stored?.profile ?? null;
}

/**
 * Check if a profile exists
 */
export async function hasProfile(): Promise<boolean> {
  const count = await resumeDb.profiles.count();
  return count > 0;
}

/**
 * Delete the stored profile
 */
export async function deleteProfile(): Promise<void> {
  await resumeDb.profiles.delete("global");
}

/**
 * Check if context injection is enabled
 */
export async function isContextEnabled(): Promise<boolean> {
  const stored = await resumeDb.profiles.get("global");
  return stored?.contextEnabled ?? false;
}

/**
 * Toggle context injection on/off
 */
export async function setContextEnabled(enabled: boolean): Promise<void> {
  const stored = await resumeDb.profiles.get("global");
  if (stored) {
    await resumeDb.profiles.put({
      ...stored,
      contextEnabled: enabled,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Rate Limiting (3 uploads per day)
// ============================================================================

const UPLOADS_PER_DAY = 3;

/**
 * Get today's upload count
 */
export async function getTodayUploadCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const uploads = await resumeDb.uploads
    .where("uploadedAt")
    .aboveOrEqual(todayIso)
    .toArray();

  return uploads.length;
}

/**
 * Check if user can upload (under rate limit)
 */
export async function canUpload(): Promise<boolean> {
  const count = await getTodayUploadCount();
  return count < UPLOADS_PER_DAY;
}

/**
 * Get remaining uploads for today
 */
export async function getRemainingUploads(): Promise<number> {
  const count = await getTodayUploadCount();
  return Math.max(0, UPLOADS_PER_DAY - count);
}

/**
 * Record an upload (for rate limiting)
 */
export async function recordUpload(fileName: string): Promise<void> {
  await resumeDb.uploads.add({
    id: crypto.randomUUID(),
    fileName,
    uploadedAt: new Date().toISOString(),
  });
}

/**
 * Clean up old upload records (older than 24 hours)
 */
export async function cleanupOldUploads(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = yesterday.toISOString();

  await resumeDb.uploads.where("uploadedAt").below(cutoff).delete();
}
