import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./crypto";

/**
 * Private file storage for payment evidence. Local disk in development.
 * For production on Vercel, replace with an S3-compatible bucket (Cloudflare R2) — the interface stays the same.
 */
const ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export class UploadError extends Error {}

export async function savePrivateImage(file: File, folder: string): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new UploadError("type");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("size");
  const buf = Buffer.from(await file.arrayBuffer());
  // Check magic bytes, not just the declared type.
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isWebp = buf.subarray(8, 12).toString() === "WEBP";
  if (!isJpeg && !isPng && !isWebp) throw new UploadError("type");
  const name = `${folder}/${Date.now()}-${randomToken(12)}.${ext}`;
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await writeFile(path.join(ROOT, name), buf);
  return name;
}

export async function readPrivateFile(relPath: string): Promise<Buffer> {
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(path.resolve(ROOT) + path.sep)) throw new Error("Invalid path");
  return readFile(full);
}
