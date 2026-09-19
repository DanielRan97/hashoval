import { ensureRecentBackup } from "@/lib/backup";

const HOUR_MS = 3_600_000;

/**
 * Automatic backups: shortly after the server starts, and then every hour, it makes a backup if
 * the last one is older than a day. This lives inside the site because the volume can only be
 * attached to one service, so a separate cron service could not reach the database file.
 */
export function startBackupScheduler() {
  const run = async () => {
    try {
      const file = await ensureRecentBackup();
      if (file) console.log(`Automatic backup saved: ${file}`);
    } catch (e) {
      console.error("Automatic backup failed", e);
    }
  };
  setTimeout(run, 60_000).unref();
  setInterval(run, HOUR_MS).unref();
}
