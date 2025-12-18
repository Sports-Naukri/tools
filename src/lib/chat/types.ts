/**
 * Chat Type Definitions
 *
 * Core TypeScript types used throughout the chat system for:
 * - Message and attachment representation
 * - Conversation state management
 * - Usage tracking and rate limit display
 * - Follow-up suggestions
 *
 * These types are shared between client components and API routes.
 *
 * @module lib/chat/types
 * @see {@link ./storage.ts} for persistence layer using these types
 * @see {@link ../../components/chat/MessageList.tsx} for UI rendering
 */

// ============================================================================
// Attachment Types
// ============================================================================

/**
 * Client-side representation of a file attachment.
 *
 * Tracks the lifecycle of an attachment from upload initiation to completion.
 * Used in the message composer and message display components.
 *
 * @property id - Unique identifier for the attachment
 * @property name - Original filename
 * @property size - File size in bytes
 * @property type - MIME type (e.g., "image/png", "application/pdf")
 * @property url - Blob URL for preview (client-side) or server URL after upload
 * @property status - Current upload state
 * @property error - Error message if upload failed
 * @property isLocalOnly - True if attachment hasn't been uploaded yet
 */
export type AttachmentPreview = {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: "uploading" | "ready" | "error";
  error?: string;
  isLocalOnly?: boolean;
};

// ============================================================================
// Message Types
// ============================================================================

/**
 * Represents a single message in a conversation.
 *
 * Messages can be from the user, AI assistant, or system.
 * System messages are typically hidden and used for context injection.
 *
 * @property id - Unique message identifier (nanoid format)
 * @property role - Who sent the message
 * @property content - Message text (may contain markdown)
 * @property createdAt - ISO 8601 timestamp
 * @property attachments - Optional file attachments
 * @property isStreaming - True while AI response is being generated
 */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  attachments?: AttachmentPreview[];
  isStreaming?: boolean;
};

// ============================================================================
// Conversation Types
// ============================================================================

/**
 * Complete state of a conversation including all messages.
 *
 * Used by the main chat component to manage conversation lifecycle.
 * Persisted to IndexedDB for offline access and conversation history.
 *
 * @property id - Unique conversation identifier (nanoid format)
 * @property title - Auto-generated or user-edited title
 * @property modelId - AI model used for this conversation
 * @property createdAt - When conversation was started
 * @property updatedAt - Last message timestamp
 * @property messages - Ordered array of all messages
 * @property requestCount - Number of API requests made (for rate limiting)
 */
export type ConversationState = {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  requestCount: number;
};

// ============================================================================
// Usage & Rate Limiting Types
// ============================================================================

/**
 * Usage statistics for a single rate limit window.
 *
 * Used to display remaining quota in the UI and enforce limits.
 *
 * @property limit - Maximum allowed in this window
 * @property used - Current usage count
 * @property remaining - How many more actions are allowed
 * @property resetAt - ISO 8601 timestamp when the window resets (null if permanent)
 * @property secondsUntilReset - Countdown for UI display (null if no reset)
 */
export type UsageWindow = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
  secondsUntilReset: number | null;
};

/**
 * Complete usage snapshot returned by the /api/chat/usage endpoint.
 *
 * Contains both daily conversation limits and per-chat message limits.
 * The client uses this to show remaining quota and disable inputs when exhausted.
 *
 * @property daily - Daily new conversation limits (resets at midnight)
 * @property chat - Per-conversation message limits (never resets)
 */
export type UsageSnapshot = {
  daily: UsageWindow;
  chat: UsageWindow;
};

// ============================================================================
// Suggestion Types
// ============================================================================

/**
 * A follow-up question suggestion shown after AI responses.
 *
 * @property id - Unique identifier for the suggestion
 * @property text - The suggested follow-up question text
 */
export type ChatSuggestion = {
  id: string;
  text: string;
};

/**
 * Response format from the /api/chat/suggestions endpoint.
 *
 * @property suggestions - Array of suggested follow-up questions
 */
export type SuggestionResponse = {
  suggestions: ChatSuggestion[];
};
