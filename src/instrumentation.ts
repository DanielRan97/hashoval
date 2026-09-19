export async function register() {
  // Only the real server process, and only in production; AUTO_BACKUP=off turns it off.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || process.env.AUTO_BACKUP === "off") return;
  const { startBackupScheduler } = await import("@/lib/backupScheduler");
  startBackupScheduler();
}
