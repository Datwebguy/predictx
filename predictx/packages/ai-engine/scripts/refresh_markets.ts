import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { suggestMarkets } from '../src/services/ai.service';
import { prisma } from '../src/lib/prisma';

async function refresh() {
  try {
    console.log("Triggering AI to generate 15 fresh 2026 markets...");
    const markets = await suggestMarkets(15);
    
    let created = 0;
    for (const m of markets) {
      // Check for duplicate questions
      const exists = await prisma.market.findFirst({ where: { question: m.question } });
      if (exists) continue;

      await prisma.market.create({
        data: {
          address: `ai-${Math.random().toString(36).substring(7)}`,
          question: m.question,
          description: m.description,
          category: m.category,
          creatorAddress: "0x0000000000000000000000000000000000000000",
          resolvesAt: new Date(m.suggestedResolvesAt),
        }
      });
      created++;
      console.log(`Created: ${m.question}`);
    }

    console.log(`Successfully added ${created} fresh 2026 markets!`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

refresh();
