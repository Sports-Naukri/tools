import Dexie, { type Table } from "dexie";

import type { CanvasDocument } from "@/lib/canvas/documents";

export type StoredAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments?: StoredAttachment[];
  documents?: CanvasDocument[];
  error?: string | null;
};

export type StoredConversation = {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isArchived?: boolean;
};

class ChatDatabase extends Dexie {
  conversations!: Table<StoredConversation, string>;
  messages!: Table<StoredMessage, string>;

  constructor() {
    super("sportsnaukri-chat");
    // Define the database schema
    this.version(1).stores({
      conversations: "&id, createdAt, updatedAt",
      messages: "&id, conversationId, createdAt",
    });
  }
}

export const chatDb = new ChatDatabase();

/**
 * Creates a new conversation in the database.
 */
export async function createConversation(conversation: StoredConversation) {
  await chatDb.conversations.add(conversation);
  return conversation;
}

/**
 * Updates or inserts a conversation in the database.
 */
export async function upsertConversation(conversation: StoredConversation) {
  await chatDb.conversations.put(conversation);
  return conversation;
}

/**
 * Saves a message to the database and updates the conversation's message count.
 * Handles both new messages and updates to existing messages (e.g., streaming).
 */
export async function saveMessage(message: StoredMessage) {
  await chatDb.transaction("rw", chatDb.messages, chatDb.conversations, async () => {
    const previouslySaved = await chatDb.messages.get(message.id);
    await chatDb.messages.put(message);
    const existingConversation = await chatDb.conversations.get(message.conversationId);
    if (existingConversation) {
      const increment = previouslySaved ? 0 : 1;
      // Streaming updates can rewrite the same message id; only bump counts for brand-new ids.
      await chatDb.conversations.put({
        ...existingConversation,
        updatedAt: new Date().toISOString(),
        messageCount: existingConversation.messageCount + increment,
      });
    }
  });
  return message;
}

/**
 * Lists conversations, ordered by most recently updated.
 */
export async function listConversations(limit = 20) {
  return chatDb.conversations
    .orderBy("updatedAt")
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Gets the most recently updated conversation.
 */
export async function getLatestConversation() {
  return chatDb.conversations.orderBy("updatedAt").last();
}

/**
 * Retrieves a conversation by its ID.
 */
export async function getConversation(conversationId: string) {
  return chatDb.conversations.get(conversationId);
}

/**
 * Updates metadata for a conversation (title, model, archived status).
 */
export async function updateConversationMeta(
  conversationId: string,
  updates: Partial<Pick<StoredConversation, "title" | "modelId" | "isArchived">>
) {
  const existing = await chatDb.conversations.get(conversationId);
  if (!existing) return;
  await chatDb.conversations.put({ ...existing, ...updates, updatedAt: new Date().toISOString() });
}

export async function getMessages(conversationId: string) {
  return chatDb.messages.where({ conversationId }).sortBy("createdAt");
}

export async function deleteConversation(conversationId: string) {
  await chatDb.transaction("rw", chatDb.messages, chatDb.conversations, async () => {
    await chatDb.messages.where({ conversationId }).delete();
    await chatDb.conversations.delete(conversationId);
  });
}

export async function archiveConversation(conversationId: string) {
  const existing = await chatDb.conversations.get(conversationId);
  if (!existing) return;
  await chatDb.conversations.put({ ...existing, isArchived: true });
}
