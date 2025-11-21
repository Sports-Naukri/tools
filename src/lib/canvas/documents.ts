import { z } from "zod";

export const DOCUMENT_TOOL_NAME = "generateDocument" as const;

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

export const documentInputSchema = z.object({
  title: z.string().min(3),
  type: z.enum(["resume", "cover_letter", "report", "essay"]),
  style: z.enum(["modern", "classic", "minimalist"]).optional(),
  content: z.array(documentSectionSchema).min(1),
});

export const generatedDocumentSchema = documentInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().optional(),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;
export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;

export type CanvasDocument = GeneratedDocument & {
  toolCallId?: string;
};

export function isGeneratedDocument(payload: unknown): payload is GeneratedDocument {
  return generatedDocumentSchema.safeParse(payload).success;
}
