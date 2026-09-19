import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BACKUP_DIR, backupName, copyUploads, pruneBackups, snapshotDatabase } from "../src/lib/backup";
import { db } from "../src/lib/db";

// Usage: npm run backup            (keeps the newest 30 snapshots)
const KEEP = Number(process.env.BACKUP_KEEP ?? 30);

await mkdir(BACKUP_DIR, { recursive: true });
const name = backupName();
const dbFile = path.join(BACKUP_DIR, `${name}.db`);
await snapshotDatabase(dbFile);
const images = await copyUploads(path.join(BACKUP_DIR, `${name}-uploads`));
await pruneBackups(KEEP);
console.log(`Backup saved: ${dbFile} (+ ${images} images)`);
await db.$disconnect();
