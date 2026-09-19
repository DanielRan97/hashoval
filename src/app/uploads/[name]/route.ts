import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/paths";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * Serves uploaded product images from UPLOAD_DIR. Next.js only serves files that existed in
 * public/ at build time, so images uploaded while the site is running need this route.
 */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const match = /^[A-Za-z0-9-]{1,80}\.(jpg|png|webp)$/.exec(name);
  if (!match) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[match[1]],
        // File names are random and never reused, so they can be cached for good.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
