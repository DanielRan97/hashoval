import { latestBackupTime } from "@/lib/backup";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const last = await latestBackupTime();
  const hours = last ? (Date.now() - last.getTime()) / 3_600_000 : null;
  // the server saves one every night, so anything older than a day and a bit is worth a look
  const ok = hours !== null && hours <= 26;
  return (
    <>
      <h1>גיבוי</h1>
      <p className={ok ? "backup-status ok" : "backup-status late"} role="status">
        <span className="backup-dot" aria-hidden="true" />
        {last
          ? `גיבוי אוטומטי אחרון: ${last.toLocaleDateString("he-IL")} ${last.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}${ok ? "" : " (לפני יותר מיום, כדאי לבדוק)"}`
          : "עוד לא נוצר גיבוי אוטומטי בשרת"}
      </p>
      <p>
        הגיבוי כולל את כל הנתונים: בשמים ומלאי, הזמנות, פרטי לקוחות, חברות והגדרות. הוא לא כולל את תמונות
        המוצרים, שנשמרות בנפרד.
      </p>
      <p>
        <a className="btn" href="/admin/backup/download" download>הורדת גיבוי עכשיו</a>
      </p>
      <p className="muted">
        זה קובץ מסד נתונים, ולכן הוא לא נפתח בלחיצה כפולה. הוא מיועד רק לשחזור. לדוח שאפשר לפתוח ב-Excel, השתמש
        ב"ייצוא" בעמוד ההכנסות.
      </p>
      <p className="muted">
        הקובץ מכיל פרטי לקוחות, ולכן כדאי לשמור אותו במקום פרטי ומאובטח. מומלץ להוריד גיבוי פעם בשבוע ולפני כל
        שינוי גדול, ולשמור אותו מחוץ למחשב הזה (למשל בענן פרטי).
      </p>

      <h2>גיבוי אוטומטי בשרת</h2>
      <p>
        הפקודה <code dir="ltr">npm run backup</code> שומרת גיבוי מתוארך בתיקיית <code dir="ltr">backups</code>, יחד עם תמונות
        המוצרים, ושומרת את 30 האחרונים. אפשר להפעיל אותה כל לילה מהתזמון של השרת.
      </p>

      <h2>שחזור</h2>
      <ol>
        <li>עוצרים את האתר.</li>
        <li>מחליפים את קובץ המסד של האתר בקובץ הגיבוי (באותו שם).</li>
        <li>מפעילים מחדש את האתר.</li>
      </ol>
    </>
  );
}
