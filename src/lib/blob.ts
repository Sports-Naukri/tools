/**
 * Local File Storage
 * 
 * Handles file uploads using local filesystem storage.
 * Files are stored in the public/uploads directory and served statically.
 * 
 * @module lib/blob
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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

/**
 * Uploads a file to local storage.
 * Files are stored in public/uploads and served statically.
 * 
 * @param params - Upload parameters
 * @returns Object with URL, pathname, and size
 */
export async function uploadToBlob({
  fileName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contentType,
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  access = "public",
}: BlobUploadParams) {
  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // Write file to disk
  const filePath = join(uploadsDir, fileName);
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await writeFile(filePath, buffer);

  // Return URL for accessing the file
  // Files in public/ are served at the root path
  const url = `/uploads/${fileName}`;

  return {
    url,
    pathname: fileName,
    size: buffer.byteLength,
  };
}

