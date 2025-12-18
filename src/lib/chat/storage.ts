/**
 * Chat Storage Layer (IndexedDB)
 *
 * Client-side persistence for conversations, messages, and usage snapshots.
 * Uses Dexie.js as a wrapper around IndexedDB for easier async operations.
 *
 * Features:
 * - Conversation CRUD operations
 * - Message storage with streaming support
 * - Usage snapshot caching (for offline rate limit display)
 * - Automatic message count tracking
 *
 * Database Schema (v2):
 * - conversations: id (PK), createdAt, updatedAt
 * - messages: id (PK), conversationId (indexed), createdAt
 * - usageSnapshots: conversationId (PK), updatedAt
 *
 * @module lib/chat/storage
 * @see {@link https://dexie.org} for Dexie documentation
 * @see {@link ../resume/storage.ts} for resume-specific storage
 */

import type { UIMessage } from "@ai-sdk/react";
import Dexie, { type Table } from "dexie";

import type { CanvasDocument } from "@/lib/canvas/documents";
import type { UsageSnapshot } from "@/lib/chat/types";

// ============================================================================
// Stored Types (Database Representations)
// ============================================================================

/**
 * Database representation of a file attachment.
 * Simplified from AttachmentPreview - only persisted fields.
 */
export type StoredAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Blob URL or server URL */
  url?: string;
};

/** Type alias for message parts from AI SDK */
type SerializedMessagePart = NonNullable<UIMessage["parts"]>[number];

/**
 * Database representation of an AI tool invocation.
 * Stores the state and results of tools like job search, document generation.
 */
export type StoredToolInvocation = {
  /** Current state of the tool call */
  state: "result" | "call" | "partial-call";
  /** Unique identifier for this tool call */
  toolCallId: string;
  /** Name of the tool (e.g., "searchJobs", "generateDocument") */
  toolName: string;
  /** Arguments passed to the tool */
  args: unknown;
  /** Result returned by the tool (if completed) */
  result?: unknown;
};

/**
 * Agent types that can respond to messages.
 * - jay: Document creation, resume writing assistant
 * - navigator: Job search and career guidance assistant
 */
export type AgentRole = "jay" | "navigator";

/**
 * Message sender types.
 * - user: Human user
 * - jay/navigator: AI agents
 * - system: Hidden system messages for context
 */
export type MessageRole = "user" | AgentRole | "system";

/**
 * Database representation of a chat message.
 *
 * Includes all data needed to restore a message with its attachments,
 * generated documents, and tool call results.
 */
export type StoredMessage = {
  /** UUID v4 identifier */
  id: string;
  /** Foreign key to conversation */
  conversationId: string;
  /** Who sent this message */
  role: MessageRole;
  /** Plain text or markdown content */
  content: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** File attachments included with the message */
  attachments?: StoredAttachment[];
  /** Generated documents (from canvas tool) */
  documents?: CanvasDocument[];
  /** AI tool call data (job search, etc.) */
  toolInvocations?: StoredToolInvocation[];
  /** Multi-part message content from AI SDK */
  parts?: SerializedMessagePart[];
  /** Error message if message failed to process */
  error?: string | null;
  /** Token count for this message (for analytics) */
  tokenCount?: number;
  /** User feedback: 1 = thumbs up, -1 = thumbs down, 0 = none */
  feedback?: -1 | 0 | 1;
  /** Arbitrary metadata (e.g. agent identity) */
  data?: Record<string, unknown>;
};

/**
 * Database representation of a conversation.
 * Metadata only - messages are stored separately.
 */
export type StoredConversation = {
  /** UUID v4 identifier */
  id: string;
  /** Auto-generated or user-edited title */
  title: string;
  /** AI model ID used for this conversation */
  modelId: string;
  /** Which agent is primarily used (jay or navigator) */
  agentMode: AgentRole;
  /** ISO 8601 timestamp when created */
  createdAt: string;
  /** ISO 8601 timestamp of last message */
  updatedAt: string;
  /** Denormalized count for UI display */
  messageCount: number;
  /** User marked as favorite */
  isStarred?: boolean;
  /** Soft delete flag */
  isArchived?: boolean;
  /** Total tokens used in this conversation */
  totalTokens?: number;
};

/**
 * Cached usage snapshot for a conversation.
 * Allows displaying rate limit info without API calls.
 */
