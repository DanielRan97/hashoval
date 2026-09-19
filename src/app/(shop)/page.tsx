import Link from "next/link";
import { getStoreProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/db";
import { Hero } from "./Hero";
import { ProductCard } from "./ProductCard";

export const dynamic = "force-dynamic";

/** Home: the showcase, then the perfumes marked as recommended in the admin. */
export default async function Home() {
  const [all, s] = await Promise.all([getStoreProducts(), getSettings()]);
  const featured = all.filter((p) => p.isFeatured);
  return (
    <>
      <Hero />
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
