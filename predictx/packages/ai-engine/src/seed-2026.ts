import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // Also load local .env if present
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in environment!");
  process.exit(1);
}
import { prisma } from "./lib/prisma";
import { generateDailyMarkets, deployNewMarkets } from "./workers/scheduler.worker";

async function main() {
  console.log("🚀 Starting Marketplace Seeding for 2026...");
  
  // 1. Clear old stale markets from 2024
  const oldMarkets = await prisma.market.deleteMany({
    where: {
      createdAt: {
        lt: new Date("2026-01-01")
      }
    }
  });
  console.log(`🧹 Cleared ${oldMarkets.count} stale 2024 markets.`);

  // 2. Generate fresh 2026 AI markets
  console.log("🤖 Generating fresh AI markets for 2026...");
  const created = await generateDailyMarkets();
  console.log(`✨ Created ${created} new markets in the database.`);

  // 3. Deploy them to the Arc Testnet
  console.log("⛓️ Deploying markets to Arc Testnet...");
  await deployNewMarkets();
  
  console.log("✅ Seeding complete! Markets should now be visible on the frontend.");
}

main()
  .catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