export type StoredUsageSnapshot = {
  /** Conversation this snapshot belongs to */
  conversationId: string;
  /** The actual usage data */
  snapshot: UsageSnapshot;
  /** When this was last updated from API */
  updatedAt: string;
};

// ============================================================================
// Database Definition
// ============================================================================

/**
 * Dexie database class for chat storage.
 *
 * Version history:
 * - v1: Initial schema with conversations and messages
 * - v2: Added usageSnapshots table for rate limit caching
 * - v3: Added rateLimitState for client-side rate limiting
 * - v4: UUID IDs, agent roles (jay/navigator), enhanced fields
 */
class ChatDatabase extends Dexie {
  /** Conversation metadata table */
  conversations!: Table<StoredConversation, string>;
  /** Message content table */
  messages!: Table<StoredMessage, string>;
  /** Usage/rate limit cache table */
  usageSnapshots!: Table<StoredUsageSnapshot, string>;
  /** Client-side rate limit state (singleton) */
  rateLimitState!: Table<
    {
      id: "singleton";
      messageCount: number;
      messageTimestamps: number[];
      cooldownEndsAt: number;
      windowStartedAt: number;
      updatedAt: string;
    },
    string
  >;

  /** Client-side rate limit snapshots for "40 messages per 12h from last message" */
  rateLimit!: Table<
    {
      id: "singleton";
      messagesLeft: number;
      lastMessageAt: number; // ms since epoch (0 means never)
      createdAt: string;
      updatedAt: string;
    },
    string
  >;

  constructor() {
    super("sportsnaukri-chat");

    // v1: Initial schema
    this.version(1).stores({
      conversations: "&id, createdAt, updatedAt",
      messages: "&id, conversationId, createdAt",
    });

    // v2: Added usage snapshot caching
    this.version(2).stores({
      conversations: "&id, createdAt, updatedAt",
      messages: "&id, conversationId, createdAt",
      usageSnapshots: "&conversationId, updatedAt",
    });

    // v3: Added client-side rate limit state
    this.version(3).stores({
      conversations: "&id, createdAt, updatedAt",
      messages: "&id, conversationId, createdAt",
      usageSnapshots: "&conversationId, updatedAt",
      rateLimitState: "&id",
    });

    // v4: Enhanced schema with agent roles and new indexes
    this.version(4)
      .stores({
        conversations: "&id, createdAt, updatedAt, agentMode, isStarred",
        messages: "&id, conversationId, createdAt, role",
        usageSnapshots: "&conversationId, updatedAt",
        rateLimitState: "&id",
        rateLimit: "&id, updatedAt",
      })
      .upgrade(async (tx) => {
        // Migrate old 'assistant' role to 'jay' (default agent)
        await tx
          .table("messages")
          .toCollection()
          .modify((message) => {
            if (message.role === "assistant") {
              message.role = "jay";
            }
          });

        // Add agentMode to existing conversations
        await tx
          .table("conversations")
          .toCollection()
          .modify((conv) => {
            if (!conv.agentMode) {
              conv.agentMode = "jay"; // Default to jay
            }
          });

        console.log("📦 Migrated to schema v4: agent roles enabled");
      });
  }
}

/** Singleton database instance */
export const chatDb = new ChatDatabase();

/**
 * Generate a UUID v4 identifier.
 * Used for all new conversations and messages.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Conversation Operations
// ============================================================================

/**
 * Creates a new conversation in the database.
 *
 * @param conversation - The conversation to create
 * @returns The created conversation
 * @throws If conversation with same ID already exists
 */
export async function createConversation(conversation: StoredConversation) {
  await chatDb.conversations.add(conversation);
  return conversation;
}

/**
 * Updates or inserts a conversation in the database.
 * More forgiving than createConversation - won't fail on duplicates.
 *
 * @param conversation - The conversation to upsert
 * @returns The upserted conversation
 */
export async function upsertConversation(conversation: StoredConversation) {
  await chatDb.conversations.put(conversation);
  return conversation;
}

/**
 * Retrieves a conversation by its ID.
 *
 * @param conversationId - The conversation ID to look up
 * @returns The conversation or undefined if not found
 */
export async function getConversation(conversationId: string) {
  return chatDb.conversations.get(conversationId);
}

