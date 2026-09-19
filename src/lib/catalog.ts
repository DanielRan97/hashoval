import { db, getSettings } from "@/lib/db";
import { expireUnpaidOrders } from "@/lib/orderFlow";
import { stockLevel, type StockLevel } from "@/lib/stock";
import { DECANT_SIZES, decantPrices, sellableMl, type DecantSize } from "@/lib/pricing";

export type StoreProduct = {
  id: number;
  brand: string;
  name: string;
  description: string;
  imageUrl: string | null;
  stock: StockLevel;
  createdAt: Date;
  /** Sizes that can be bought right now, with prices. Empty when sold out. Never exposes ml stock. */
  options: { size: DecantSize; price: number }[];
};

/** Active products, including sold-out ones (shown, but not purchasable). */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  await expireUnpaidOrders(); // shown stock must not include ml held by abandoned checkouts
  const [products, s] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, orderBy: [{ brand: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  return products.map((p) => {
    const net = sellableMl(p, s);
    const stock = stockLevel(net, s);
    const prices = decantPrices(p, s);
    const options =
      stock === "out" ? [] : DECANT_SIZES.filter((size) => size <= net).map((size) => ({ size, price: prices[size] }));
    return {
      id: p.id,
      brand: p.brand,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      // A product with no sellable size counts as sold out even above the threshold.
      stock: options.length === 0 ? ("out" as const) : stock,
      options,
    };
  });
}

/** Lowest price shown on cards. Sold-out products have no price. */
export function minPrice(options: { price: number }[]) {
  return options.length ? Math.min(...options.map((o) => o.price)) : null;
}

export const LATEST_COUNT = 14;

/** Ids of the most recently added products. */
export function latestIds(products: StoreProduct[]) {
  return new Set(
    [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, LATEST_COUNT).map((p) => p.id),
  );
}
