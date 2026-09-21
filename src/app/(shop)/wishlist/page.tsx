import type { Metadata } from "next";
import { WishlistForm } from "./WishlistForm";

export const metadata: Metadata = { title: "hashoval" };

export default function WishlistPage() {
  return (
    <div className="container wish">
      <h1>מה הייתם רוצים להריח אצלנו?</h1>
      <p className="wish-lead">
        יש בושם שהייתם רוצים לנסות ועדיין לא נמצא אצלנו? ספרו לנו עליו.
      </p>
      <WishlistForm />
    </div>
  );
}
