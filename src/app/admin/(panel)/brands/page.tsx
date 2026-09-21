import Link from "next/link";
import { db } from "@/lib/db";
import { deleteBrand } from "../../actions";
import { DeleteButton } from "../DeleteButton";

export const dynamic = "force-dynamic";

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [all, products] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.product.groupBy({ by: ["brand"], _count: { _all: true } }),
  ]);
  const counts = new Map(products.map((p) => [p.brand, p._count._all]));
  const needle = q.trim().toLowerCase();
  const brands = all.filter((b) => !needle || b.name.toLowerCase().includes(needle));
  return (
    <>
      <h1>חברות</h1>
      <p className="muted">חברות נוספות מתוך טופס המוצר (הכפתור "+ חברה חדשה"). אפשר למחוק רק חברה שאין תחתיה בשמים. לחיצה על שם חברה מציגה את כל הבשמים שלה.</p>
      <form className="filter-form" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="חיפוש חברה" aria-label="חיפוש חברה" />
        <button className="btn ghost">חיפוש</button>
        {q && <Link href="/admin/brands">ניקוי</Link>}
      </form>
      {brands.length === 0 ? (
        <p className="muted">לא נמצאו חברות.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>חברה</th><th>בשמים</th><th></th></tr></thead>
            <tbody>
              {brands.map((b) => {
                const n = counts.get(b.name) ?? 0;
                return (
                  <tr key={b.id}>
                    <td>{n > 0 ? <Link href={`/admin/products?q=${encodeURIComponent(b.name)}`}>{b.name}</Link> : b.name}</td>
                    <td>{n}</td>
                    <td>
                      <DeleteButton
                        run={deleteBrand.bind(null, b.id)}
                        label="מחיקה"
                        confirmText={`למחוק את החברה ${b.name}?`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
