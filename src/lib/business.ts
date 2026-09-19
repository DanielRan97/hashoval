/**
 * Business details shown on the legal pages. Fill these in, then set LEGAL_REVIEWED to true
 * once a lawyer has approved the texts; until then the pages show a "draft" banner.
 */
export const LEGAL_REVIEWED = false;

export const BUSINESS = {
  name: "", // שם העסק כפי שרשום
  id: "", // ח.פ. / עוסק מורשה / עוסק פטור
  address: "",
  phone: "",
  email: "",
  accessibilityCoordinator: "", // שם רכז/ת הנגישות
};

const MISSING = "[יש להשלים]";
export const show = (v: string) => v.trim() || MISSING;
