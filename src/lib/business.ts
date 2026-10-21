/**
 * Business details shown on the legal pages. Fill these in, then set LEGAL_REVIEWED to true
 * once a lawyer has approved the texts; until then the pages show a "draft" banner.
 */
export const LEGAL_REVIEWED = false;

export const BUSINESS = {
  name: "דיסטמס (Dystems)", // שם העסק כפי שרשום
  id: "עוסק מס׳ 318188505", // מספר העוסק; סוג העוסק לא מוצג באתר
  address: "קדיש לוז 8, קריית מוצקין",
  phone: "054-2571330",
  email: "hello@hashoval.co.il",
  accessibilityCoordinator: "", // שם רכז/ת הנגישות; ריק = מוצגים רק פרטי הפנייה
};

const MISSING = "[יש להשלים]";
export const show = (v: string) => v.trim() || MISSING;
