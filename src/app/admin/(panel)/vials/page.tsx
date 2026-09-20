import { getSettings } from "@/lib/db";
import { VialsForm } from "./VialsForm";

export const dynamic = "force-dynamic";

export default async function VialsPage() {
  const s = await getSettings();
  return (
    <>
      <h1>מלאי בקבוקוני דוגמית</h1>
      <p className="muted prose">
        כמה בקבוקונים ריקים יש לך מכל גודל. כל הזמנה מורידה בקבוקון לכל דוגמית, וגודל שאזל לא מוצע ללקוחות
        (גם אם יש מספיק בושם). כשהזמנה מבוטלת או פגה הבקבוקונים חוזרים. כל עוד לא הזנת כמות, הגודל לא נמכר.
      </p>
      <VialsForm values={s} />
    </>
  );
}
