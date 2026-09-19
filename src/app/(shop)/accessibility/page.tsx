import { BUSINESS, show } from "@/lib/business";
import { LegalPage } from "../LegalPage";

export const metadata = { title: "הצהרת נגישות — hashoval" };

export default function Accessibility() {
  return (
    <LegalPage title="הצהרת נגישות">
      <p>
        אנחנו רוצים שכל אדם יוכל לגלוש באתר ולהזמין בו. האתר נבנה בעברית עם כיוון כתיבה מימין לשמאל, עם כותרות
        ותוויות לשדות הטפסים, והוא מותאם לגלישה בטלפון.
      </p>
      <p>
        טרם נערכה בדיקת נגישות מקצועית לאתר, ולכן ייתכן שחלקים ממנו אינם נגישים במלואם. אם נתקלת בקושי, נשמח
        לשמוע ולתקן.
      </p>
      <h2>פרטי רכז הנגישות</h2>
      <p>
        {show(BUSINESS.accessibilityCoordinator)} · טלפון: {show(BUSINESS.phone)} · דוא״ל: {show(BUSINESS.email)}
      </p>
      <p>[יש להשלים לפני פרסום: תאריך עדכון ההצהרה, ורמת התאמה שנבדקה על ידי גורם מוסמך.]</p>
    </LegalPage>
  );
}
