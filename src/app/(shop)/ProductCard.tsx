import Link from "next/link";
import { minPrice, type StoreProduct } from "@/lib/catalog";
import { STOCK_LABELS } from "@/lib/stock";
import { ProductImage } from "./ProductImage";

export function ProductCard({ p }: { p: StoreProduct }) {
  const min = minPrice(p.options);
  const single = p.options.length === 1;
  return (
    <Link href={`/product/${p.id}`} className={p.stock === "out" ? "card sold-out" : "card"}>
      <ProductImage url={p.imageUrl} brand={p.brand} name={p.name} />
      <div className="card-brand">{p.brand}</div>
      <div className="card-name">{p.name}</div>
      <div className="card-meta">
        {min !== null && <span className="card-price">{single ? `₪${min}` : `החל מ-₪${min}`}</span>}
        <span className={`badge ${p.stock}`}>{STOCK_LABELS[p.stock]}</span>
      </div>
    </Link>
  );
}
