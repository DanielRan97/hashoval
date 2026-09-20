import type { Prisma } from "@prisma/client";
import { INCOME_STATUSES } from "@/lib/orderFlow";

export const PERIOD_LABELS: Record<string, string> = {
  today: "היום",
  week: "7 הימים האחרונים",
  month: "החודש",
  last_month: "החודש שעבר",
  year: "השנה",
  all: "כל התקופה",
  custom: "טווח מותאם",
};

export type DateRange = { from?: Date; to?: Date }; // `to` is exclusive

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Resolves a period preset (or a custom from/to, given as yyyy-mm-dd) to a date range. */
export function resolvePeriod(period: string, from?: string, to?: string, now = new Date()): DateRange {
  const today = startOfDay(now);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  switch (period) {
    case "today":
      return { from: today, to: tomorrow };
    case "week":
      return { from: new Date(today.getTime() - 6 * 86_400_000), to: tomorrow };
    case "last_month":
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear() + 1, 0, 1) };
    case "all":
      return {};
    case "custom":
      return parseRange(from, to);
    default: // month
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
}

/** Inclusive yyyy-mm-dd dates to a range whose end is exclusive. Invalid dates are ignored. */
export function parseRange(from?: string, to?: string): DateRange {
  const range: DateRange = {};
  if (from && !isNaN(Date.parse(from))) range.from = startOfDay(new Date(from));
  if (to && !isNaN(Date.parse(to))) range.to = new Date(startOfDay(new Date(to)).getTime() + 86_400_000);
  return range;
}

const dateClause = (r: DateRange) => (r.from || r.to ? { ...(r.from && { gte: r.from }), ...(r.to && { lt: r.to }) } : null);

export type IncomeFilter = {
  paid: DateRange;
  method?: string; // card | apple_pay | google_pay | manual
};

/**
 * Orders that count as income: money received and not refunded. The payment date is `paidAt`;
 * orders from the old manual flow have none, so their creation date stands in.
 */
export function incomeWhere(f: IncomeFilter): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [{ status: { in: INCOME_STATUSES }, refundedAt: null }];
  const paidRange = dateClause(f.paid);
  if (paidRange) and.push({ OR: [{ paidAt: paidRange }, { paidAt: null, createdAt: paidRange }] });
  if (f.method === "manual") and.push({ paymentMethod: null });
  else if (f.method) and.push({ paymentMethod: f.method });
  return { AND: and };
}
