/**
 * Attachment Analytics
 * 
 * Utilities for logging file upload failures and stats.
 * Uses `navigator.sendBeacon` for reliable transmission during unload/errors.
 * 
 * @module lib/analytics/attachments
 */

type AttachmentFailureSource = "client_validation" | "upload_error" | "uploads_disabled";

export type AttachmentFailureEvent = {
  attachmentId?: string;
  mimeType?: string;
  size?: number;
  errorCode?: string;
  message: string;
  source: AttachmentFailureSource;
  conversationId?: string;
};

const SIZE_BUCKETS = [
  { max: 256 * 1024, label: "<256KB" },
  { max: 1024 * 1024, label: "<1MB" },
  { max: 2 * 1024 * 1024, label: "<2MB" },
  { max: 5 * 1024 * 1024, label: "<5MB" },
];

function bucketize(size?: number) {
  if (!size || size <= 0) return "unknown";
  const match = SIZE_BUCKETS.find((bucket) => size <= bucket.max);
  if (match) return match.label;
  return ">5MB";
}

/**
 * Emits a structured attachment failure log that can be piped into analytics later.
 * Falls back to console logging when no beacon endpoint is provided.
 */
export function logAttachmentFailure(event: AttachmentFailureEvent) {
  const payload = {
    ...event,
    sizeBucket: bucketize(event.size),
    timestamp: new Date().toISOString(),
  };

  const endpoint = process.env.NEXT_PUBLIC_ATTACHMENT_LOG_ENDPOINT;
  if (typeof navigator !== "undefined" && navigator.sendBeacon && endpoint) {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    } catch (error) {
      console.warn("[AttachmentFailureBeacon]", error);
    }
  }

  console.warn("[AttachmentFailure]", payload);
}
