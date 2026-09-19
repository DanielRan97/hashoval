import { db } from "@/lib/db";
import { deleteBrand } from "../../actions";
import { DeleteButton } from "../DeleteButton";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const [brands, products] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.product.groupBy({ by: ["brand"], _count: { _all: true } }),
  ]);
  const counts = new Map(products.map((p) => [p.brand, p._count._all]));
  return (
    <>
      <h1>חברות</h1>
      <p className="muted">חברות נוספות מתוך טופס המוצר (הכפתור "+ חברה חדשה"). אפשר למחוק רק חברה שאין תחתיה בשמים.</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>חברה</th><th>בשמים</th><th></th></tr></thead>
          <tbody>
            {brands.map((b) => {
              const n = counts.get(b.name) ?? 0;
              return (
                <tr key={b.id}>
                  <td>{b.name}</td>
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
    </>
  );
}
