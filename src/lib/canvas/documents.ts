import { z } from "zod";

/**
 * The name of the tool used to generate documents.
 * This constant is used to identify document generation requests in the chat.
 */
export const DOCUMENT_TOOL_NAME = "generateDocument" as const;

/**
 * Schema for a single section within a generated document.
 * Defines the structure of content blocks.
 */
export const documentSectionSchema = z.object({
  heading: z.string().optional(),
  body: z
    .string()
    .describe("Main content of the section. Supports markdown and bullet lists."),
  meta: z
    .string()
    .describe("Additional context like dates, locations, or short subtitles.")
    .optional(),
});

/**
 * Schema for the input required to generate a document.
 * Used by the AI model to structure its output.
 */
export const documentInputSchema = z.object({
  title: z.string().min(3),
  type: z.enum(["resume", "cover_letter", "report", "essay"]),
  style: z.enum(["modern", "classic", "minimalist"]).optional(),
  summary: z
    .string()
    .max(200)
    .describe("A brief, contextual description of what was created or changed. Example: 'Created a resume highlighting your sports management experience' or 'Updated your resume to emphasize leadership roles'.")
    .optional(),
  content: z.array(documentSectionSchema).min(1),
});

/**
 * Schema for a fully generated document, including system-assigned metadata.
 */
export const generatedDocumentSchema = documentInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().optional(),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;
export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;

/**
 * Represents a document in the canvas, potentially linked to a specific tool call.
 */
export type CanvasDocument = GeneratedDocument & {
  toolCallId?: string;
};

/**
 * Type guard to check if a payload matches the generated document schema.
 * @param payload The unknown data to validate
 * @returns True if the payload is a valid GeneratedDocument
 */
export function isGeneratedDocument(payload: unknown): payload is GeneratedDocument {
  return generatedDocumentSchema.safeParse(payload).success;
}
