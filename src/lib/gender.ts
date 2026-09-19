export const GENDERS = ["women", "men", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  women: "נשים",
  men: "גברים",
  unisex: "יוניסקס",
};

export function isGender(v: unknown): v is Gender {
  return typeof v === "string" && (GENDERS as readonly string[]).includes(v);
}
