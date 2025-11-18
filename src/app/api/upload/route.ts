import { NextResponse } from "next/server";

import { uploadToBlob } from "@/lib/blob";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
} from "@/lib/chat/attachments";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
