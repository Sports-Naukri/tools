import Dexie, { type Table } from "dexie";

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
    this.version(1).stores({
      conversations: "&id, createdAt, updatedAt",
      messages: "&id, conversationId, createdAt",
    });
  }
}

export const chatDb = new ChatDatabase();

export async function createConversation(conversation: StoredConversation) {
  await chatDb.conversations.add(conversation);
  return conversation;
}

export async function upsertConversation(conversation: StoredConversation) {
  await chatDb.conversations.put(conversation);
  return conversation;
}

export async function saveMessage(message: StoredMessage) {
  await chatDb.transaction("rw", chatDb.messages, chatDb.conversations, async () => {
    await chatDb.messages.put(message);
    const existing = await chatDb.conversations.get(message.conversationId);
    if (existing) {
      await chatDb.conversations.put({
        ...existing,
        updatedAt: new Date().toISOString(),
        messageCount: existing.messageCount + 1,
      });
    }
  });
  return message;
}

export async function listConversations(limit = 20) {
  return chatDb.conversations
    .orderBy("updatedAt")
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getLatestConversation() {
  return chatDb.conversations.orderBy("updatedAt").last();
}

export async function getConversation(conversationId: string) {
  return chatDb.conversations.get(conversationId);
}

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
