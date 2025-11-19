import { put } from "@vercel/blob";

export type BlobUploadParams = {
  fileName: string;
  contentType: string;
  data: ArrayBuffer | Buffer;
  access?: "public" | "private";
};

export async function uploadToBlob({
  fileName,
  contentType,
  data,
  access = "public",
}: BlobUploadParams) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const blob = await put(fileName, data, {
    contentType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    access: access as any,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: data.byteLength,
  };
}
