import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  size: z.number().int().nonnegative(),
  type: z.string(),
});

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const filePartSchema = z.object({
  type: z.literal("file"),
  url: z.string().url(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  mediaType: z.string().optional(),
});

const genericPartSchema = z.union([textPartSchema, filePartSchema, z.record(z.any())]);

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().optional(),
  parts: z.array(genericPartSchema).optional(),
});

/**
 * Schema for validating chat requests sent to the API.
 * Ensures all required fields are present and valid.
 */
export const chatRequestSchema = z.object({
  conversationId: z.string().min(4),
  isNewConversation: z.boolean().optional().default(false),
  modelId: z.string().min(2),
  isSearchEnabled: z.boolean().optional().default(false),
  messages: z.array(messageSchema).min(1),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

export const uploadResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().url(),
});
