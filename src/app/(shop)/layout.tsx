import Link from "next/link";
import { CartProvider } from "@/lib/cart";
import { CartLink } from "./CartLink";
import { IconAbout, IconShop } from "./NavIcons";
import { GlassDefs } from "./ProductImage";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <GlassDefs />
      <header className="site-header">
        <Link href="/" className="logo" aria-label="hashoval, לדף הבית">hashoval</Link>
        <nav aria-label="ראשי">
          <Link href="/shop" className="nav-icon" data-label="חנות" aria-label="חנות"><IconShop /></Link>
          <Link href="/about" className="nav-icon" data-label="אודות" aria-label="אודות"><IconAbout /></Link>
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
