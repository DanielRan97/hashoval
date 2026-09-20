import Link from "next/link";
import { deleteProduct } from "../../actions";
import { DeleteButton } from "../DeleteButton";
import { FeaturedToggle } from "./FeaturedToggle";
import { ImageZoom } from "./ImageZoom";
import { db, getSettings } from "@/lib/db";
import { availableMl, decantPrices, sellableMl } from "@/lib/pricing";
import { GENDER_LABELS, isGender } from "@/lib/gender";
import { STOCK_LABELS, stockLevel } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inStock?: string }>;
}) {
  const { q = "", inStock } = await searchParams;
  const [all, s, ordered] = await Promise.all([
    db.product.findMany({ orderBy: [{ brand: "asc" }, { name: "asc" }], include: { images: { orderBy: { position: "asc" } } } }),
    getSettings(),
    // Units ordered per product, not counting rejected/cancelled orders.
    db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: { order: { status: { not: "rejected" } } },
    }),
  ]);
  const orderedById = new Map(ordered.map((o) => [o.productId, o._sum.quantity ?? 0]));
  const needle = q.trim().toLowerCase();
  const products = all
    .map((p) => ({ p, net: sellableMl(p, s) }))
    .filter(({ p }) => !needle || `${p.brand} ${p.name}`.toLowerCase().includes(needle))
    .filter(({ net }) => !inStock || stockLevel(net, s) !== "out");

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>מוצרים</h1>
        <Link className="btn" href="/admin/products/new">הוספת מוצר</Link>
      </div>

      <form className="filter-form" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="חיפוש לפי שם או חברה" aria-label="חיפוש" />
        <label className="check-inline">
          <input type="checkbox" name="inStock" value="1" defaultChecked={!!inStock} />
          הצג רק מוצרים במלאי
        </label>
        <button className="btn ghost">סינון</button>
        {(q || inStock) && <Link href="/admin/products">ניקוי</Link>}
      </form>

      {products.length === 0 ? (
        <p className="muted">לא נמצאו מוצרים.</p>
      ) : (
        <div className="table-scroll"><table>
          <thead>
            <tr>
              <th></th><th>מותג</th><th>שם</th><th>מיועד ל</th><th>מ״ל זמינים</th><th>ערך שוק</th>
              <th>מחיר 2/5/10 מ״ל</th><th>הוזמן (יח׳)</th><th>צפיות</th><th>תאריך העלאה</th><th>מומלץ</th><th>סטטוס</th><th></th>
            </tr>
          </thead>
          <tbody>
            {products.map(({ p, net }) => {
              const level = stockLevel(net, s);
              const prices = decantPrices(p, s);
              return (
                <tr key={p.id}>
                  <td><ImageZoom images={p.images.map((i) => ({ id: i.id, url: i.url, zoom: i.zoom, x: i.offsetX, y: i.offsetY }))} fallbackUrl={p.imageUrl} alt={`${p.brand} ${p.name}`} /></td>
                  <td>{p.brand}</td>
                  <td><Link href={`/product/${p.id}`}>{p.name}</Link></td>
                  <td>{isGender(p.gender) ? GENDER_LABELS[p.gender] : "—"}</td>
                  <td>
                    {availableMl(p).toFixed(1)}
                    <span className="muted"> (נטו {net.toFixed(1)})</span>{" "}
                    <span className={`badge ${level}`}>{STOCK_LABELS[level]}</span>
                  </td>
                  <td>₪{p.marketValuePerBottle}</td>
                  <td className="nowrap">₪{prices[2]} / ₪{prices[5]} / ₪{prices[10]}</td>
                  <td>{orderedById.get(p.id) ?? 0}</td>
                  <td>{p.views}</td>
                  <td>{p.createdAt.toLocaleDateString("he-IL")}</td>
                  <td><FeaturedToggle id={p.id} featured={p.isFeatured} /></td>
                  <td>{p.isActive ? "פעיל" : "לא פעיל"}</td>
                  <td><div className="row-actions">
                    <Link href={`/admin/products/${p.id}`} className="btn ghost sm">עריכה</Link>
                    <DeleteButton
                      run={deleteProduct.bind(null, p.id)}
                      label="מחיקה"
                      confirmText={`למחוק את ${p.brand} ${p.name}? אי אפשר לשחזר.`}
                    />
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
    </>
  );
}
