import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/paths";
import { randomUUID } from "node:crypto";

/** The type is read from the file's own first bytes, since the browser-declared type can be faked. */
function detectImageType(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}
const MAX_BYTES = 5 * 1024 * 1024;

/** Saves an uploaded image to public/uploads and returns its URL, or null if none/invalid. */
export async function saveImage(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectImageType(bytes);
  if (!ext || file.size > MAX_BYTES) throw new Error("התמונה חייבת להיות JPG/PNG/WEBP עד 5MB");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return `/uploads/${name}`;
}

/** Best-effort removal of a file previously saved by saveImage. */
export async function removeImage(url: string) {
  if (!url.startsWith("/uploads/") || url.includes("..")) return;
  try {
    await unlink(path.join(UPLOAD_DIR, path.basename(url)));
  } catch {}
}
