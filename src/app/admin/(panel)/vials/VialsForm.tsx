"use client";

import { useActionState } from "react";
import { saveVials, type VialsResult } from "../../actions";
import { VIAL_SIZES, vialLevel, type VialSettings } from "@/lib/vials";

const LEVEL_LABEL = { ok: "תקין", low: "עומד להיגמר", out: "אזל" } as const;

export function VialsForm({ values, daysLeft }: { values: VialSettings; daysLeft: Record<number, number | null> }) {
  const [result, action, pending] = useActionState<VialsResult, FormData>(saveVials, null);
  return (
    <form action={action} className="form">
      {VIAL_SIZES.map((size) => {
        const level = vialLevel(values, size);
        return (
          <label key={size}>
            <span>
              בקבוקוני {size} מ״ל במלאי{" "}
              <span className={`badge sm ${level}`}>{LEVEL_LABEL[level]}</span>
            </span>
            <span className="hint">
              {daysLeft[size] === null ? "אין עדיין מספיק נתוני מכירות להערכה" : `בקצב המכירות של 30 הימים האחרונים: כ-${daysLeft[size]} ימים`}
            </span>
            <input type="number" name={`vials${size}`} min={0} step={1} defaultValue={values[`vials${size}ml` as const] ?? 0} required />
          </label>
        );
      })}
      <label>
        להתריע כשנשארו עד (בקבוקונים מכל גודל)
        <input type="number" name="vialLowThreshold" min={0} step={1} defaultValue={values.vialLowThreshold} required />
      </label>
      {result && <p className={result.ok ? "muted" : "error"} role="status">{result.msg}</p>}
      <button className="btn" disabled={pending}>שמירה</button>
    </form>
  );
}
