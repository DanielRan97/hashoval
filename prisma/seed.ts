import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if ((await db.product.count()) > 0) return;
  await db.product.createMany({
    data: [
      { brand: "Parfums de Marly", name: "Layton", description: "וניל, תפוח ולבנדר. חם ומתקתק.", bottleSizeMl: 125, currentFillPercent: 90, marketValuePerBottle: 1250 },
      { brand: "Creed", name: "Aventus", description: "אננס, ליבנה ועשן. הקלאסיקה.", bottleSizeMl: 100, currentFillPercent: 75, marketValuePerBottle: 1650 },
      { brand: "Byredo", name: "Gypsy Water", description: "אורן, וניל ופלפל. רך ועץ.", bottleSizeMl: 100, currentFillPercent: 8, marketValuePerBottle: 900 },
    ],
  });
}
main().finally(() => db.$disconnect());
