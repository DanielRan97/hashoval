import Link from "next/link";

/** A short invitation on the home page to tell us which perfume to bring next. */
export function WishlistCta() {
  return (
    <section className="wish-cta" aria-labelledby="wish-cta-title">
      <h2 id="wish-cta-title">לא מצאתם את הבושם שאתם רוצים לנסות?</h2>
      <p>ספרו לנו איזה בושם הייתם רוצים לראות בחנות. הבקשות שלכם עוזרות לנו לבחור מה להוסיף בהמשך.</p>
      <Link href="/wishlist" className="btn ghost">שלחו בקשה</Link>
    </section>
  );
}
