/**
 * Chat API Request/Response Schemas
 * 
 * Zod validation schemas for API request/response payloads.
 * These schemas provide runtime validation and TypeScript type inference.
 * 
 * Key schemas:
 * - chatRequestSchema: Main chat API request validation
 * - attachmentSchema: File attachment validation
 * - uploadResponseSchema: Upload API response format
 * 
 * @module lib/chat/schemas
 * @see {@link ../../app/api/chat/route.ts} for usage in API routes
 * @see {@link https://zod.dev} for Zod documentation
 */

import { z } from "zod";

// ============================================================================
// Attachment Schemas
// ============================================================================

/**
 * Schema for file attachments in chat messages.
 * Validates that uploads have proper metadata and valid URLs.
 */
export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  size: z.number().int().nonnegative(),
  type: z.string(),
});

// ============================================================================
// Message Part Schemas
// ============================================================================

/**
 * Schema for text parts in multi-part messages.
 * Simple text content with type discriminator.
 */
const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

/**
 * Schema for file parts in multi-part messages.
 * Used when messages include inline file references.
 */
const filePartSchema = z.object({
  type: z.literal("file"),
  url: z.string().url(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  mediaType: z.string().optional(),
});

/**
 * Union schema for any message part type.
 * Allows text, file, or generic object parts for extensibility.
 */
const genericPartSchema = z.union([textPartSchema, filePartSchema, z.record(z.any())]);

// ============================================================================
// Message Schema
// ============================================================================

/**
 * Schema for individual messages sent to the chat API.
 * Supports both simple string content and multi-part content.
 */
const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  /** Simple string content (most common) */
  content: z.string().optional(),
  /** Multi-part content for complex messages */
  parts: z.array(genericPartSchema).optional(),
});

// ============================================================================
// Chat Request Schema
// ============================================================================

/**
 * Main schema for validating chat API requests.
 * 
 * This is the primary validation schema used by POST /api/chat.
 * All chat requests must conform to this schema.
 * 
 * @property conversationId - Unique conversation identifier (min 4 chars)
 * @property isNewConversation - True if this is the first message
 * @property modelId - AI model to use (e.g., "standard")
 * @property mode - Chat mode: "jay" (career coach) or "navigator" (job search)
 * @property isSearchEnabled - Whether web search is enabled
 * @property messages - Array of messages (min 1)
 * @property attachments - Optional file attachments
 * @property resumeContext - Optional resume data for personalization
 */
export const chatRequestSchema = z.object({
  conversationId: z.string().min(4),
  isNewConversation: z.boolean().optional().default(false),
  modelId: z.string().min(2),
  mode: z.enum(["jay", "navigator"]).optional().default("jay"),
  isSearchEnabled: z.boolean().optional().default(false),
  messages: z.array(messageSchema).min(1),
  attachments: z.array(attachmentSchema).optional().default([]),
  /**
   * Resume context for personalized responses.
   * Sent when the user has uploaded a resume and the toggle is ON.
   * Contains extracted profile data, NOT the raw resume text.
   */
  resumeContext: z.object({
    name: z.string().nullish(),
    skills: z.array(z.string()),
    summary: z.string().nullish(),
    experience: z.array(z.object({
      title: z.string(),
      company: z.string(),
    })).optional(),
  }).nullish(),
});

/** TypeScript type inferred from the chat request schema */
export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

// ============================================================================
// Upload Response Schema
// ============================================================================

/**
 * Schema for successful file upload responses.
 * Returned by POST /api/upload after processing an attachment.
 */
export const uploadResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().url(),
});

