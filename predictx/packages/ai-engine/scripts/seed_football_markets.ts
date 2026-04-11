import { prisma } from '../src/lib/prisma';

async function seed() {
  const systemAddress = "0x0000000000000000000000000000000000000000";

  const footballMarkets = [
    {
      question: "Will Liverpool beat Fulham in today's Premier League match at Anfield?",
      description: "Resolved based on the official Premier League result for the match on April 11, 2026. Kick-off: 17:30 BST.",
      category: "sports",
      resolvesAt: new Date("2026-04-11T20:00:00Z"),
      yesProbability: 58, 
    },
    {
      question: "Will Juventus defeat Atalanta in today's Serie A clash in Bergamo?",
      description: "Resolved based on the official Serie A result for the match on April 11, 2026.",
      category: "sports",
      resolvesAt: new Date("2026-04-11T21:00:00Z"),
      yesProbability: 52, 
    }
  ];

  console.log(`Seeding ${footballMarkets.length} live football markets...`);

  for (const m of footballMarkets) {
    const exists = await prisma.market.findFirst({ where: { question: m.question } });
    if (exists) {
      console.log(`Skipping: ${m.question} (already exists)`);
      continue;
    }

    await prisma.market.create({
      data: {
        address: `football-2026-${Math.random().toString(36).substring(7)}`,
        question: m.question,
        description: m.description,
        category: m.category,
        creatorAddress: systemAddress,
        resolvesAt: m.resolvesAt,
        status: "active",
        totalVolume: 0,
        yesProbability: m.yesProbability,
      }
    });
    console.log(`Created: ${m.question} (Prob: ${m.yesProbability}%)`);
  }

  console.log("Football seed complete!");
}

seed();
