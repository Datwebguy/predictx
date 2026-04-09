import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const deletedTrades = await prisma.trade.deleteMany({
    where: { userAddress: { startsWith: "0x000" } },
  });
  console.log(`Deleted ${deletedTrades.count} fake trades`);

  const deletedPositions = await prisma.position.deleteMany({
    where: { userAddress: { startsWith: "0x000" } },
  });
  console.log(`Deleted ${deletedPositions.count} fake positions`);

  // Clear "predictx_ai" username — can't delete since this user owns markets
  const cleared = await prisma.user.updateMany({
    where: { username: "predictx_ai" },
    data:  { username: null },
  });
  console.log(`Cleared username on ${cleared.count} system users`);

  // Delete fake zero-address users only if they have no markets
  const fakeUsers = await prisma.user.findMany({
    where: { address: { startsWith: "0x000" } },
    include: { markets: { take: 1 } },
  });
  let deletedCount = 0;
  for (const u of fakeUsers) {
    if (u.markets.length === 0) {
      await prisma.user.delete({ where: { id: u.id } });
      deletedCount++;
    }
  }
  console.log(`Deleted ${deletedCount} fake zero-address users`);

  const totalUsers  = await prisma.user.count();
  const totalTrades = await prisma.trade.count();
  console.log(`Remaining: ${totalUsers} users, ${totalTrades} trades`);

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
