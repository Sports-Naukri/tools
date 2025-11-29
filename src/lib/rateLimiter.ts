import { kv } from "@vercel/kv";

import {
  CHAT_TTL_SECONDS,
  DAILY_CHAT_LIMIT,
  MESSAGES_PER_CHAT_LIMIT,
} from "@/lib/chat/constants";

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

const nowUtc = () => new Date();

const secondsUntilUtcMidnight = () => {
  const now = nowUtc();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = Math.max(0, (end.getTime() - now.getTime()) / 1000);
  return Math.ceil(diff);
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
  const usage = await incrementCounter(key, secondsUntilUtcMidnight());

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
  const usage = await incrementCounter(key, CHAT_TTL_SECONDS);

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
  const chatUsage = conversationId ? await getCounter(chatKey(ip, conversationId)) : 0;

  return {
    daily: {
      limit: DAILY_CHAT_LIMIT,
      used: dailyUsage,
      remaining: Math.max(0, DAILY_CHAT_LIMIT - dailyUsage),
    },
    chat: {
      limit: MESSAGES_PER_CHAT_LIMIT,
      used: chatUsage,
      remaining: Math.max(0, MESSAGES_PER_CHAT_LIMIT - chatUsage),
    },
  };
}
