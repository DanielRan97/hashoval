import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildWishlistWorkbook } from "@/lib/wishlistExport";

export const dynamic = "force-dynamic";

/** Every wish, newest first, as a real .xlsx file with the text exactly as the visitors wrote it. Admin only. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const requests = await db.wishlistRequest.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Response(new Uint8Array(buildWishlistWorkbook(requests)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="wishlist-requests-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
