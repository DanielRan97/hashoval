"use client";

import { useActionState, useState } from "react";
import { calculateSamplePrice } from "@/lib/pricing";
import { saveSettings } from "../../actions";

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "spillagePercent", label: "פחת (%)", hint: "כמה מהבושם הולך לאיבוד בכל מילוי. הוא מופחת מהכמות שאפשר למכור, ומייקר את עלות המ״ל האפקטיבית." },
  { key: "multiplier2ml", label: "מקדם 2 מ״ל", hint: "המקדם מוכפל בעלות הנוזל של הדוגמית (לא באריזה). מקדם גבוה יותר, מחיר גבוה יותר." },
  { key: "multiplier3ml", label: "מקדם 3 מ״ל", hint: "אותו חישוב עבור דוגמית של 3 מ״ל." },
  { key: "multiplier5ml", label: "מקדם 5 מ״ל", hint: "אותו חישוב עבור דוגמית של 5 מ״ל." },
  { key: "multiplier10ml", label: "מקדם 10 מ״ל", hint: "בדרך כלל הנמוך ביותר, כי גודל גדול יותר זול יותר למ״ל." },
  { key: "packagingCostPerUnit", label: "עלות אריזה ליחידה (₪)", hint: "עלות קבועה לכל דוגמית (בקבוקון, אריזה). מתווספת למחיר ולא מוכפלת במקדם." },
  { key: "paymentFeePercent", label: "עמלת סליקה (%)", hint: "העמלה שחברת הסליקה גובה. המחיר ללקוח כבר כולל אותה, כך שהעסק נשאר עם המחיר המתוכנן." },
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

  const valid = Number(bottlePrice) > 0 && Number(bottleMl) > 0 && Number(v.spillagePercent) < 100;

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
          <div className="breakdowns-list">
            {SIZES.map(([size, key]) => {
              const r = calculateSamplePrice({
                bottlePrice: Number(bottlePrice),
                bottleVolume: Number(bottleMl),
                sampleSize: size,
                multiplier: Number(v[key]),
                wastagePercent: Number(v.spillagePercent),
                packagingCost: Number(v.packagingCostPerUnit),
                paymentFeePercent: Number(v.paymentFeePercent),
              });
              const ok = Number.isFinite(r.finalPrice);
              const f = (n: number) => `₪${n.toFixed(2)}`;
              return (
                <div key={size} className="breakdown">
                  <div className="breakdown-head">
                    <strong>{size} מ״ל</strong>
                    <span className="breakdown-final">{ok ? `₪${r.finalPrice}` : "—"}</span>
                  </div>
                  {ok && (
                    <dl>
                      <div><dt>עלות נוזל</dt><dd>{f(r.liquidCost)}</dd></div>
                      <div><dt>נוזל אחרי מקדם</dt><dd>{f(r.liquidWithMultiplier)}</dd></div>
                      <div><dt>אריזה</dt><dd>{f(r.packagingCost)}</dd></div>
                      <div><dt>מחיר לפני סליקה</dt><dd>{f(r.priceBeforeFees)}</dd></div>
                      <div><dt>עמלת סליקה</dt><dd>{f(r.paymentFee)}</dd></div>
                      <div><dt>מחיר למ״ל</dt><dd>{f(r.pricePerMl)}</dd></div>
                    </dl>
                  )}
                </div>
              );
            })}
            <p className="muted breakdown-note">עלות מ״ל אפקטיבית (אחרי פחת): ₪{(Number(bottlePrice) / (Number(bottleMl) * (1 - Number(v.spillagePercent) / 100))).toFixed(2)}. המחיר הסופי מעוגל כלפי מעלה לשקל שלם. המשלוח לא כלול.</p>
          </div>
        ) : (
          <p className="muted">הזן מחיר ונפח תקינים.</p>
        )}
      </aside>
    </div>
  );
}
