import { kv } from "@vercel/kv";
import { DateTime } from "luxon";

import { DAILY_CHAT_LIMIT, MESSAGES_PER_CHAT_LIMIT } from "@/lib/chat/constants";

const hasKvConfig =
  Boolean(process.env.KV_REST_API_URL) &&
  Boolean(process.env.KV_REST_API_TOKEN);

console.log("[RateLimiter] Initialized. KV Configured:", hasKvConfig);

type MemoryEntry = {
  value: number;
  expiresAt: number;
};

// Use a global singleton to share state across different route handlers in local development (Node.js runtime).
// In Edge runtime, this global is not shared across isolates, so this fallback only works per-isolate.
const globalStore = global as unknown as { _rateLimitStore: Map<string, MemoryEntry> };
if (!globalStore._rateLimitStore) {
  globalStore._rateLimitStore = new Map<string, MemoryEntry>();
}
const memoryStore = globalStore._rateLimitStore;

// Use a single timezone so “midnight reset” behaves consistently for every user.
const configuredTimezone = process.env.RATE_LIMIT_TIMEZONE || "Asia/Kolkata";
const RESET_TIMEZONE = (() => {
  const probe = DateTime.now().setZone(configuredTimezone, { keepLocalTime: false });
  if (!probe.isValid) {
    console.warn(
      `[RateLimiter] Invalid RATE_LIMIT_TIMEZONE "${configuredTimezone}". Falling back to UTC.`
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

const getLimitZoneNow = () => DateTime.now().setZone(RESET_TIMEZONE, { keepLocalTime: false });

const getNextMidnightReset = (): StrictResetMetadata => {
  const zonedNow = getLimitZoneNow();
  const nextMidnight = zonedNow.startOf("day").plus({ days: 1 });
  const secondsUntilReset = Math.max(1, Math.ceil(nextMidnight.diff(zonedNow, "seconds").seconds));
  return {
    resetAt: nextMidnight.toUTC().toISO(),
    secondsUntilReset,
  };
};

const buildResetMetadata = (seconds: number | null): ResetMetadata => {
  if (seconds == null) {
    return { resetAt: null, secondsUntilReset: null };
  }
  const clamped = Math.max(0, Math.ceil(seconds));
  const resetInstant = DateTime.utc().plus({ seconds: clamped });
  return {
    resetAt: resetInstant.toISO(),
    secondsUntilReset: clamped,
  };
};

async function incrementCounter(key: string, ttlSeconds: number) {
  console.log(`[RateLimiter] Incrementing counter for key: ${key}`);
  if (hasKvConfig) {
    const newValue = await kv.incr(key);
    if (newValue === 1) {
      await kv.expire(key, ttlSeconds);
    }
    console.log(`[RateLimiter] KV increment result: ${newValue}`);
    return newValue;
  }

  const existing = memoryStore.get(key);
  const expiration = Date.now() + ttlSeconds * 1000;

  if (!existing || existing.expiresAt < Date.now()) {
    memoryStore.set(key, { value: 1, expiresAt: expiration });
    console.log(`[RateLimiter] Memory init result: 1`);
    return 1;
  }

  const value = existing.value + 1;
  memoryStore.set(key, { value, expiresAt: existing.expiresAt });
  console.log(`[RateLimiter] Memory increment result: ${value}`);
  return value;
}

async function getCounter(key: string) {
  console.log(`[RateLimiter] Getting counter for key: ${key}`);
  if (hasKvConfig) {
    const val = (await kv.get<number>(key)) ?? 0;
    console.log(`[RateLimiter] KV get result: ${val}`);
    return val;
  }

  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    console.log(`[RateLimiter] Memory get result: 0 (missing or expired)`);
    return 0;
  }
  console.log(`[RateLimiter] Memory get result: ${entry.value}`);
  return entry.value;
}

async function getSecondsUntilExpiration(key: string) {
  if (hasKvConfig) {
    try {
      const kvWithTtl = kv as typeof kv & { ttl?: (targetKey: string) => Promise<number | null> };
      if (typeof kvWithTtl.ttl === "function") {
        const ttl = await kvWithTtl.ttl(key);
        if (typeof ttl === "number" && ttl >= 0) {
          return ttl;
        }
        return null;
      }
    } catch (error) {
      console.warn(`[RateLimiter] Failed to read TTL for ${key}`, error);
      return null;
    }
  }

  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }
  const remainingMs = entry.expiresAt - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

export class RateLimitError extends Error {
  status = 429;
  code: "DAILY_LIMIT" | "CHAT_LIMIT";
  remaining: number;

  constructor(message: string, code: RateLimitError["code"], remaining: number) {
    super(message);
    this.code = code;
    this.remaining = remaining;
  }
}

const dailyKey = (ip: string, dateKey: string) => `chat:daily:${ip}:${dateKey}`;
const chatKey = (ip: string, conversationId: string) =>
  `chat:conversation:${ip}:${conversationId}`;

export async function assertCanStartChat(ip: string) {
  const dateKey = new Date().toISOString().substring(0, 10);
  const key = dailyKey(ip, dateKey);
  const { secondsUntilReset } = getNextMidnightReset();
  const usage = await incrementCounter(key, secondsUntilReset);

  if (usage > DAILY_CHAT_LIMIT) {
    throw new RateLimitError(
      "Daily chat limit reached",
      "DAILY_LIMIT",
      Math.max(0, DAILY_CHAT_LIMIT - usage)
    );
  }

  return {
    used: usage,
    remaining: Math.max(0, DAILY_CHAT_LIMIT - usage),
  };
}

export async function assertCanSendMessage(ip: string, conversationId: string) {
  const key = chatKey(ip, conversationId);
  const { secondsUntilReset } = getNextMidnightReset();
  const usage = await incrementCounter(key, secondsUntilReset);

  if (usage > MESSAGES_PER_CHAT_LIMIT) {
    throw new RateLimitError(
      "Message limit for this chat reached",
      "CHAT_LIMIT",
      Math.max(0, MESSAGES_PER_CHAT_LIMIT - usage)
    );
  }

  return {
    used: usage,
    remaining: Math.max(0, MESSAGES_PER_CHAT_LIMIT - usage),
  };
}

export async function getUsageSnapshot(ip: string, conversationId?: string) {
  const dateKey = new Date().toISOString().substring(0, 10);
  const dailyUsage = await getCounter(dailyKey(ip, dateKey));
  const midnightReset = getNextMidnightReset();

  let chatUsage = 0;
  let chatResetMeta: ResetMetadata = midnightReset;
  if (conversationId) {
    const key = chatKey(ip, conversationId);
    chatUsage = await getCounter(key);
    const ttl = await getSecondsUntilExpiration(key);
    chatResetMeta = ttl == null ? midnightReset : buildResetMetadata(ttl);
  }

  return {
    daily: {
      limit: DAILY_CHAT_LIMIT,
      used: dailyUsage,
      remaining: Math.max(0, DAILY_CHAT_LIMIT - dailyUsage),
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
