/**
 * Server-Side Rate Limiter
 *
 * In-memory rate limiting for API requests. Enforces two independent limits:
 * 1. Daily Conversation Limit - Max new conversations per IP per day (resets at midnight)
 * 2. Per-Conversation Message Limit - Max messages per conversation (never resets)
 *
 * Architecture:
 * - Uses a global Map for in-memory storage (persists across requests in Node.js)
 * - Counters use optimistic locking pattern: check → process → confirm
 * - Daily limits reset at midnight in configured timezone (default: Asia/Kolkata)
 * - Per-conversation limits use 30-day TTL to prevent memory bloat
 *
 * Note: This is in-memory storage and resets on server restart/redeploy.
 *
 * @module lib/rateLimiter
 * @see {@link ./chat/constants.ts} for limit values
 * @see {@link ./ip.ts} for IP extraction
 * @see {@link ../app/api/chat/route.ts} for usage in API
 */

import { DateTime } from "luxon";

import {
  DAILY_CHAT_LIMIT,
  MESSAGES_PER_CHAT_LIMIT,
} from "@/lib/chat/constants";

// Log initialization for debugging (appears in server logs)
console.log("⚡ RateLimiter init | Mode: in-memory");

// ============================================================================
// In-Memory Storage
// ============================================================================

/**
 * Entry in the rate limit store.
 * @property value - Current counter value
 * @property expiresAt - Unix timestamp when this entry expires
 */
type MemoryEntry = {
  value: number;
  expiresAt: number;
};

/**
 * Global singleton store for rate limit counters.
 *
 * Uses the global object to persist across hot reloads in development
 * and across different API route handlers in production.
 *
 * Note: In Edge runtime, this only works per-isolate (not globally persistent).
 */
const globalStore = global as unknown as {
  _rateLimitStore: Map<string, MemoryEntry>;
};
if (!globalStore._rateLimitStore) {
  globalStore._rateLimitStore = new Map<string, MemoryEntry>();
}
const memoryStore = globalStore._rateLimitStore;

// ============================================================================
// Timezone Configuration
// ============================================================================

/**
 * Timezone used for daily reset calculations.
 * Configurable via RATE_LIMIT_TIMEZONE env var.
 * Default: Asia/Kolkata (IST) for consistent midnight resets.
 */
const configuredTimezone = process.env.RATE_LIMIT_TIMEZONE || "Asia/Kolkata";
const RESET_TIMEZONE = (() => {
  const probe = DateTime.now().setZone(configuredTimezone, {
    keepLocalTime: false,
  });
  if (!probe.isValid) {
    console.warn(
      `⚠️ RateLimiter: Invalid timezone "${configuredTimezone}", using UTC`,
    );
    return "UTC";
  }
  return configuredTimezone;
})();

type StrictResetMetadata = {
  resetAt: string;
  secondsUntilReset: number;
};

type ResetMetadata = {
  resetAt: string | null;
  secondsUntilReset: number | null;
};

const getLimitZoneNow = () =>
  DateTime.now().setZone(RESET_TIMEZONE, { keepLocalTime: false });

const getNextMidnightReset = (): StrictResetMetadata => {
  const zonedNow = getLimitZoneNow();
  const nextMidnight = zonedNow.startOf("day").plus({ days: 1 });
  const secondsUntilReset = Math.max(
    1,
    Math.ceil(nextMidnight.diff(zonedNow, "seconds").seconds),
  );
  const resetInstant = nextMidnight.toUTC();
  const resetIso =
    resetInstant.toISO() ?? new Date(resetInstant.toMillis()).toISOString();
  return {
    resetAt: resetIso,
    secondsUntilReset,
  };
};

function incrementCounter(key: string, ttlSeconds: number): number {
  const shortKey = key.split(":").slice(-2).join(":");
  const existing = memoryStore.get(key);
  const expiration = Date.now() + ttlSeconds * 1000;

  if (!existing || existing.expiresAt < Date.now()) {
    memoryStore.set(key, { value: 1, expiresAt: expiration });
    console.log(`📊 Rate +1 | ${shortKey} → 1 (new)`);
    return 1;
  }

  const value = existing.value + 1;
  memoryStore.set(key, { value, expiresAt: existing.expiresAt });
  console.log(`📊 Rate +1 | ${shortKey} → ${value}`);
  return value;
}

