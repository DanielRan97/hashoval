import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreProducts } from "@/lib/catalog";
import { GENDER_LABELS } from "@/lib/gender";
import { ProductGallery } from "../../Gallery";
import { ProductCard } from "../../ProductCard";
import { ReadMore } from "./ReadMore";
import { SizePicker } from "./SizePicker";
import { ViewTracker } from "./ViewTracker";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await getStoreProducts();
  const p = all.find((x) => x.id === Number(id));
  if (!p) notFound();
  // more to look at: the same brand first, then the same audience; only what can be bought
  const others = all.filter((x) => x.id !== p.id && x.stock !== "out" && x.images.length > 0);
  const similar = [...others.filter((x) => x.brand === p.brand), ...others.filter((x) => x.brand !== p.brand && x.gender === p.gender)].slice(0, 4);
  return (
    <div className="container">
      <nav className="crumbs" aria-label="מיקום באתר">
        <Link href="/shop">חנות</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/shop?brand=${encodeURIComponent(p.brand)}`}>{p.brand}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{p.name}</span>
      </nav>
      <div className="product">
        <ViewTracker productId={p.id} />
        <ProductGallery images={p.images} alt={`${p.brand} ${p.name}`} />
        <div className="product-info">
          <div className="card-brand" style={{ paddingInline: 0, marginTop: 0 }}>{p.brand} · {GENDER_LABELS[p.gender]}</div>
          <h1>{p.name}</h1>
          {p.description.trim() && <ReadMore text={p.description.trim()} />}
          <SizePicker productId={p.id} sizes={p.sizes} stock={p.stock} />
        </div>
      </div>
      {similar.length > 0 && (
        <section className="recs">
          <h2 className="recs-title">אולי יעניין אותך</h2>
          <div className="grid grid-4">{similar.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </div>
  );
}
