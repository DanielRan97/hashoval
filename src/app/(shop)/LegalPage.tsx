import { LEGAL_REVIEWED } from "@/lib/business";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container prose legal">
      {!LEGAL_REVIEWED && (
        <p className="notice">טיוטה בלבד. הנוסח טרם נבדק על ידי איש מקצוע, וחלק מהפרטים חסרים.</p>
      )}
      <h1>{title}</h1>
      {children}
    </div>
  );
}
