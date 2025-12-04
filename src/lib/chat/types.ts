export type AttachmentPreview = {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: "uploading" | "ready" | "error";
  error?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments?: AttachmentPreview[];
  isStreaming?: boolean;
};

export type ConversationState = {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  requestCount: number;
};

/**
 * Snapshot of the user's usage quotas.
 * Returned by the API to enforce limits on the client.
 */
export type UsageSnapshot = {
  daily: {
    limit: number;
    used: number;
    remaining: number;
  };
  chat: {
    limit: number;
    used: number;
    remaining: number;
  };
};

export type ChatSuggestion = {
  id: string;
  text: string;
};

export type SuggestionResponse = {
  suggestions: ChatSuggestion[];
};
