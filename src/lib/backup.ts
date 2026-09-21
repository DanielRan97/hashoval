import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { BACKUP_DIR, UPLOAD_DIR } from "@/lib/paths";

export { BACKUP_DIR };

const DAY_MS = 86_400_000;
export const KEEP_BACKUPS = Number(process.env.BACKUP_KEEP ?? 30);

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

async function snapshots() {
  try {
    return (await readdir(BACKUP_DIR)).filter((f) => /^hashoval-.*\.db$/.test(f)).sort();
  } catch {
    return [];
  }
}

/** Keeps the newest `keep` database snapshots. */
export async function pruneBackups(keep: number) {
  const files = await snapshots();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) await rm(path.join(BACKUP_DIR, f), { force: true });
}

/**
 * Mirrors the uploaded product images into one folder next to the snapshots. Image file names
 * are random and never reused, so copying only the missing ones keeps it cheap.
 */
export async function mirrorUploads() {
  let names: string[] = [];
  try {
    names = await readdir(UPLOAD_DIR);
  } catch {
    return 0;
  }
  const to = path.join(BACKUP_DIR, "uploads");
  await mkdir(to, { recursive: true });
  let copied = 0;
  for (const n of names) {
    const src = path.join(UPLOAD_DIR, n);
    if (!(await stat(src)).isFile()) continue;
    try {
      await stat(path.join(to, n));
    } catch {
      await copyFile(src, path.join(to, n));
      copied++;
    }
  }
  return copied;
}

/** One full backup: a dated database snapshot plus the images. */
export async function createBackup() {
  await mkdir(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `${backupName()}.db`);
  await snapshotDatabase(file);
  const newImages = await mirrorUploads();
  await pruneBackups(KEEP_BACKUPS);
  return { file, newImages };
}

/** Makes a backup unless there already is one from the last 24 hours. Returns the file, or null if none was needed. */
export async function ensureRecentBackup(now = Date.now()) {
  const files = await snapshots();
  const last = files[files.length - 1];
  if (last && now - (await stat(path.join(BACKUP_DIR, last))).mtimeMs < DAY_MS) return null;
  return (await createBackup()).file;
}

/** When the newest database snapshot was written, or null if there is none. */
export async function latestBackupTime(): Promise<Date | null> {
  const files = await snapshots();
  const last = files[files.length - 1];
  if (!last) return null;
  try {
    return (await stat(path.join(BACKUP_DIR, last))).mtime;
  } catch {
    return null;
  }
}
