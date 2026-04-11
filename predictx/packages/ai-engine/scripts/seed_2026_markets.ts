import { prisma } from '../src/lib/prisma';

async function seed() {
  const markets = [
    {
      question: "Will Real Madrid win the UEFA Champions League Final in May 2026?",
      description: "Resolved based on the official UEFA Champions League 2025/26 final result.",
      category: "sports",
      resolvesAt: new Date("2026-05-31T22:00:00Z"),
    },
    {
      question: "Will Bitcoin (BTC) reach $100,000 before June 1, 2026?",
      description: "Based on the daily high price on Binance (USDT pair).",
      category: "crypto",
      resolvesAt: new Date("2026-06-01T00:00:00Z"),
    },
    {
      question: "Will Apple announce a foldable iPhone at WWDC 2026?",
      description: "Resolved if a foldable iPhone is officially mentioned during the June 2026 keynote.",
      category: "tech",
      resolvesAt: new Date("2026-06-15T20:00:00Z"),
    },
    {
      question: "Will Ethereum (ETH) trade above $4,500 at any point in July 2026?",
      description: "Based on CoinGecko or Binance price data for ETH/USDT.",
      category: "crypto",
      resolvesAt: new Date("2026-07-31T23:59:59Z"),
    },
    {
      question: "Will the United States reach the 2026 FIFA World Cup Quarter-Finals?",
      description: "Resolved based on the 2026 FIFA World Cup tournament progress.",
      category: "sports",
      resolvesAt: new Date("2026-07-05T00:00:00Z"),
    },
    {
      question: "Will SpaceX land an uncrewed Starship on Mars by the end of 2026?",
      description: "Resolved via official SpaceX or NASA mission confirmation.",
      category: "tech",
      resolvesAt: new Date("2026-12-31T23:59:59Z"),
    },
    {
      question: "Will the Federal Reserve cut interest rates in May 2026?",
      description: "Resolved via the official FOMC statement from the May 2026 meeting.",
      category: "politics",
      resolvesAt: new Date("2026-05-15T00:00:00Z"),
    },
    {
      question: "Will 'Zootopia 2' gross over $1 billion worldwide by July 2026?",
      description: "Based on Box Office Mojo or official Disney financial reports.",
      category: "entertainment",
      resolvesAt: new Date("2026-07-15T00:00:00Z"),
    },
    {
      question: "Will Solana (SOL) flipping Ethereum (ETH) in Market Cap happen in 2026?",
      description: "Resolved if SOL market cap exceeds ETH at any point on CoinMarketCap.",
      category: "crypto",
      resolvesAt: new Date("2026-12-31T23:59:59Z"),
    },
    {
      question: "Will a Star Wars film be released in theaters in 2026?",
      description: "Resolved based on official theatrical release schedules as of Dec 2026.",
      category: "entertainment",
      resolvesAt: new Date("2026-12-31T00:00:00Z"),
    },
    {
      question: "Will the 2026 NBA Finals be won by a Western Conference team?",
      description: "Resolved based on the official NBA Finals 2026 victory.",
      category: "sports",
      resolvesAt: new Date("2026-06-25T00:00:00Z"),
    },
    {
      question: "Will Taylor Swift announce a 2026 stadium tour extension?",
      description: "Resolved via official Taylor Swift social media or website announcements.",
      category: "entertainment",
      resolvesAt: new Date("2026-06-30T00:00:00Z"),
    },
    {
      question: "Will GPT-5 (or equivalent successor) be available to the public by Aug 2026?",
      description: "Resolved via an official OpenAI announcement or product launch.",
      category: "tech",
      resolvesAt: new Date("2026-08-30T00:00:00Z"),
    },
    {
      question: "Will the price of Gold reach $3,000/oz in 2026?",
      description: "Based on official commodities trading data.",
      category: "other",
      resolvesAt: new Date("2026-12-31T00:00:00Z"),
    },
    {
      question: "Will the 2026 Wimbledon Men's Singles be won by Carlos Alcaraz?",
      description: "Resolved via official Wimbledon 2026 tournament results.",
      category: "sports",
      resolvesAt: new Date("2026-07-15T00:00:00Z"),
    }
  ];

  console.log(`Seeding ${markets.length} premium 2026 markets...`);

  // Ensure system user exists
  const systemAddress = "0x0000000000000000000000000000000000000000";
  await prisma.user.upsert({
    where: { address: systemAddress },
    update: {},
    create: {
      address: systemAddress,
      username: "PredictX AI",
    }
  });

  for (const m of markets) {
    const exists = await prisma.market.findFirst({ where: { question: m.question } });
    if (exists) {
      console.log(`Skipping: ${m.question} (already exists)`);
      continue;
    }

    await prisma.market.create({
      data: {
        address: `verified-2026-${Math.random().toString(36).substring(7)}`,
        question: m.question,
        description: m.description,
        category: m.category,
        creatorAddress: "0x0000000000000000000000000000000000000000",
        resolvesAt: m.resolvesAt,
        status: "active",
        totalVolume: 0,
        yesProbability: 50,
      }
    });
    console.log(`Created: ${m.question}`);
  }

  console.log("Seed complete!");
}

seed();
