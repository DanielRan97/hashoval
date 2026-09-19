"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";

type Option = { size: number; price: number };

export function SizePicker({ productId, options }: { productId: number; options: Option[] }) {
  const [size, setSize] = useState(options[0].size);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const price = options.find((o) => o.size === size)!.price;
  return (
    <div>
      <div className="sizes" role="radiogroup" aria-label="גודל דוגמית">
        {options.map((o) => (
          <button
            key={o.size}
            type="button"
            role="radio"
            aria-checked={o.size === size}
            className={o.size === size ? "size active" : "size"}
            onClick={() => {
              setSize(o.size);
              setAdded(false);
            }}
          >
            {o.size} מ״ל
          </button>
        ))}
      </div>
      <div className="price">₪{price}</div>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            add(productId, size);
            setAdded(true);
          }}
        >
          הוספה לסל
        </button>
        {added && (
          <span className="muted" role="status">
            נוסף לסל · <Link href="/cart">לסל</Link>
          </span>
        )}
      </div>
    </div>
  );
}
