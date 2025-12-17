/**
 * Client-Side Rate Limiter
 *
 * Enforces usage limits using IndexedDB for persistence.
 * Rules:
 * - Max 40 messages globally per 12 hours
 * - Cooldown when limit is exceeded
 *
 * @module lib/chat/clientRateLimiter
 */

import { COOLDOWN_DURATION_MS, GLOBAL_MESSAGE_LIMIT } from "./constants";
import { chatDb } from "./storage";

// ============================================================================
// Types
// ============================================================================

/**
 * Stored rate limit state in IndexedDB.
 */
export type RateLimitState = {
  /** Always "singleton" - single record */
  id: "singleton";
  /** Total messages sent in current window */
  messageCount: number;
  /** Unix timestamp when cooldown ends (0 = no cooldown) */
  cooldownEndsAt: number;
  /** Last time state was updated */
  updatedAt: string;
};

export type RateLimitStatus = {
  /** Whether the user can perform actions */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: "message_limit" | "cooldown";
  /** Remaining messages globally */
  messagesRemaining: number;
  /** Cooldown end time (ISO string) if in cooldown */
  cooldownEndsAt?: string;
  /** Seconds until cooldown ends */
  cooldownSecondsRemaining?: number;
};

// ============================================================================
// State Management
// ============================================================================

/**
 * Gets the current rate limit state from IndexedDB.
 */
async function getState(): Promise<RateLimitState> {
  const state = await chatDb.rateLimitState.get("singleton");

  // Migration or Init
  if (!state || typeof state.messageCount !== "number") {
    const initial: RateLimitState = {
      id: "singleton",
      messageCount: 0,
      cooldownEndsAt: state?.cooldownEndsAt || 0,
      updatedAt: new Date().toISOString(),
    };
    await chatDb.rateLimitState.put(initial);
    return initial;
  }

  return state;
}

/**
 * Updates the rate limit state in IndexedDB.
 */
async function updateState(
  updates: Partial<Omit<RateLimitState, "id">>,
): Promise<RateLimitState> {
  const current = await getState();
  const updated: RateLimitState = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await chatDb.rateLimitState.put(updated);
  return updated;
}

/**
 * Triggers a 12-hour cooldown.
 */
async function triggerCooldown(): Promise<void> {
  const cooldownEndsAt = Date.now() + COOLDOWN_DURATION_MS;
  await updateState({ cooldownEndsAt });
  console.log(
    `⏳ Cooldown triggered until ${new Date(cooldownEndsAt).toISOString()}`,
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Checks if user is currently in cooldown.
 */
export async function isInCooldown(): Promise<{
  inCooldown: boolean;
  endsAt?: string;
  secondsRemaining?: number;
}> {
  const state = await getState();
  const now = Date.now();

  if (state.cooldownEndsAt > now) {
    return {
      inCooldown: true,
      endsAt: new Date(state.cooldownEndsAt).toISOString(),
      secondsRemaining: Math.ceil((state.cooldownEndsAt - now) / 1000),
    };
  }

  // Cooldown expired - reset state if needed
  if (state.cooldownEndsAt > 0) {
    await updateState({
      cooldownEndsAt: 0,
      messageCount: 0,
    });
  }

  return { inCooldown: false };
}

/**
 * Gets the current rate limit status.
 */
export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  const cooldownCheck = await isInCooldown();

  if (cooldownCheck.inCooldown) {
    return {
      allowed: false,
      reason: "cooldown",
      messagesRemaining: 0,
      cooldownEndsAt: cooldownCheck.endsAt,
      cooldownSecondsRemaining: cooldownCheck.secondsRemaining,
    };
  }

  const state = await getState();
  const messagesRemaining = Math.max(
    0,
    GLOBAL_MESSAGE_LIMIT - state.messageCount,
  );

  return {
    allowed: true,
    messagesRemaining,
  };
}

/**
 * Checks if user can start a new conversation.
 * Always true unless in cooldown (limits are on messages now).
 */
export async function canStartConversation(): Promise<{
  allowed: boolean;
  remaining: number; // For compatibility
  reason?: "cooldown";
}> {
  const cooldownCheck = await isInCooldown();
  if (cooldownCheck.inCooldown) {
    return { allowed: false, remaining: 0, reason: "cooldown" };
  }

  return { allowed: true, remaining: 999 };
}

/**
 * Records a new message sent by the user.
 * Increments the global message counter.
 */
export async function recordMessage(): Promise<{
  messageCount: number;
  remaining: number;
}> {
  const state = await getState();
  const newCount = state.messageCount + 1;
  await updateState({ messageCount: newCount });

  console.log(`📊 Message recorded: ${newCount}/${GLOBAL_MESSAGE_LIMIT}`);

  if (newCount >= GLOBAL_MESSAGE_LIMIT) {
    await triggerCooldown();
  }

  return {
    messageCount: newCount,
    remaining: Math.max(0, GLOBAL_MESSAGE_LIMIT - newCount),
  };
}

/**
 * Checks if user can send a message.
 * Checks global message limit.
 */
export async function canSendMessage(): Promise<{
  allowed: boolean;
  remaining: number;
  reason?: "message_limit" | "cooldown";
}> {
  const cooldownCheck = await isInCooldown();
  if (cooldownCheck.inCooldown) {
    return { allowed: false, remaining: 0, reason: "cooldown" };
  }

  const state = await getState();
  const remaining = Math.max(0, GLOBAL_MESSAGE_LIMIT - state.messageCount);

  if (remaining <= 0) {
    await triggerCooldown();
    return { allowed: false, remaining: 0, reason: "message_limit" };
  }

  return { allowed: true, remaining };
}

/**
 * Clears rate limit state (for testing/admin).
 */
export async function clearRateLimitState(): Promise<void> {
  await chatDb.rateLimitState.delete("singleton");
  console.log("🗑️ Rate limit state cleared");
}

/**
 * Gets a UsageSnapshot compatible with existing UI components.
 */
export async function getClientUsageSnapshot(): Promise<{
  daily: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string | null;
    secondsUntilReset: number | null;
  };
  chat: {
    // Keeping structure but mapping to global limits
    limit: number;
    used: number;
    remaining: number;
    resetAt: string | null;
    secondsUntilReset: number | null;
  };
}> {
  const cooldownCheck = await isInCooldown();
  const state = await getState();

  const used = state.messageCount;
  const remaining = cooldownCheck.inCooldown
    ? 0
    : Math.max(0, GLOBAL_MESSAGE_LIMIT - used);

  const snapshot = {
    limit: GLOBAL_MESSAGE_LIMIT,
    used,
    remaining,
    resetAt: cooldownCheck.endsAt ?? null,
    secondsUntilReset: cooldownCheck.secondsRemaining ?? null,
  };

  // Map both daily and chat limits to the same global message limit
  // so the UI reflects the single constraint everywhere
  return {
    daily: snapshot,
    chat: {
      ...snapshot,
      resetAt: null, // Explicit null for chat specific structure if verified
    },
  };
}
