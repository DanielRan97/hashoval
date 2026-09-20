"use client";

import { useActionState } from "react";
import { saveVials, type VialsResult } from "../../actions";
import { VIAL_SIZES, vialLevel, type VialSettings } from "@/lib/vials";

const LEVEL_LABEL = { untracked: "לא במעקב", ok: "תקין", low: "עומד להיגמר", out: "אזל" } as const;
const LEVEL_CLASS = { untracked: "", ok: "ok", low: "low", out: "out" } as const;

export function VialsForm({ values }: { values: VialSettings }) {
  const [result, action, pending] = useActionState<VialsResult, FormData>(saveVials, null);
  return (
    <form action={action} className="form">
      {VIAL_SIZES.map((size) => {
        const level = vialLevel(values, size);
        return (
          <label key={size}>
            <span>
              בקבוקוני {size} מ״ל במלאי{" "}
              {level !== "untracked" && <span className={`badge sm ${LEVEL_CLASS[level]}`}>{LEVEL_LABEL[level]}</span>}
            </span>
            <input type="number" name={`vials${size}`} min={0} step={1} defaultValue={values[`vials${size}ml` as const] ?? ""} placeholder="ריק = לא לעקוב" />
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
