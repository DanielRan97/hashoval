import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { BACKUP_DIR, UPLOAD_DIR } from "@/lib/paths";

export { BACKUP_DIR };

/**
 * Writes a consistent copy of the database to `dest` while the site keeps running.
 * VACUUM INTO takes a snapshot inside SQLite, unlike copying the file, which could catch
 * it mid-write. `dest` must be a path we built ourselves (never user input).
 */
export async function snapshotDatabase(dest: string) {
  await rm(dest, { force: true });
  await db.$executeRawUnsafe(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
}

export function backupName(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `hashoval-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}

/** Keeps the newest `keep` database snapshots (and their image folders) in the backup directory. */
export async function pruneBackups(keep: number) {
  const files = (await readdir(BACKUP_DIR)).filter((f) => /^hashoval-.*\.db$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    await rm(path.join(BACKUP_DIR, f), { force: true });
    await rm(path.join(BACKUP_DIR, f.replace(/\.db$/, "-uploads")), { recursive: true, force: true });
  }
}

/** Copies the uploaded product images next to a snapshot. */
export async function copyUploads(to: string) {
  const from = UPLOAD_DIR;
  let names: string[] = [];
  try {
    names = await readdir(from);
  } catch {
    return 0;
  }
  await mkdir(to, { recursive: true });
  for (const n of names) if ((await stat(path.join(from, n))).isFile()) await copyFile(path.join(from, n), path.join(to, n));
  return names.length;
}
