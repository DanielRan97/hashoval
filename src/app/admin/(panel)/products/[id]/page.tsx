import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { availableMl, decantPrices } from "@/lib/pricing";
import { ProductForm } from "../ProductForm";
import { AddStockForm } from "./AddStockForm";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();
  const [p, s, brandRows] = await Promise.all([
    db.product.findUnique({ where: { id: productId } }),
    getSettings(),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!p) notFound();
  const prices = decantPrices(p, s);
  return (
    <>
      <h1>{p.brand} — {p.name}</h1>
      <p className="muted">
        מחירים מחושבים (לקריאה בלבד): 2 מ״ל ₪{prices[2]} · 5 מ״ל ₪{prices[5]} · 10 מ״ל ₪{prices[10]}
      </p>
      <AddStockForm productId={p.id} productName={`${p.brand} ${p.name}`} currentMl={availableMl(p)} />
      <ProductForm id={p.id} brands={brandRows.map((b) => b.name)} values={p} />
    </>
  );
}
