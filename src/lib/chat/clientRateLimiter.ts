/**
 * Client-Side Rate Limiter (IndexedDB)
 *
 * Concept (as requested):
 * - Single record in IndexedDB holding: messagesLeft + lastMessageAt
 * - Every user message decrements messagesLeft and updates lastMessageAt
 * - Reset rule: if NO new message is sent for the full window duration (12h),
 *   reset messagesLeft back to limit.
 *
 * This is different from a rolling-window limiter; it's an "inactivity reset" limiter.
 */

import { COOLDOWN_DURATION_MS, GLOBAL_MESSAGE_LIMIT } from "./constants";
import { chatDb } from "./storage";

type RateLimitRow = {
  id: "singleton";
  messagesLeft: number;
  lastMessageAt: number; // ms since epoch (0 = never)
  createdAt: string;
  updatedAt: string;
};

export type RateLimitStatus = {
  allowed: boolean;
  reason?: "message_limit";
  messagesRemaining: number;
};

function nowIso() {
  return new Date().toISOString();
}

async function getOrInitRateLimit(): Promise<RateLimitRow> {
  const existing = (await chatDb.rateLimit.get("singleton")) as
    | RateLimitRow
    | undefined;

  if (existing) return existing;

  const initial: RateLimitRow = {
    id: "singleton",
    messagesLeft: GLOBAL_MESSAGE_LIMIT,
    lastMessageAt: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await chatDb.rateLimit.put(initial);
  return initial;
}

async function maybeReset(
  row: RateLimitRow,
  now = Date.now(),
): Promise<RateLimitRow> {
  // Never sent a message => already fresh
  if (row.lastMessageAt === 0) return row;

  const inactiveForMs = now - row.lastMessageAt;
  if (inactiveForMs < COOLDOWN_DURATION_MS) return row;

  // Inactivity window passed => full reset
  // Keep lastMessageAt as the timestamp that completed the previous window.
  // This prevents subsequent reads from immediately looking "fresh" (0) and
  // helps debugging/telemetry while still allowing full usage again.
  const reset: RateLimitRow = {
    ...row,
    messagesLeft: GLOBAL_MESSAGE_LIMIT,
    lastMessageAt: row.lastMessageAt,
    updatedAt: nowIso(),
  };
  await chatDb.rateLimit.put(reset);
  return reset;
}

export async function canSendMessage(): Promise<{
  allowed: boolean;
  remaining: number;
  reason?: "message_limit";
}> {
  const now = Date.now();
  const row = await maybeReset(await getOrInitRateLimit(), now);
  const remaining = Math.max(0, row.messagesLeft);

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, reason: "message_limit" };
  }

  return { allowed: true, remaining };
}

export async function recordMessage(): Promise<{
  messageCount: number;
  remaining: number;
}> {
  const now = Date.now();
  const row = await maybeReset(await getOrInitRateLimit(), now);

  const nextLeft = Math.max(0, row.messagesLeft - 1);
  const updated: RateLimitRow = {
    ...row,
    messagesLeft: nextLeft,
    lastMessageAt: now,
    updatedAt: nowIso(),
  };
  await chatDb.rateLimit.put(updated);

  return {
    messageCount: GLOBAL_MESSAGE_LIMIT - updated.messagesLeft,
    remaining: updated.messagesLeft,
  };
}

export async function clearRateLimitState(): Promise<void> {
  await chatDb.rateLimit.delete("singleton");
}

export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  const now = Date.now();
  const row = await maybeReset(await getOrInitRateLimit(), now);
  return {
    allowed: row.messagesLeft > 0,
    reason: row.messagesLeft > 0 ? undefined : "message_limit",
    messagesRemaining: row.messagesLeft,
  };
}

export async function canStartConversation(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  // Starting chats is allowed; actual gating happens on message send.
  return { allowed: true, remaining: 999 };
}

export async function isInCooldown(): Promise<{
  inCooldown: boolean;
  endsAt?: string;
  secondsRemaining?: number;
}> {
  const now = Date.now();
  const row = await getOrInitRateLimit();
  if (row.messagesLeft > 0 || row.lastMessageAt === 0) {
    return { inCooldown: false };
  }

  const endsAtMs = row.lastMessageAt + COOLDOWN_DURATION_MS;
  if (endsAtMs <= now) {
    await maybeReset(row, now);
    return { inCooldown: false };
  }

  return {
    inCooldown: true,
    endsAt: new Date(endsAtMs).toISOString(),
    secondsRemaining: Math.ceil((endsAtMs - now) / 1000),
  };
}

export async function getClientUsageSnapshot(): Promise<{
  daily: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string | null;
    secondsUntilReset: number | null;
  };
  chat: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string | null;
    secondsUntilReset: number | null;
  };
}> {
  const now = Date.now();
  const row = await maybeReset(await getOrInitRateLimit(), now);

  const used = GLOBAL_MESSAGE_LIMIT - row.messagesLeft;
  const remaining = row.messagesLeft;

  let resetAt: string | null = null;
  let secondsUntilReset: number | null = null;

  if (row.messagesLeft <= 0 && row.lastMessageAt > 0) {
    const endsAtMs = row.lastMessageAt + COOLDOWN_DURATION_MS;
    if (endsAtMs > now) {
      resetAt = new Date(endsAtMs).toISOString();
      secondsUntilReset = Math.ceil((endsAtMs - now) / 1000);
    } else {
      // Safety: if time already elapsed, ensure stored state resets.
      await maybeReset(row, now);
    }
  } else if (row.lastMessageAt > 0) {
    // Even if not at limit, show when you'd be fully reset if you stop messaging
    const endsAtMs = row.lastMessageAt + COOLDOWN_DURATION_MS;
    if (endsAtMs > now) {
      resetAt = new Date(endsAtMs).toISOString();
      secondsUntilReset = Math.ceil((endsAtMs - now) / 1000);
    } else {
      await maybeReset(row, now);
    }
  }

  const snapshot = {
    limit: GLOBAL_MESSAGE_LIMIT,
    used,
    remaining,
    resetAt,
    secondsUntilReset,
  };

  return { daily: snapshot, chat: snapshot };
}
