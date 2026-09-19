/** Problems that make a production deployment unsafe. Returns a list of what to fix. */
export function configProblems(env: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  const password = env.ADMIN_PASSWORD ?? "";
  const secret = env.SESSION_SECRET ?? "";
  if (password.length < 12 || password === "change-me") problems.push("ADMIN_PASSWORD חייבת להיות לפחות 12 תווים ושונה מברירת המחדל");
  if (secret.length < 32 || secret.startsWith("change-me")) problems.push("SESSION_SECRET חייב להיות אקראי וארוך (לפחות 32 תווים)");
  return problems;
}
