import { notFound } from "next/navigation";
import { getStoreProducts } from "@/lib/catalog";
import { GENDER_LABELS } from "@/lib/gender";
import { STOCK_LABELS } from "@/lib/stock";
import { BackButton } from "../../BackButton";
import { ProductGallery } from "../../Gallery";
import { SizePicker } from "./SizePicker";
import { ViewTracker } from "./ViewTracker";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await getStoreProducts()).find((x) => x.id === Number(id));
  if (!p) notFound();
  return (
    <div className="container">
      <BackButton />
      <div className="product">
      <ViewTracker productId={p.id} />
      <ProductGallery images={p.images} alt={`${p.brand} ${p.name}`} />
      <div className="product-info">
        <div className="card-brand" style={{ paddingInline: 0, marginTop: 0 }}>{p.brand} · {GENDER_LABELS[p.gender]}</div>
        <h1>{p.name}</h1>
        {p.stock !== "ok" && <p><span className={`badge ${p.stock}`}>{STOCK_LABELS[p.stock]}</span></p>}
        <p>{p.description}</p>
        {p.stock === "out" ? (
          <div className="actions">
            <button type="button" className="btn" disabled>המלאי אזל</button>
          </div>
        ) : (
          <SizePicker productId={p.id} options={p.options} />
        )}
      </div>
      </div>
    </div>
  );
}
