import { db } from "@/lib/db";
import { wishlistDate } from "@/lib/wishlistExport";
import { deleteWishlistRequest } from "../../actions";
import { DeleteButton } from "../DeleteButton";

export const dynamic = "force-dynamic";

export default async function WishlistAdmin() {
  const requests = await db.wishlistRequest.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return (
    <>
      <div className="wish-admin-head">
        <h1>Wishlist</h1>
        <a className="btn" href="/admin/wishlist/export" download>ייצוא ל-Excel</a>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="num">{requests.length}</span>
          <span className="muted">סה״כ בקשות</span>
        </div>
      </div>
      <p className="muted">הבקשות נשמרות בדיוק כפי שהלקוחות כתבו אותן. בקובץ ה-Excel אין איחוד, ניקוי או ספירת כפילויות.</p>
      {requests.length === 0 ? (
        <p className="muted">עוד לא התקבלו בקשות. כשלקוחות ישלחו בקשה בעמוד ה-Wishlist, היא תופיע כאן.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>תאריך</th><th>שם הבושם</th><th></th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{wishlistDate(r.createdAt)}</td>
                  <td className="wish-name">{r.fragranceName}</td>
                  <td>
                    <DeleteButton
                      run={deleteWishlistRequest.bind(null, r.id)}
                      label="מחיקה"
                      confirmText={`למחוק את הבקשה "${r.fragranceName}"?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
