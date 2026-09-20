import Link from "next/link";
import { minPrice, type StoreProduct } from "@/lib/catalog";
import { GENDER_LABELS } from "@/lib/gender";
import { STOCK_LABELS } from "@/lib/stock";
import { Gallery } from "./Gallery";

/** A bare photo with square corners (moving the mouse over it flips through the product's photos), and the details in a glass panel beneath. */
export function ProductCard({ p }: { p: StoreProduct }) {
  const min = minPrice(p.options);
  const single = p.options.length === 1;
  return (
    <Link href={`/product/${p.id}`} className={p.stock === "out" ? "card sold-out" : "card"}>
      <div className="card-media">
        <Gallery images={p.images} alt={`${p.brand} ${p.name}`} scrub />
      </div>
      <div className="card-info">
        <div className="card-brand">{p.brand} · {GENDER_LABELS[p.gender]}</div>
        <div className="card-name">{p.name}</div>
        <div className="card-meta">
          {min !== null && <span className="card-price">{single ? `₪${min}` : `החל מ-₪${min}`}</span>}
        </div>
        {/* small, in the bottom left corner */}
        {p.stock !== "ok" && <span className={`badge sm card-stock ${p.stock}`}>{STOCK_LABELS[p.stock]}</span>}
      </div>
    </Link>
  );
}
