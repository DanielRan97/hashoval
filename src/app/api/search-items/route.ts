import { getStoreProducts, minPrice } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** The perfumes the header search can find: what is already in the shop, with its price from the existing pricing. */
export async function GET() {
  const all = await getStoreProducts();
  const items = all.map((p) => {
    const min = minPrice(p.options);
    return {
      id: p.id,
      brand: p.brand,
      name: p.name,
      image: p.images[0]?.url ?? null,
      price: min === null ? "" : p.options.length === 1 ? `₪${min}` : `החל מ-₪${min}`,
    };
  });
  return Response.json(items, { headers: { "Cache-Control": "no-store" } });
}
