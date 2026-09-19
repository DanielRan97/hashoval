"use client";

import { useActionState } from "react";
import { adjustStock, type AddStockResult } from "../../../actions";
import { ConfirmButton } from "../../ConfirmButton";

export function AddStockForm({ productId, productName, currentMl }: { productId: number; productName: string; currentMl: number }) {
  const [result, action, pending] = useActionState<AddStockResult | null, FormData>(adjustStock.bind(null, productId), null);

  const describe = (verb: "להוסיף" | "להוריד", sign: 1 | -1) => (form: HTMLFormElement) => {
    const ml = Number(new FormData(form).get("ml"));
    const after = currentMl + sign * ml;
    const tail = after >= 0 ? ` במלאי יש כרגע ${currentMl.toFixed(1)} מ״ל, אחרי הפעולה: ${after.toFixed(1)} מ״ל.` : "";
    return `${verb} ${ml} מ״ל ${sign === 1 ? "למלאי של" : "מהמלאי של"} ${productName}?${tail}`;
  };

  return (
    <form action={action} className="add-stock" key={result?.ok ? result.message : "form"}>
      <strong>עדכון מלאי</strong>
      <p className="muted">
        במלאי כרגע: {currentMl.toFixed(1)} מ״ל. "הוספה" מוסיפה לכמות הקיימת (למשל 3 בקבוקים של 100 מ״ל = 300).
        "הורדה" מפחיתה ממנה, למקרה של טעות.
      </p>
      <div className="action-row">
        <input type="number" name="ml" min={0.1} step="any" placeholder="כמה מ״ל" required aria-label="מ״ל" />
        <ConfirmButton className="btn" name="direction" value="add" disabled={pending} title="אישור הוספת מלאי" message={describe("להוסיף", 1)} confirmLabel="הוספה">
          הוספה למלאי
        </ConfirmButton>
        <ConfirmButton className="btn ghost" name="direction" value="remove" disabled={pending} title="אישור הורדת מלאי" message={describe("להוריד", -1)} confirmLabel="הורדה" danger>
          הורדה מהמלאי
        </ConfirmButton>
      </div>
      {result && <p className={result.ok ? "muted" : "error"} role="status">{result.ok ? result.message : result.error}</p>}
    </form>
  );
}
