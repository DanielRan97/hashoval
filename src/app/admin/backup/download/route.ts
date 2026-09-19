import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { backupName, snapshotDatabase } from "@/lib/backup";

export const dynamic = "force-dynamic";

/** Sends a fresh snapshot of the database. It holds customer details, so only the admin can download it. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const name = backupName();
  const tmp = path.join(os.tmpdir(), `${name}-${crypto.randomUUID()}.db`);
  try {
    await snapshotDatabase(tmp);
    const data = await readFile(tmp);
    return new Response(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await rm(tmp, { force: true });
  }
}
