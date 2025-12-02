import { describe, it, expect } from "vitest";

import {
  ensureValidAttachments,
  AttachmentValidationError,
  MAX_ATTACHMENT_FILE_SIZE,
  type AttachmentPayload,
} from "@/lib/chat/attachments";

function buildAttachment(overrides: Partial<AttachmentPayload> = {}): AttachmentPayload {
  return {
    id: "resume",
    name: "resume.pdf",
    url: "https://blob.vercel-storage.com/resume.pdf",
    size: 1024,
    type: "application/pdf",
    ...overrides,
  };
}

describe("ensureValidAttachments", () => {
  it("accepts valid https attachments and removes duplicates", () => {
    const attachments = ensureValidAttachments([
      buildAttachment({ id: "resume", name: "Resume" }),
      buildAttachment({ id: "resume", name: "Duplicate" }),
    ]);

    expect(attachments).toHaveLength(1);
    expect(attachments[0].name).toBe("Resume");
  });

  it("rejects attachments that exceed the size cap", () => {
    const invoke = () =>
      ensureValidAttachments([
        buildAttachment({ size: MAX_ATTACHMENT_FILE_SIZE + 1 }),
      ]);

    expect(invoke).toThrowError(AttachmentValidationError);
    try {
      invoke();
      expect.fail("Expected size validation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AttachmentValidationError);
      expect((error as AttachmentValidationError).code).toBe("file_too_large");
    }
  });

  it("rejects unsupported MIME types", () => {
    const invoke = () =>
      ensureValidAttachments([
        buildAttachment({ type: "application/zip" }),
      ]);

    expect(invoke).toThrowError(AttachmentValidationError);
    try {
      invoke();
      expect.fail("Expected MIME type validation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AttachmentValidationError);
      expect((error as AttachmentValidationError).code).toBe("unsupported_type");
    }
  });

  it("rejects attachments with non-HTTPS URLs", () => {
    const invoke = () =>
      ensureValidAttachments([
        buildAttachment({ url: "http://example.com/resume.pdf" }),
      ]);

    expect(invoke).toThrowError(AttachmentValidationError);
    try {
      invoke();
      expect.fail("Expected protocol validation to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AttachmentValidationError);
      expect((error as AttachmentValidationError).code).toBe("invalid_protocol");
    }
  });
});
