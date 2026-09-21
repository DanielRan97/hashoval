import Link from "next/link";
import { CartProvider } from "@/lib/cart";
import { CartLink } from "./CartLink";
import { IconAbout, IconShop, IconWish } from "./NavIcons";
import { GlassDefs } from "./ProductImage";
import { ProtectImages } from "./ProtectImages";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <GlassDefs />
      <ProtectImages />
      <header className="site-header">
        <Link href="/" className="logo" aria-label="hashoval, לדף הבית"><img src="/brand/logo-wordmark.png" alt="hashoval" width={1968} height={594} draggable={false} /></Link>
        <nav aria-label="ראשי">
          <Link href="/shop" className="nav-icon" data-label="חנות" aria-label="חנות"><IconShop /></Link>
          <Link href="/wishlist" className="nav-icon" data-label="Wishlist" aria-label="Wishlist"><IconWish /></Link>
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
