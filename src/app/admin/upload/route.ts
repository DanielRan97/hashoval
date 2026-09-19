import { isAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/uploads";

/** Receives one product photo from the admin form and returns its URL. Admin only. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "לא מורשה" }, { status: 401 });
  try {
    const form = await req.formData();
    const url = await saveImage(form.get("file"));
    if (!url) return Response.json({ error: "לא התקבל קובץ" }, { status: 400 });
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "ההעלאה נכשלה" }, { status: 400 });
  }
}
