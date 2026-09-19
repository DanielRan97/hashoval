import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";

const serif = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], variable: "--font-serif" });
const sans = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "hashoval — השובל שלך, בלי הימורים",
  description: "דוגמיות מקוריות מבשמים יוקרתיים, כדי לבחור את השובל שלך בביטחון",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
