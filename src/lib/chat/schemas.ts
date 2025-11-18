import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  size: z.number().int().nonnegative(),
  type: z.string(),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().min(4),
  isNewConversation: z.boolean().optional().default(false),
  modelId: z.string().min(2),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .min(1),
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
