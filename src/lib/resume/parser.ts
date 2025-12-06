import type { TextItem } from "pdfjs-dist/types/src/display/api";

export type ParsedResume = {
  text: string;
  wordCount: number;
  readingTimeMinutes: number;
};

const SUPPORTED_MIME_TYPES = new Set<`application/${string}` | "text/plain">([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);

const FILE_EXTENSION_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
};

const WHITESPACE_REGEX = /\s+/g;

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

async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return stripHtml(result.value);
}

async function parseLegacyDoc(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arrayBuffer);
}

async function parsePlainText(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arrayBuffer);
}

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

function normalizeWhitespace(value: string): string {
  return value.replace(WHITESPACE_REGEX, " ").trim();
}
