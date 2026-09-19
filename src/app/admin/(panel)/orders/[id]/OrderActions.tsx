"use client";

import { useState } from "react";
import { orderAction, type OrderActionKind, type OrderActionResult } from "../actions";
import { ConfirmButton } from "../../ConfirmButton";
import { AUTO_COMPLETE_DAYS } from "@/lib/autoComplete";

/**
 * Buttons for the order's current status. The result message lives here, not in each form:
 * after an action the status changes and the form that ran it disappears, but the message
 * (for example a refund result) must stay on screen.
 */
export function OrderActions({ id, status, paid }: { id: number; status: string; paid: boolean }) {
  const [result, setResult] = useState<OrderActionResult>(null);
  const [pending, setPending] = useState(false);

  const run = (kind: OrderActionKind) => async (form: FormData) => {
    setPending(true);
    try {
      setResult(await orderAction(id, kind, form));
    } finally {
      setPending(false);
    }
  };

  const cancellable = ["paid", "pending_approval", "approved"].includes(status);
  return (
    <div className="order-actions">
      {result && <p className={result.ok ? "notice" : "error"} role="status">{result.msg}</p>}

      {status === "paid" && (
        <form action={run("shipped")} className="action-row">
          <input name="trackingNumber" placeholder="מספר מעקב" required />
          <button className="btn" disabled={pending}>סימון כנשלח</button>
        </form>
      )}
      {status === "shipped" && (
        <form action={run("completed")} className="action-row">
          <button className="btn" disabled={pending}>סימון כהושלם</button>
          <span className="muted">אין חובה: הזמנה שנשלחה נסגרת לבד אחרי {AUTO_COMPLETE_DAYS} ימים.</span>
        </form>
      )}

      {cancellable && (
        <form action={run("cancel")} className="form cancel">
          <label>
            סיבה (תישלח ללקוח במייל)
            <input name="reason" defaultValue="הבושם אזל מהמלאי" required />
          </label>
          {status !== "pending_approval" && (
            <label className="check">
              <input type="checkbox" name="restock" />
              החזרת המ״ל למלאי
            </label>
          )}
          <ConfirmButton
            className="btn danger"
            disabled={pending}
            danger
            title="אישור ביטול הזמנה"
            message={
              paid
                ? "ההזמנה תבוטל, הלקוח יקבל החזר כספי אוטומטי ומייל עם הסיבה. אי אפשר לבטל את הפעולה."
                : "ההזמנה תבוטל והלקוח יקבל מייל עם הסיבה. אי אפשר לבטל את הפעולה."
            }
            confirmLabel="ביטול הזמנה"
          >
            ביטול הזמנה{paid ? " והחזר כספי" : ""}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
