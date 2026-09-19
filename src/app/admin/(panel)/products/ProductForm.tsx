"use client";

import { useActionState, useState, useTransition } from "react";
import { addBrand, saveProduct } from "../../actions";

type Values = {
  brand: string; name: string; description: string; bottleSizeMl: number;
  marketValuePerBottle: number; isActive: boolean; imageUrl: string | null;
};

const empty: Values = {
  brand: "", name: "", description: "", bottleSizeMl: 100,
  marketValuePerBottle: 0, isActive: true, imageUrl: null,
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
  return (
    <form action={action} className="form">
      <BrandPicker initialBrands={brands} initial={values.brand} />
      <label>שם הבושם<input name="name" defaultValue={values.name} required /></label>
      <label>תיאור קצר<textarea name="description" rows={3} defaultValue={values.description} /></label>
      <label>
        תמונה
        {values.imageUrl && <img className="thumb" src={values.imageUrl} alt="" />}
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" />
      </label>
      <label>גודל בקבוק מקורי (מ״ל)<input type="number" name="bottleSizeMl" min={1} step={1} defaultValue={values.bottleSizeMl} required /></label>
      <label>ערך שוק לבקבוק מלא (₪)<input type="number" name="marketValuePerBottle" min={1} step="any" defaultValue={values.marketValuePerBottle || ""} required /></label>
      <label className="check"><input type="checkbox" name="isActive" defaultChecked={values.isActive} />פעיל בחנות</label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={pending}>שמירה</button>
    </form>
  );
}
