import { db } from "@/lib/db";
import { CleanupForm } from "./CleanupForm";

export const dynamic = "force-dynamic";

export default async function Cleanup() {
  const orders = await db.order.count();
  return (
    <>
      <h1>ניקוי הזמנות בדיקה</h1>
      <p className="muted">עמוד זמני. כרגע יש {orders} הזמנות. המחיקה סופית, גם ההכנסות שלהן נמחקות.</p>
      <CleanupForm />
    </>
  );
}
