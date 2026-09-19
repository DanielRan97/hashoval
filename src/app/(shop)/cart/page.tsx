import { getStoreProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/db";
import { CartView } from "./CartView";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [catalog, s] = await Promise.all([getStoreProducts(), getSettings()]);
  return (
    <div className="container">
      <h1>סל הקניות</h1>
      <CartView catalog={catalog} freeShippingThreshold={s.freeShippingThreshold} standardShippingCost={s.standardShippingCost} />
    </div>
  );
}