function getCounter(key: string): number {
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    return 0;
  }
  return entry.value;
}

export class RateLimitError extends Error {
  status = 429;
  code: "CONVERSATION_LIMIT" | "CHAT_LIMIT";
  remaining: number;

  constructor(
    message: string,
    code: RateLimitError["code"],
    remaining: number,
  ) {
    super(message);
    this.code = code;
    this.remaining = remaining;
  }
}

const conversationKey = (ip: string, dateKey: string) =>
  `chat:daily:${ip}:${dateKey}`;
const chatKey = (ip: string, conversationId: string) =>
  `chat:conversation:${ip}:${conversationId}`;

// TTL for chat-per-conversation: 30 days (effectively permanent, but prevents memory bloat)
const CHAT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Check if user can start a new conversation (doesn't increment yet).
 * Call confirmNewConversation() after successful AI response.
 */
export function checkCanStartConversation(ip: string) {
  const dateKey = new Date().toISOString().substring(0, 10);
  const key = conversationKey(ip, dateKey);
  const usage = getCounter(key);

  if (usage >= DAILY_CHAT_LIMIT) {
    throw new RateLimitError(
      "Daily conversation limit reached",
      "CONVERSATION_LIMIT",
      0,
    );
  }

  return {
    used: usage,
    remaining: DAILY_CHAT_LIMIT - usage,
  };
}

/**
 * Confirm a new conversation was successfully started (increments counter).
 * Only call after AI responds successfully.
 */
export function confirmNewConversation(ip: string) {
  const dateKey = new Date().toISOString().substring(0, 10);
  const key = conversationKey(ip, dateKey);
  const { secondsUntilReset } = getNextMidnightReset();
  const usage = incrementCounter(key, secondsUntilReset);

  return {
    used: usage,
    remaining: Math.max(0, DAILY_CHAT_LIMIT - usage),
  };
}

/**
 * Check if user can send a message in this conversation (doesn't increment yet).
 * Call confirmMessageSent() after successful AI response.
 */
export function checkCanSendMessage(ip: string, conversationId: string) {
  const key = chatKey(ip, conversationId);
  const usage = getCounter(key);

  if (usage >= MESSAGES_PER_CHAT_LIMIT) {
    throw new RateLimitError(
      "Message limit for this chat reached",
      "CHAT_LIMIT",
      0,
    );
  }

  return {
    used: usage,
    remaining: MESSAGES_PER_CHAT_LIMIT - usage,
  };
}

/**
 * Confirm a message was successfully sent (increments counter).
 * Only call after AI responds successfully.
 * Uses 30-day TTL (effectively permanent per conversation).
 */
export function confirmMessageSent(ip: string, conversationId: string) {
  const key = chatKey(ip, conversationId);
  const usage = incrementCounter(key, CHAT_TTL_SECONDS); // 30 days, not midnight!

  return {
    used: usage,
    remaining: Math.max(0, MESSAGES_PER_CHAT_LIMIT - usage),
  };
}

// Legacy functions for backward compatibility
export function assertCanStartChat(ip: string) {
  return checkCanStartConversation(ip);
}

export function assertCanSendMessage(ip: string, conversationId: string) {
  return checkCanSendMessage(ip, conversationId);
}

export function getUsageSnapshot(ip: string, conversationId?: string) {
  const dateKey = new Date().toISOString().substring(0, 10);
  const convUsage = getCounter(conversationKey(ip, dateKey));
  const midnightReset = getNextMidnightReset();

  let chatUsage = 0;
  const chatResetMeta: ResetMetadata = {
    resetAt: null,
    secondsUntilReset: null,
  }; // No reset for chat limits!
  if (conversationId) {
    const key = chatKey(ip, conversationId);
    chatUsage = getCounter(key);
    // Chat limits don't reset - leave resetAt/secondsUntilReset as null
  }

  return {
    daily: {
      limit: DAILY_CHAT_LIMIT,
      used: convUsage,
      remaining: Math.max(0, DAILY_CHAT_LIMIT - convUsage),
      ...midnightReset,
    },
    chat: {
      limit: MESSAGES_PER_CHAT_LIMIT,
      used: chatUsage,
      remaining: Math.max(0, MESSAGES_PER_CHAT_LIMIT - chatUsage),
      ...chatResetMeta,
    },
  };
}
