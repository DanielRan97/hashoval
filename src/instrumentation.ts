export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // The server runs on UTC; dates shown in the admin, month and day totals, and backup names are
  // Israeli time. Node applies a change to TZ at once. A TZ set in the hosting settings wins.
  process.env.TZ ||= "Asia/Jerusalem";
  // Only the real server process, and only in production; AUTO_BACKUP=off turns it off.
  if (process.env.NODE_ENV !== "production" || process.env.AUTO_BACKUP === "off") return;
  const { startBackupScheduler } = await import("@/lib/backupScheduler");
  startBackupScheduler();
}
