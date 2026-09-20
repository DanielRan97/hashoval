import Link from "next/link";
import { minPrice, type StoreProduct } from "@/lib/catalog";
import { GENDER_LABELS } from "@/lib/gender";
import { Gallery } from "./Gallery";

/** The perfume that was both looked at and bought the most: a big photo on one side, its story on the other. */
export function Favorite({ p }: { p: StoreProduct }) {
  const min = minPrice(p.options);
  return (
    <section className="favorite" aria-labelledby="favorite-title">
      <div className="favorite-photo">
        <Gallery images={p.images} alt={`${p.brand} ${p.name}`} />
      </div>
      <div className="favorite-info">
        <span className="favorite-tag">האהוב ביותר</span>
        <div className="card-brand">{p.brand} · {GENDER_LABELS[p.gender]}</div>
        <h2 id="favorite-title" className="favorite-name">{p.name}</h2>
        <p className="favorite-text">{p.description.trim() || "הבושם שהלקוחות שלנו חוזרים אליו שוב ושוב."}</p>
        <div className="favorite-foot">
          {min !== null && <span className="favorite-price">{p.options.length === 1 ? `₪${min}` : `החל מ-₪${min}`}</span>}
          <Link href={`/product/${p.id}`} className="btn">לצפייה בבושם</Link>
        </div>
      </div>
    </section>
  );
}
