import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const markets = await prisma.market.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest Markets in DB:");
  console.log(JSON.stringify(markets, null, 2));
  
  const count = await prisma.market.count();
  console.log(`Total markets: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
