import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const stats = await prisma.market.aggregate({
      _sum: { totalVolume: true, liquidity: true }
    });
    console.log("Stats:", stats);
  } catch (e) {
    console.error("Aggregation Error:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
