import Link from "next/link";
import { getStoreProducts, minPrice, type StoreProduct } from "@/lib/catalog";
import { getSettings } from "@/lib/db";
import { Favorite } from "./Favorite";
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

/**
 * The favourite: the in-stock perfume that is best on views and on units bought together. Each is
 * measured against the best of all, so neither one drowns the other. Nothing until there is some data.
 */
function favoriteOf(all: StoreProduct[]) {
  const pool = all.filter((p) => p.stock !== "out" && p.images.length > 0);
  const maxViews = Math.max(0, ...pool.map((p) => p.views));
  const maxSold = Math.max(0, ...pool.map((p) => p.sold));
  const score = (p: StoreProduct) => (maxViews ? p.views / maxViews : 0) + (maxSold ? p.sold / maxSold : 0);
  const best = [...pool].sort((a, b) => score(b) - score(a) || b.sold - a.sold || b.views - a.views)[0];
  return best && score(best) > 0 ? best : null;
}

/** Home: a strip of ten random perfumes that are in stock, then the perfumes marked as recommended in the admin. */
export default async function Home() {
  const [all, s] = await Promise.all([getStoreProducts(), getSettings()]);
  const featured = all.filter((p) => p.isFeatured);
  const favorite = favoriteOf(all);
  const mostViewed = all.filter((p) => p.stock !== "out" && p.views > 0).sort((a, b) => b.views - a.views).slice(0, 8);
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
        דוגמיות מקוריות · 2, 3, 5 או 10 מ״ל · משלוח חינם מעל ₪{s.freeShippingThreshold}
      </p>
      <section className="container recs">
        {featured.length > 0 && (
          <>
            <h2 className="recs-title">המומלצים שלנו</h2>
            <div className="grid">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </>
        )}
        {favorite && <Favorite p={favorite} />}
        {mostViewed.length > 0 && (
          <>
            <h2 className="recs-title">הנצפים ביותר</h2>
            <div className="grid grid-4">{mostViewed.map((p) => <ProductCard key={p.id} p={p} />)}</div>
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
