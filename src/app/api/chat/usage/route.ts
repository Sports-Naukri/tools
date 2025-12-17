/**
 * Rate Limit Usage Status API
 *
 * Returns the current rate limit status for a user (identified by IP).
 * Used by the client to display remaining quota and disable inputs when limits are reached.
 *
 * Response includes:
 * - Daily conversation limit status (resets at midnight)
 * - Per-conversation message limit status (never resets)
 *
 * @route GET /api/chat/usage?conversationId=xxx
 * @module app/api/chat/usage/route
 */

import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/ip";
import { getUsageSnapshot } from "@/lib/rateLimiter";

// ============================================================================
// Runtime Configuration
// ============================================================================

export const runtime = "nodejs";
export const preferredRegion = ["bom1", "sin1", "fra1"];

// ============================================================================
// GET Handler
// ============================================================================

/**
 * Returns current rate limit usage for the requesting IP.
 *
 * @param req - Request with optional ?conversationId query param
 * @returns UsageSnapshot with daily and per-chat limit status
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId") ?? undefined;

  // Get IP for rate limit lookup
  const ip = getClientIp(req.headers);

  // Get current usage from in-memory store
  const usage = await getUsageSnapshot(ip, conversationId);

  return NextResponse.json(usage);
}
