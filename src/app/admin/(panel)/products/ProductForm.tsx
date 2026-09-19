"use client";

import { useActionState, useState, useTransition } from "react";
import { addBrand, saveProduct } from "../../actions";
import { GENDERS, GENDER_LABELS } from "@/lib/gender";
import { ImageUploader } from "./ImageUploader";

type Values = {
  brand: string; name: string; description: string; bottleSizeMl: number;
  marketValuePerBottle: number; isActive: boolean; isFeatured: boolean; gender: string; images: string[];
};

const empty: Values = {
  brand: "", name: "", description: "", bottleSizeMl: 100,
  marketValuePerBottle: 0, isActive: true, isFeatured: false, gender: "unisex", images: [],
};

function BrandPicker({ initialBrands, initial }: { initialBrands: string[]; initial: string }) {
  const [brands, setBrands] = useState(initial && !initialBrands.includes(initial) ? [...initialBrands, initial] : initialBrands);
  const [brand, setBrand] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    start(async () => {
      const r = await addBrand(draft);
      if (!r.ok) return setError(r.error);
      setBrands(r.brands);
      setBrand(r.name);
      setDraft("");
      setError(null);
      setAdding(false);
    });
  }

  return (
    <div className="brand-picker">
      <label>
        חברה
        <span className="action-row">
          <select name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} required>
            <option value="" disabled>בחירת חברה…</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <button type="button" className="btn ghost" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            {adding ? "ביטול" : "+ חברה חדשה"}
          </button>
        </span>
      </label>
      {adding && (
        <div className="action-row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="שם החברה"
            autoFocus
          />
          <button type="button" className="btn" onClick={add} disabled={pending}>הוספה לרשימה</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function ProductForm({ id, brands, values = empty }: { id: number | null; brands: string[]; values?: Values }) {
  const [error, action, pending] = useActionState(saveProduct.bind(null, id), null);
  const [uploading, setUploading] = useState(false);
  return (
    <form action={action} className="form">
      <BrandPicker initialBrands={brands} initial={values.brand} />
      <label>שם הבושם<input name="name" defaultValue={values.name} required /></label>
      <label>תיאור קצר<textarea name="description" rows={3} defaultValue={values.description} /></label>
      <fieldset className="gender-pick">
        <legend>מיועד ל</legend>
        {GENDERS.map((g) => (
          <label key={g} className="check">
            <input type="radio" name="gender" value={g} defaultChecked={values.gender === g} required />
            {GENDER_LABELS[g]}
          </label>
        ))}
      </fieldset>
      <ImageUploader initial={values.images} onBusyChange={setUploading} />
      <label>גודל בקבוק מקורי (מ״ל)<input type="number" name="bottleSizeMl" min={1} step={1} defaultValue={values.bottleSizeMl} required /></label>
      <label>ערך שוק לבקבוק מלא (₪)<input type="number" name="marketValuePerBottle" min={1} step="any" defaultValue={values.marketValuePerBottle || ""} required /></label>
      <label className="check"><input type="checkbox" name="isActive" defaultChecked={values.isActive} />פעיל בחנות</label>
      <label className="check"><input type="checkbox" name="isFeatured" defaultChecked={values.isFeatured} />מומלץ (מוצג בדף הבית)</label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={pending || uploading}>{uploading ? "מעלה תמונות…" : "שמירה"}</button>
    </form>
  );
}
