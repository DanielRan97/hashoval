import { db } from "@/lib/db";
import { removeImage } from "@/lib/uploads";

/** Replaces a product's photos with `urls` (in order). The first one is also kept in Product.imageUrl. */
export async function setProductImages(productId: number, urls: string[]) {
  const before = await db.productImage.findMany({ where: { productId } });
  const framing = new Map(before.map((b) => [b.url, b])); // a photo that stays keeps the way it was framed
  await db.$transaction([
    db.productImage.deleteMany({ where: { productId } }),
    db.productImage.createMany({
      data: urls.map((url, position) => {
        const old = framing.get(url);
        return { productId, url, position, zoom: old?.zoom ?? 1, offsetX: old?.offsetX ?? 0, offsetY: old?.offsetY ?? 0 };
      }),
    }),
    db.product.update({ where: { id: productId }, data: { imageUrl: urls[0] ?? null } }),
  ]);
  await deleteUnusedFiles(before.map((b) => b.url).filter((u) => !urls.includes(u)));
}

/** Deletes uploaded files that no product uses any more. */
export async function deleteUnusedFiles(urls: string[]) {
  for (const url of urls) {
    const used = (await db.productImage.count({ where: { url } })) + (await db.product.count({ where: { imageUrl: url } }));
    if (used === 0) await removeImage(url);
  }
}
