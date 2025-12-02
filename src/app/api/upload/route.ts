import { NextResponse } from "next/server";

import { uploadToBlob, BlobConfigError } from "@/lib/blob";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
} from "@/lib/chat/attachments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const uploadsDisabled = process.env.NEXT_PUBLIC_ATTACHMENTS_DISABLED === "true";
  if (uploadsDisabled) {
    return NextResponse.json(
      { error: "File uploads are disabled in this environment", code: "uploads_disabled" },
      { status: 503 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.error("[/api/upload] Missing BLOB_READ_WRITE_TOKEN; reject request");
    return NextResponse.json(
      { error: "File uploads are not configured", code: "blob_token_missing" },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9-.]/g, "-");
    const key = `uploads/${timestamp}-${safeName}`;

    const blob = await uploadToBlob({
      fileName: key,
      contentType: file.type,
      data: arrayBuffer,
      access: "public",
    });

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

    if (error instanceof BlobConfigError) {
      return NextResponse.json(
        { error: error.message, code: "blob_token_missing" },
        { status: 503 }
      );
    }

    if (error instanceof Error) {
      console.error("[/api/upload] Upload failed", {
        message: error.message,
        stack: error.stack,
      });
      return NextResponse.json({ ...basePayload, error: error.message }, { status: 500 });
    }

    console.error("[/api/upload] Unknown error", error);
    return NextResponse.json(basePayload, { status: 500 });
  }
}
