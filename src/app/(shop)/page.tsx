import Link from "next/link";
import { getStoreProducts, minPrice } from "@/lib/catalog";
import { getSettings } from "@/lib/db";
import { ProductCard } from "./ProductCard";
import { Showcase, type ShowcaseItem } from "./Showcase";

export const dynamic = "force-dynamic";

/** Fisher-Yates; the page is rendered per request, so every visitor sees a different ten. */
function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Home: a strip of ten random perfumes that are in stock, then the perfumes marked as recommended in the admin. */
export default async function Home() {
  const [all, s] = await Promise.all([getStoreProducts(), getSettings()]);
  const featured = all.filter((p) => p.isFeatured);
  const showable: ShowcaseItem[] = all
    .filter((p) => p.stock !== "out" && p.images.length > 0)
    .map((p) => {
      const min = minPrice(p.options);
      return {
        id: p.id,
        brand: p.brand,
        name: p.name,
        image: p.images[0],
        price: min === null ? "" : p.options.length === 1 ? `₪${min}` : `החל מ-₪${min}`,
      };
    });
  return (
    <>
      <h1 className="sr-only">hashoval</h1>
      {showable.length > 0 && <Showcase all={showable} initial={shuffle(showable).slice(0, 10)} />}
      <p className="intro-line">
        דוגמיות מקוריות · 2, 5 או 10 מ״ל · משלוח חינם מעל ₪{s.freeShippingThreshold}
      </p>
      <section className="container recs">
        {featured.length > 0 && (
          <>
            <h2 className="recs-title">המומלצים שלנו</h2>
            <div className="grid">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </>
        )}
        {all.length === 0 && <p className="muted">הבשמים יתווספו בקרוב.</p>}
        {all.length > 0 && (
          <p className="all-link"><Link href="/shop" className="btn ghost">לכל הבשמים</Link></p>
        )}
      </section>
    </>
  );
}