/**
 * Gets the most recently updated conversation.
 * Used to restore the last active conversation on page load.
 *
 * @returns The most recent conversation or undefined
 */
export async function getLatestConversation() {
  return chatDb.conversations.orderBy("updatedAt").last();
}

/**
 * Lists conversations, ordered by most recently updated.
 * Used to populate the sidebar conversation list.
 * Only includes conversations that have messages (hides empty drafts).
 *
 * @param limit - Maximum number of conversations to return (default: 20)
 * @returns Array of conversations, newest first
 */
export async function listConversations(limit = 20) {
  return chatDb.conversations
    .orderBy("updatedAt")
    .reverse()
    .filter((conv) => conv.messageCount > 0)
    .limit(limit)
    .toArray();
}

/**
 * Updates metadata for a conversation (title, model, archived status).
 * Does nothing if conversation doesn't exist.
 *
 * @param conversationId - The conversation to update
 * @param updates - Partial updates to apply
 */
export async function updateConversationMeta(
  conversationId: string,
  updates: Partial<
    Pick<StoredConversation, "title" | "modelId" | "isArchived">
  >,
) {
  const existing = await chatDb.conversations.get(conversationId);
  if (!existing) return;
  await chatDb.conversations.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Soft-archives a conversation (hides from main list).
 *
 * @param conversationId - The conversation to archive
 */
export async function archiveConversation(conversationId: string) {
  const existing = await chatDb.conversations.get(conversationId);
  if (!existing) return;
  await chatDb.conversations.put({ ...existing, isArchived: true });
}

/**
 * Permanently deletes a conversation and all its messages.
 * Also removes any cached usage snapshots.
 *
 * @param conversationId - The conversation to delete
 */
export async function deleteConversation(conversationId: string) {
  await chatDb.transaction(
    "rw",
    chatDb.messages,
    chatDb.conversations,
    chatDb.usageSnapshots,
    async () => {
      await chatDb.messages.where({ conversationId }).delete();
      await chatDb.conversations.delete(conversationId);
      await chatDb.usageSnapshots.delete(conversationId);
    },
  );
}

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Saves a message to the database and updates the conversation's message count.
 *
 * Handles both new messages and updates to existing messages (e.g., during streaming).
 * Uses a transaction to ensure atomicity.
 *
 * @param message - The message to save
 * @returns The saved message
 */
export async function saveMessage(message: StoredMessage) {
  await chatDb.transaction(
    "rw",
    chatDb.messages,
    chatDb.conversations,
    async () => {
      // Check if this is an update to an existing message
      const previouslySaved = await chatDb.messages.get(message.id);
      await chatDb.messages.put(message);

      // Update conversation metadata
      const existingConversation = await chatDb.conversations.get(
        message.conversationId,
      );
      if (existingConversation) {
        // Only increment count for brand-new messages, not streaming updates
        const increment = previouslySaved ? 0 : 1;
        await chatDb.conversations.put({
          ...existingConversation,
          updatedAt: new Date().toISOString(),
          messageCount: existingConversation.messageCount + increment,
        });
      }
    },
  );
  return message;
}

/**
 * Retrieves all messages for a conversation, ordered by creation time.
 *
 * @param conversationId - The conversation to get messages for
 * @returns Array of messages, oldest first
 */
export async function getMessages(conversationId: string) {
  return chatDb.messages.where({ conversationId }).sortBy("createdAt");
}

// ============================================================================
// Usage Snapshot Operations
// ============================================================================

/**
 * Caches a usage snapshot for offline display.
 * Called after each API response with updated rate limit info.
 *
 * @param conversationId - The conversation this snapshot is for
 * @param snapshot - The usage data to cache
 */
export async function saveUsageSnapshot(
  conversationId: string,
  snapshot: UsageSnapshot,
) {
  await chatDb.usageSnapshots.put({
    conversationId,
    snapshot,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Retrieves a cached usage snapshot for a conversation.
 *
 * @param conversationId - The conversation to look up
 * @returns The cached snapshot or null if not found
 */
export async function getStoredUsageSnapshot(conversationId: string) {
  const record = await chatDb.usageSnapshots.get(conversationId);
  return record?.snapshot ?? null;
}

/**
 * Clears all cached usage snapshots.
 * Useful for testing or when rate limits are externally reset.
 */
export async function clearUsageSnapshots() {
  await chatDb.usageSnapshots.clear();
}
