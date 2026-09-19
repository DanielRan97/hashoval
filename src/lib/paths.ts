import path from "node:path";

/**
 * Where files that must survive restarts live. In production point these at the persistent
 * volume (for example /data/uploads and /data/backups).
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "public", "uploads");
export const BACKUP_DIR = process.env.BACKUP_DIR?.trim() || path.join(process.cwd(), "backups");
