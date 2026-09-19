import { createBackup } from "../src/lib/backup";
import { db } from "../src/lib/db";

// Usage: npm run backup   (keeps the newest 30 snapshots, see BACKUP_KEEP)
const { file, newImages } = await createBackup();
console.log(`Backup saved: ${file} (+ ${newImages} new images)`);
await db.$disconnect();
