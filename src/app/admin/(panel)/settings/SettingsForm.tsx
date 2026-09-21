"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "../../actions";

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "spillagePercent", label: "פחת (%)", hint: "כמה מהבושם הולך לאיבוד בכל מילוי. הוא מופחת מהכמות שאפשר למכור." },
  { key: "multiplier2ml", label: "מקדם 2 מ״ל", hint: "מחיר דוגמית = מחיר למ״ל × הגודל × המקדם. מקדם גבוה יותר, מחיר גבוה יותר." },
  { key: "multiplier3ml", label: "מקדם 3 מ״ל", hint: "אותו חישוב עבור דוגמית של 3 מ״ל." },
  { key: "multiplier5ml", label: "מקדם 5 מ״ל", hint: "אותו חישוב עבור דוגמית של 5 מ״ל." },
  { key: "multiplier10ml", label: "מקדם 10 מ״ל", hint: "בדרך כלל הנמוך ביותר, כי גודל גדול יותר זול יותר למ״ל." },
  { key: "packagingCostPerUnit", label: "עלות אריזה ליחידה (₪)", hint: "עלות הבקבוקון והאריזה של דוגמית אחת." },
  { key: "paymentFeePercent", label: "עמלת סליקה (%)", hint: "העמלה שחברת הסליקה גובה מכל תשלום." },
  { key: "freeShippingThreshold", label: "משלוח חינם מעל (₪)", hint: "הזמנה בסכום הזה ומעלה מקבלת משלוח חינם." },
  { key: "standardShippingCost", label: "עלות משלוח רגיל (₪)", hint: "המחיר של משלוח בהזמנה מתחת לסף." },
  { key: "lowStockThresholdMl", label: "עומד להיגמר מתחת ל- (מ״ל נטו)", hint: "מתחת לכמות הזו הבושם מסומן \"עומד להיגמר\" ומופיע בלוח הבקרה." },
  { key: "outOfStockThresholdMl", label: "אזל מתחת ל- (מ״ל נטו)", hint: "מתחת לכמות הזו הבושם מסומן \"אזל\" ולא נמכר." },
];
const SIZES: [number, string][] = [[2, "multiplier2ml"], [3, "multiplier3ml"], [5, "multiplier5ml"], [10, "multiplier10ml"]];

export function SettingsForm({ values }: { values: Record<string, number | string | null> }) {
  const [msg, action, pending] = useActionState(saveSettings, null);
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(values[f.key] ?? "")])));
  const [bottlePrice, setBottlePrice] = useState("500");
  const [bottleMl, setBottleMl] = useState("100");

  const perMl = Number(bottlePrice) / Number(bottleMl);
  const valid = Number.isFinite(perMl) && perMl > 0;

  return (
    <div className="settings-grid">
      <form action={action} className="form">
        {FIELDS.map((f) => (
          <label key={f.key}>
            {f.label}
            <input type="number" name={f.key} step="any" min={0} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} required />
            <span className="hint">{f.hint}</span>
          </label>
        ))}
        {msg && <p className={msg === "נשמר" ? "muted" : "error"}>{msg}</p>}
        <button className="btn" disabled={pending}>שמירה</button>
      </form>

      <aside className="price-example" aria-label="דוגמת חישוב מחיר">
        <h2>דוגמת חישוב</h2>
        <p className="muted">משתנה יחד עם המקדמים בטופס, עוד לפני השמירה.</p>
        <div className="price-example-inputs">
          <label>מחיר בקבוק (₪)<input type="number" min={1} value={bottlePrice} onChange={(e) => setBottlePrice(e.target.value)} /></label>
          <label>נפח (מ״ל)<input type="number" min={1} value={bottleMl} onChange={(e) => setBottleMl(e.target.value)} /></label>
        </div>
        {valid ? (
          <table>
            <thead><tr><th>גודל</th><th>מחיר</th><th>למ״ל</th></tr></thead>
            <tbody>
              {SIZES.map(([size, key]) => {
                const mult = Number(v[key]);
                const price = Math.round(perMl * size * mult);
                return (
                  <tr key={size}>
                    <td>{size} מ״ל</td>
                    <td className="nowrap">{Number.isFinite(price) ? `₪${price}` : "—"}</td>
                    <td className="nowrap">{Number.isFinite(price) ? `₪${Number((price / size).toFixed(1))}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">הזן מחיר ונפח תקינים.</p>
        )}
      </aside>
    </div>
  );
}
