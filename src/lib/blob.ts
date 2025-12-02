import { put } from "@vercel/blob";

export type BlobUploadParams = {
  fileName: string;
  contentType: string;
  data: ArrayBuffer | Buffer;
  access?: "public" | "private";
};

export class BlobConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlobConfigError";
  }
}

export async function uploadToBlob({
  fileName,
  contentType,
  data,
  access = "public",
}: BlobUploadParams) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.error("[blob] Missing BLOB_READ_WRITE_TOKEN; skipping upload");
    throw new BlobConfigError("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const blob = await put(fileName, data, {
    contentType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    access: access as any,
    token,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: data.byteLength,
  };
}
