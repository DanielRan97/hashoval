import { getStoreProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [catalog, s] = await Promise.all([getStoreProducts(), getSettings()]);
  return (
    <div className="container">
      <h1>פרטי הזמנה</h1>
      <CheckoutForm catalog={catalog} freeShippingThreshold={s.freeShippingThreshold} standardShippingCost={s.standardShippingCost} />
    </div>
  );
}
