import { db, getSettings } from "@/lib/db";
import { INCOME_STATUSES } from "@/lib/orderFlow";
import { VIAL_SIZES, vialStock } from "@/lib/vials";
import { VialsForm } from "./VialsForm";

export const dynamic = "force-dynamic";

export default async function VialsPage() {
  const s = await getSettings();
  // how fast each size sells, from the last 30 days; needs a few sales before an estimate means anything
  const since = new Date(Date.now() - 30 * 86_400_000);
  const sold = await db.orderItem.groupBy({
    by: ["decantSizeMl"],
    _sum: { quantity: true },
    where: { order: { status: { in: INCOME_STATUSES }, refundedAt: null, OR: [{ paidAt: { gte: since } }, { paidAt: null, createdAt: { gte: since } }] } },
  });
  const usedBySize = new Map(sold.map((r) => [r.decantSizeMl, r._sum.quantity ?? 0]));
  const daysLeft: Record<number, number | null> = {};
  for (const size of VIAL_SIZES) {
    const used = usedBySize.get(size) ?? 0;
    daysLeft[size] = used >= 5 ? Math.floor(vialStock(s, size) / (used / 30)) : null;
  }
  return (
    <>
      <h1>מלאי בקבוקוני דוגמית</h1>
      <p className="muted prose">
        כמה בקבוקונים ריקים יש לך מכל גודל. כל הזמנה מורידה בקבוקון לכל דוגמית, וגודל שאזל לא מוצע ללקוחות
        (גם אם יש מספיק בושם). כשהזמנה מבוטלת או פגה הבקבוקונים חוזרים. כל עוד לא הזנת כמות, הגודל לא נמכר.
      </p>
      <VialsForm values={s} daysLeft={daysLeft} />
    </>
  );
}
