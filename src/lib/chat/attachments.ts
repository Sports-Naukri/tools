const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_ATTACHMENTS = 5;
const ALLOWED_PROTOCOLS = new Set(["https:"]); // only allow https blob access

export const MAX_ATTACHMENT_FILE_SIZE = DEFAULT_MAX_FILE_SIZE;
export const MAX_ATTACHMENTS_PER_MESSAGE = DEFAULT_MAX_ATTACHMENTS;
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export type AttachmentPayload = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
};

export type AttachmentValidationCode =
  | "limit_exceeded"
  | "unsupported_type"
  | "file_too_large"
  | "invalid_protocol"
  | "missing_user_message";

export class AttachmentValidationError extends Error {
  readonly code: AttachmentValidationCode;

  constructor(message: string, code: AttachmentValidationCode) {
    super(message);
    this.name = "AttachmentValidationError";
    this.code = code;
  }
}

/**
 * Validates a list of attachments against size, type, and count limits.
 * Throws AttachmentValidationError if any check fails.
 */
export function ensureValidAttachments(
  attachments: AttachmentPayload[] | undefined
): AttachmentPayload[] {
  if (!attachments?.length) {
    return [];
  }

  const deduped = dedupeById(attachments);

  if (deduped.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new AttachmentValidationError(
      `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message`,
      "limit_exceeded"
    );
  }

  return deduped.map((attachment) => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(attachment.type)) {
      throw new AttachmentValidationError("Unsupported attachment type", "unsupported_type");
    }

    if (attachment.size > MAX_ATTACHMENT_FILE_SIZE) {
      throw new AttachmentValidationError("Attachment is too large", "file_too_large");
    }

    const url = safeParseUrl(attachment.url);
    if (!url || !ALLOWED_PROTOCOLS.has(url.protocol)) {
      throw new AttachmentValidationError("Attachment URL must be https", "invalid_protocol");
    }

    return attachment;
  });
}

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

function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
