/**
 * Attachment Validation & Configuration
 *
 * Utilities for validating file attachments in chat messages.
 * Enforces size limits, type restrictions, and URL security.
 *
 * Features:
 * - MIME type whitelist (images, documents, text)
 * - File size limits (5MB default)
 * - Attachment count limits (5 per message)
 * - HTTPS-only URL validation
 * - Duplicate detection by ID
 *
 * Note: PDF support was removed because client-side parsing is unreliable
 * for encrypted, scanned, or complex PDFs. Resume uploads use server-side
 * extraction via the /api/resume/extract endpoint instead.
 *
 * @module lib/chat/attachments
 * @see {@link ../../app/api/upload/route.ts} for upload handling
 * @see {@link ../resume/parser.ts} for resume-specific parsing
 */

// ============================================================================
// Configuration Constants
// ============================================================================

/** Maximum file size allowed for attachments (5MB) */
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Maximum number of attachments per message */
const DEFAULT_MAX_ATTACHMENTS = 5;

/** Allowed URL protocols for attachment URLs */
const ALLOWED_PROTOCOLS = new Set(["https:"]); // Security: only allow https

// Exported constants for use in UI validation
export const MAX_ATTACHMENT_FILE_SIZE = DEFAULT_MAX_FILE_SIZE;
export const MAX_ATTACHMENTS_PER_MESSAGE = DEFAULT_MAX_ATTACHMENTS;

// ============================================================================
// Allowed File Types
// ============================================================================

/**
 * MIME types allowed for file attachments.
 *
 * Includes:
 * - Images: PNG, JPEG, WebP
 * - Documents: DOC, DOCX (Word)
 * - Text: Plain text files
 *
 * PDF is intentionally excluded - client-side parsing is unreliable.
 * Use the resume extraction API for PDF processing.
 */
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

// ============================================================================
// User Guidance Messages
// ============================================================================

/** Human-readable list of supported resume formats */
export const RESUME_SUPPORTED_FORMATS = "DOCX, DOC, or TXT";

/** Guidance message shown when PDF upload fails */
export const RESUME_FILE_GUIDANCE = `For best results, please upload your resume as ${RESUME_SUPPORTED_FORMATS} format.`;

// ============================================================================
// Types
// ============================================================================

/**
 * Payload structure for file attachments sent to the API.
 * Represents a validated, ready-to-use attachment.
 */
export type AttachmentPayload = {
  /** Unique identifier for the attachment */
  id: string;
  /** Original filename */
  name: string;
  /** HTTPS URL to the uploaded file */
  url: string;
  /** File size in bytes */
  size: number;
  /** MIME type (e.g., "image/png") */
  type: string;
};

/**
 * Error codes for attachment validation failures.
 * Used to provide specific error handling and user messaging.
 */
export type AttachmentValidationCode =
  | "limit_exceeded" // Too many attachments
  | "unsupported_type" // MIME type not in whitelist
  | "file_too_large" // Exceeds size limit
  | "invalid_protocol" // Not HTTPS
  | "missing_user_message"; // No user message with attachments

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error for attachment validation failures.
 * Includes a code for programmatic error handling.
 */
export class AttachmentValidationError extends Error {
  readonly code: AttachmentValidationCode;

  constructor(message: string, code: AttachmentValidationCode) {
    super(message);
    this.name = "AttachmentValidationError";
    this.code = code;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a list of attachments against size, type, and count limits.
 *
 * Performs the following checks:
 * 1. Deduplicates attachments by ID
 * 2. Enforces maximum attachment count
 * 3. Validates MIME type against whitelist
 * 4. Checks file size against limit
 * 5. Ensures URL is HTTPS
 *
 * @param attachments - Array of attachments to validate
 * @returns Validated and deduplicated attachments
 * @throws {AttachmentValidationError} If any validation check fails
 *
 * @example
 * ```ts
 * try {
 *   const valid = ensureValidAttachments(attachments);
 *   // Use validated attachments
 * } catch (err) {
 *   if (err instanceof AttachmentValidationError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 * ```
 */
export function ensureValidAttachments(
  attachments: AttachmentPayload[] | undefined,
): AttachmentPayload[] {
  if (!attachments?.length) {
    return [];
  }

  // Remove duplicates by ID
  const deduped = dedupeById(attachments);

  // Check attachment count limit
  if (deduped.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new AttachmentValidationError(
      `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message`,
      "limit_exceeded",
    );
  }

  // Validate each attachment
  return deduped.map((attachment) => {
    // Check MIME type
    if (!ALLOWED_ATTACHMENT_TYPES.includes(attachment.type)) {
      throw new AttachmentValidationError(
        "Unsupported attachment type",
        "unsupported_type",
      );
    }

    // Check file size
    if (attachment.size > MAX_ATTACHMENT_FILE_SIZE) {
      throw new AttachmentValidationError(
        "Attachment is too large",
        "file_too_large",
      );
    }

    // Check URL protocol (security)
    const url = safeParseUrl(attachment.url);
    if (!url || !ALLOWED_PROTOCOLS.has(url.protocol)) {
      throw new AttachmentValidationError(
        "Attachment URL must be https",
        "invalid_protocol",
      );
    }

    return attachment;
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Removes duplicate attachments by ID.
 * Keeps the first occurrence of each ID.
 *
 * @param attachments - Array of attachments to dedupe
 * @returns Array with duplicates removed
 */
function dedupeById(attachments: AttachmentPayload[]) {
  const seen = new Set<string>();
  const result: AttachmentPayload[] = [];
  for (const attachment of attachments) {
    if (seen.has(attachment.id)) continue;
    seen.add(attachment.id);
    result.push(attachment);
  }
  return result;
}

/**
 * Safely parses a URL string.
 * Returns null instead of throwing on invalid URLs.
 *
 * @param value - URL string to parse
 * @returns Parsed URL object or null if invalid
 */
function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
