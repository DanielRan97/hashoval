"use client";

import { useActionState } from "react";
import { saveSettings } from "../../actions";

const FIELDS: [string, string][] = [
  ["spillagePercent", "פחת (%)"],
  ["multiplier2ml", "מקדם 2 מ״ל"],
  ["multiplier5ml", "מקדם 5 מ״ל"],
  ["multiplier10ml", "מקדם 10 מ״ל"],
  ["packagingCostPerUnit", "עלות אריזה ליחידה (₪)"],
  ["paymentFeePercent", "עמלת סליקה (%)"],
  ["freeShippingThreshold", "משלוח חינם מעל (₪)"],
  ["standardShippingCost", "עלות משלוח רגיל (₪)"],
  ["lowStockThresholdMl", "עומד להיגמר מתחת ל- (מ״ל נטו)"],
  ["outOfStockThresholdMl", "אזל מתחת ל- (מ״ל נטו)"],
];

export function SettingsForm({ values }: { values: Record<string, number | string | null> }) {
  const [msg, action, pending] = useActionState(saveSettings, null);
  return (
    <form action={action} className="form">
      {FIELDS.map(([key, label]) => (
        <label key={key}>
          {label}
          <input type="number" name={key} step="any" min={0} defaultValue={values[key] ?? ""} required />
        </label>
      ))}
      {msg && <p className={msg === "נשמר" ? "muted" : "error"}>{msg}</p>}
      <button className="btn" disabled={pending}>שמירה</button>
    </form>
  );
}
