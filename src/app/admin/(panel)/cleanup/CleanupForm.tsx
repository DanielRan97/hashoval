"use client";

import { useActionState } from "react";
import { ConfirmButton } from "../ConfirmButton";
import { deleteAllOrders } from "./actions";

export function CleanupForm() {
  const [msg, action, pending] = useActionState(deleteAllOrders, null);
  return (
    <form action={action} className="form">
      <label>
        להקליד את המילה &quot;מחק&quot; לאישור
        <input name="confirm" autoComplete="off" required />
      </label>
      <ConfirmButton className="btn danger" danger disabled={pending} title="מחיקת כל ההזמנות" confirmLabel="מחק הכל" message="למחוק את כל ההזמנות לצמיתות? אי אפשר לשחזר.">
        מחיקת כל ההזמנות
      </ConfirmButton>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
