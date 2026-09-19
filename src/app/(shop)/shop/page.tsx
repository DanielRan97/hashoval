import Link from "next/link";
import { getStoreProducts, latestIds, LATEST_COUNT } from "@/lib/catalog";
import { ProductCard } from "../ProductCard";

export const dynamic = "force-dynamic";

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; inStock?: string; new?: string }>;
}) {
  const { brand, inStock, new: latest } = await searchParams;
  const all = await getStoreProducts();
  const brands = [...new Set(all.map((p) => p.brand))].sort();
  const newest = latestIds(all);
  const filtered = all.filter(
    (p) => (!brand || p.brand === brand) && (!inStock || p.stock !== "out") && (!latest || newest.has(p.id)),
  );
  // "Latest" shows the newest first; otherwise keep the alphabetical order.
  const products = latest ? filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) : filtered;

  const href = (next: { brand?: string; inStock?: boolean; latest?: boolean }) => {
    const params = new URLSearchParams();
    const b = "brand" in next ? next.brand : brand;
    const i = "inStock" in next ? next.inStock : !!inStock;
    const n = "latest" in next ? next.latest : !!latest;
    if (b) params.set("brand", b);
    if (i) params.set("inStock", "1");
    if (n) params.set("new", "1");
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <div className="container">
      <h1>חנות</h1>
      <div className="filters">
        <Link href={href({ brand: undefined })} className={!brand ? "active" : undefined}>הכל</Link>
        {brands.map((b) => (
          <Link key={b} href={href({ brand: b })} className={brand === b ? "active" : undefined}>{b}</Link>
        ))}
      </div>
      <div className="filters">
        <Link href={href({ inStock: !inStock })} className={inStock ? "active" : undefined} aria-pressed={!!inStock}>
          {inStock ? "✓ " : ""}הצג רק מוצרים במלאי
        </Link>
        <Link href={href({ latest: !latest })} className={latest ? "active" : undefined} aria-pressed={!!latest}>
          {latest ? "✓ " : ""}{LATEST_COUNT} החדשים ביותר
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="muted">אין כרגע בשמים להצגה.</p>
      ) : (
        <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </div>
  );
}
