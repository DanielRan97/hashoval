import Link from "next/link";
import { CartProvider } from "@/lib/cart";
import { CartLink } from "./CartLink";
import { GlassDefs } from "./ProductImage";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <GlassDefs />
      <header className="site-header">
        <Link href="/" className="logo">hashoval</Link>
        <nav>
          <Link href="/">בית</Link>
          <Link href="/shop">חנות</Link>
          <Link href="/about">אודות</Link>
          <CartLink />
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <nav className="footer-links" aria-label="מידע משפטי">
          <Link href="/terms">תקנון</Link>
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/accessibility">הצהרת נגישות</Link>
        </nav>
      </footer>
    </CartProvider>
  );
}
