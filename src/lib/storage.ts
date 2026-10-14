import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomToken } from "./crypto";

/**
 * Private file storage for payment evidence.
 * - Production (Vercel): an S3-compatible bucket such as Cloudflare R2 (set S3_* env vars). Vercel's disk is not persistent.
 * - Development: local `uploads/` folder when no bucket is configured.
 */
const ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export class UploadError extends Error {}

let client: S3Client | null = null;
function s3(): S3Client | null {
  if (!process.env.S3_BUCKET) return null;
  client ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  return client;
}

/** True when uploads can be stored durably in this environment. */
export function uploadsEnabled() {
  return !!s3() || process.env.NODE_ENV !== "production" || !!process.env.UPLOAD_DIR;
}

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

  const bucket = s3();
  if (bucket) {
    await bucket.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: name, Body: buf, ContentType: file.type }));
    return name;
  }
  if (!uploadsEnabled()) throw new UploadError("storage");
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await writeFile(path.join(ROOT, name), buf);
  return name;
}

export async function readPrivateFile(relPath: string): Promise<Buffer> {
  const bucket = s3();
  if (bucket) {
    const res = await bucket.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: relPath }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(path.resolve(ROOT) + path.sep)) throw new Error("Invalid path");
  return readFile(full);
}
