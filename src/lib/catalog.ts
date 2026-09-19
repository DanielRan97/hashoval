import { db, getSettings } from "@/lib/db";
import { isGender, type Gender } from "@/lib/gender";
import { expireUnpaidOrders, INCOME_STATUSES } from "@/lib/orderFlow";
import { stockLevel, type StockLevel } from "@/lib/stock";
import { DECANT_SIZES, decantPrices, sellableMl, type DecantSize } from "@/lib/pricing";

export type StoreProduct = {
  id: number;
  brand: string;
  name: string;
  description: string;
  /** Photos in display order; the first is the main one. Empty when the product has none yet. */
  images: string[];
  stock: StockLevel;
  createdAt: Date;
  isFeatured: boolean;
  gender: Gender;
  /** Price of the smallest decant whether or not it is in stock; used to sort by price. */
  fromPrice: number;
  /** Units bought (paid and not refunded), for the best-sellers sort. */
  sold: number;
  /** Page views, for the popularity sort. */
  views: number;
  /** Sizes that can be bought right now, with prices. Empty when sold out. Never exposes ml stock. */
  options: { size: DecantSize; price: number }[];
};

/** Active products, including sold-out ones (shown, but not purchasable). */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  await expireUnpaidOrders(); // shown stock must not include ml held by abandoned checkouts
  const [products, s, soldRows] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: { images: { orderBy: { position: "asc" } } },
    }),
    getSettings(),
    db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: { order: { status: { in: INCOME_STATUSES }, refundedAt: null } },
    }),
  ]);
  const soldById = new Map(soldRows.map((r) => [r.productId, r._sum.quantity ?? 0]));
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
      images: p.images.length > 0 ? p.images.map((i) => i.url) : p.imageUrl ? [p.imageUrl] : [],
      createdAt: p.createdAt,
      isFeatured: p.isFeatured,
      gender: isGender(p.gender) ? p.gender : "unisex",
      fromPrice: prices[2],
      sold: soldById.get(p.id) ?? 0,
      views: p.views,
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
