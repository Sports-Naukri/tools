/**
 * Resume File Parser
 * 
 * Client-side resume parsing for PDF, DOCX, DOC, and TXT files.
 * Extracts raw text from uploaded resume files using browser-based libraries.
 * 
 * Supported Formats:
 * - PDF: Uses pdfjs-dist (Mozilla's PDF.js)
 * - DOCX: Uses mammoth.js for HTML conversion
 * - DOC: Basic text decoding (legacy format)
 * - TXT: Plain text decoding
 * 
 * Flow:
 * 1. User uploads resume file
 * 2. parseResumeFile() extracts raw text
 * 3. Text sent to /api/resume/extract for AI processing
 * 4. Extracted profile stored in IndexedDB
 * 
 * @module lib/resume/parser
 * @see {@link ./types.ts} for data structures
 * @see {@link ../../components/resume/ResumeUploadDialog.tsx} for UI
 */

import type { TextItem } from "pdfjs-dist/types/src/display/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed resume data (before AI extraction).
 * Contains raw text and metadata.
 */
export type ParsedResume = {
  /** Extracted text content */
  text: string;
  /** Number of words in the resume */
  wordCount: number;
  /** Estimated reading time in minutes */
  readingTimeMinutes: number;
};

// ============================================================================
// Supported File Types
// ============================================================================

/** MIME types supported for resume upload */
const SUPPORTED_MIME_TYPES = new Set<`application/${string}` | "text/plain">([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);

/** File extension to MIME type mapping (fallback when MIME type missing) */
const FILE_EXTENSION_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
};

const WHITESPACE_REGEX = /\s+/g;

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Checks if a file is a supported resume format.
 * 
 * @param file - File to check
 * @returns True if file type is supported
 */
export function isSupportedResumeFile(file: File): boolean {
  if (SUPPORTED_MIME_TYPES.has(file.type as never)) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) {
    return false;
  }
  const mapped = FILE_EXTENSION_MAP[ext];
  if (!mapped) {
    return false;
  }
  return !file.type || file.type === mapped;
}

/**
 * Parses a resume file and extracts raw text.
 * 
 * @param file - Resume file (PDF, DOCX, DOC, or TXT)
 * @returns Parsed resume with text, word count, and reading time
 * @throws {Error} If file format is unsupported or parsing fails
 * 
 * @example
 * ```ts
 * const file = event.target.files[0];
 * const parsed = await parseResumeFile(file);
 * console.log(`Extracted ${parsed.wordCount} words`);
 * // Send parsed.text to /api/resume/extract
 * ```
 */
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  if (typeof window === "undefined") {
    throw new Error("Resume parsing runs only in the browser.");
  }

  if (!isSupportedResumeFile(file)) {
    throw new Error("Unsupported resume format. Upload a PDF, DOCX, DOC, or TXT file.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rawText = "";

  // Route to appropriate parser based on file type
  if (file.type === "application/pdf" || extension === "pdf") {
    rawText = await parsePdf(arrayBuffer);
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    rawText = await parseDocx(arrayBuffer);
  } else if (file.type === "application/msword" || extension === "doc") {
    rawText = await parseLegacyDoc(arrayBuffer);
  } else {
    rawText = await parsePlainText(arrayBuffer);
  }

  const text = normalizeWhitespace(rawText);
  const wordCount = text ? text.split(" ").length : 0;
  const readingTimeMinutes = wordCount === 0 ? 0 : Math.max(1, Math.round(wordCount / 200));

  return {
    text,
    wordCount,
    readingTimeMinutes,
  };
}

// ============================================================================
// File Format Parsers
// ============================================================================

/**
 * Parses PDF file using PDF.js.
 * Extracts text from all pages.
 */
async function parsePdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer, useWorkerFetch: false, disableWorker: true });
  const pdf = await loadingTask.promise;
  let combined = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => extractText(item as TextItem | string | undefined)).join(" ");
    combined += `${pageText}\n`;
  }
  return combined;
}

/**
 * Parses DOCX file using mammoth.js.
 * Converts to HTML then strips tags.
 */
async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return stripHtml(result.value);
}

/**
 * Parses legacy DOC file.
 * Uses basic UTF-8 decoding (not perfect but functional).
 */
async function parseLegacyDoc(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arrayBuffer);
}

/**
 * Parses plain text file.
 */
async function parsePlainText(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arrayBuffer);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts text from PDF.js TextItem.
 */
function extractText(item: TextItem | string | undefined): string {
  if (!item) {
    return "";
  }
  if (typeof item === "string") {
    return item;
  }
  if (typeof item === "object" && "str" in item) {
    return String(item.str ?? "");
  }
  return "";
}

/**
 * Strips HTML tags and decodes entities.
 * Used after mammoth.js HTML conversion.
 */
function stripHtml(html: string): string {
  if (!html) {
    return "";
  }
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * Normalizes whitespace (collapses multiple spaces, trims).
 */
function normalizeWhitespace(value: string): string {
  return value.replace(WHITESPACE_REGEX, " ").trim();
}
