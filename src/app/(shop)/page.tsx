import Link from "next/link";
import { getStoreProducts } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const featured = (await getStoreProducts()).filter((p) => p.stock !== "out").slice(0, 3);
  return (
    <>
      <section className="hero">
        <h1>השובל שלך.<br />בלי פשרות, בלי הימורים.</h1>
        <p>דוגמיות מקוריות מהבשמים הטובים בעולם, ישירות מהבקבוק. 2, 5 או 10 מ״ל — כדי לבחור בביטחון לפני שקונים בקבוק שלם.</p>
        <Link href="/shop" className="btn">לחנות</Link>
      </section>
      {featured.length > 0 && (
        <section className="container">
          <h2>מבחר</h2>
          <div className="grid">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}
    </>
  );
}
