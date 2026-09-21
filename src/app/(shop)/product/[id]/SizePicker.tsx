"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { STOCK_LABELS, type StockLevel } from "@/lib/stock";

type Size = { size: number; price: number; available: boolean };

/** Every price is per size; a whole shekel per ml is shown without decimals, otherwise with one. */
const perMl = (price: number, size: number) => `₪${Number((price / size).toFixed(1))}`;

/**
 * One purchase block: the stock note next to the size choice, then the price and the button side by
 * side. All sizes are listed; the ones that cannot be bought right now are dimmed and cannot be picked.
 */
export function SizePicker({ productId, sizes, stock }: { productId: number; sizes: Size[]; stock: StockLevel }) {
  const firstFree = sizes.find((s) => s.available)?.size ?? null;
  const [size, setSize] = useState<number | null>(firstFree);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const chosen = sizes.find((s) => s.size === size && s.available);
  return (
    <div className="buy">
      <div className="buy-head">
        <span className="buy-label">גודל הדוגמית</span>
        <span className={`badge sm ${stock}`}>{STOCK_LABELS[stock]}</span>
      </div>
      <div className="sizes" role="radiogroup" aria-label="גודל דוגמית">
        {sizes.map((o) => (
          <button
            key={o.size}
            type="button"
            role="radio"
            aria-checked={o.size === size}
            disabled={!o.available}
            title={o.available ? undefined : "לא זמין כרגע"}
            className={["size", o.size === size ? "active" : "", o.available ? "" : "unavailable"].filter(Boolean).join(" ")}
            onClick={() => {
              setSize(o.size);
              setAdded(false);
            }}
          >
            {o.size} מ״ל
          </button>
        ))}
      </div>
      <div className="buy-foot">
        {chosen ? (
          <div className="buy-price">
            <span className="price">₪{chosen.price}</span>
            <span className="muted per-ml">{perMl(chosen.price, chosen.size)} למ״ל</span>
          </div>
        ) : (
          <div className="buy-price"><span className="muted">אין כרגע גודל זמין</span></div>
        )}
        <button
          type="button"
          className="btn"
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            add(productId, chosen.size);
            setAdded(true);
          }}
        >
          {chosen ? "הוספה לסל" : "המלאי אזל"}
        </button>
      </div>
      {added && (
        <p className="muted buy-note" role="status">
          נוסף לסל · <Link href="/cart">לסל</Link>
        </p>
      )}
    </div>
  );
}
