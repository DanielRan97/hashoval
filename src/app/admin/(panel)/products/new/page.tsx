import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProduct() {
  const brands = (await db.brand.findMany({ orderBy: { name: "asc" } })).map((b) => b.name);
  return (
    <>
      <h1>מוצר חדש</h1>
      <ProductForm id={null} brands={brands} />
    </>
  );
}
