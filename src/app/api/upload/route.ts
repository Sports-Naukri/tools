/**
 * File Upload API
 * 
 * Handles file uploads for chat attachments. Files are stored locally
 * and a URL is returned for embedding in messages.
 * 
 * Features:
 * - File type validation (images, documents, text)
 * - File size limits (5MB max)
 * - Local file storage
 * - Environment-based upload disabling
 * 
 * @route POST /api/upload
 * @module app/api/upload/route
 * @see {@link ../../lib/blob.ts} for storage utilities
 * @see {@link ../../lib/chat/attachments.ts} for validation rules
 */

import { NextResponse } from "next/server";

import { uploadToBlob, BlobConfigError } from "@/lib/blob";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
} from "@/lib/chat/attachments";

// ============================================================================
// Runtime Configuration
// ============================================================================

export const runtime = "nodejs";

// ============================================================================
// POST Handler
// ============================================================================

/**
 * Uploads a file to local storage and returns the URL.
 * 
 * Request: multipart/form-data with "file" field
 * 
 * Response: {
 *   id: string,    // File pathname
 *   name: string,  // Original filename
 *   size: number,  // File size in bytes
 *   type: string,  // MIME type
 *   url: string    // Public URL
 * }
 */
export async function POST(req: Request) {
  // Check if uploads are disabled via environment
  const uploadsDisabled = process.env.NEXT_PUBLIC_ATTACHMENTS_DISABLED === "true";
  if (uploadsDisabled) {
    return NextResponse.json(
      { error: "File uploads are disabled in this environment", code: "uploads_disabled" },
      { status: 503 }
    );
  }

  // Check for storage token
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.error("[/api/upload] Missing BLOB_READ_WRITE_TOKEN; reject request");
    return NextResponse.json(
      { error: "File uploads are not configured", code: "blob_token_missing" },
      { status: 503 }
    );
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file");

  // Validate file presence
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  // Validate file type
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  try {
    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9-.]/g, "-");
    const key = `uploads/${timestamp}-${safeName}`;

    // Upload to storage
    const blob = await uploadToBlob({
      fileName: key,
      contentType: file.type,
      data: arrayBuffer,
      access: "public",
    });

    // Return upload result
    return NextResponse.json({
      id: blob.pathname,
      name: file.name,
      size: file.size,
      type: file.type,
      url: blob.url,
    });
  } catch (error) {
    const basePayload = {
      error: "Upload failed",
      code: "upload_failed",
    };

    // Handle storage configuration errors
    if (error instanceof BlobConfigError) {
      return NextResponse.json(
        { error: error.message, code: "blob_token_missing" },
        { status: 503 }
      );
    }

    // Handle general errors
    if (error instanceof Error) {
      console.error("[/api/upload] Upload failed", {
        message: error.message,
        stack: error.stack,
      });
      return NextResponse.json({ ...basePayload, error: error.message }, { status: 500 });
    }

    // Unknown error fallback
    console.error("[/api/upload] Unknown error", error);
    return NextResponse.json(basePayload, { status: 500 });
  }
}

