import Anthropic from "@anthropic-ai/sdk";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "../lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_ADDRESS = "0x675cd4F60799239CBE6FD13ADa261E335022c62e";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public:  { http: ["https://rpc.testnet.arc.network"] },
  },
} as const;

const FACTORY_ABI = [
  {
    name: "createMarket",
    type: "function" as const,
    stateMutability: "nonpayable",
    inputs: [
      { name: "question",      type: "string"  },
      { name: "category",      type: "string"  },
      { name: "resolvesAt",    type: "uint256" },
      { name: "initLiquidity", type: "uint256" },
    ],
    outputs: [{ name: "market", type: "address" }],
  },
  {
    name: "getMarketCount",
    type: "function" as const,
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allMarkets",
    type: "function" as const,
    stateMutability: "view",
    inputs:  [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const USDC_ABI = [
  {
    name: "approve",
    type: "function" as const,
    stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const USDC_ADDRESS  = "0x3600000000000000000000000000000000000000" as const;
const INIT_LIQUIDITY = parseUnits("5", 6); // 5 USDC per market
const GAS = { maxFeePerGas: 160000000000n, maxPriorityFeePerGas: 1000000000n };

// ── Auto-deploy undeployed markets on-chain ─────────────────────────────────
export async function deployNewMarkets() {
  try {
    const privateKey     = process.env.DEPLOYER_PRIVATE_KEY;
    const factoryAddress = process.env.FACTORY_ADDRESS;

    if (!privateKey || !factoryAddress) {
      console.log("[Scheduler] DEPLOYER_PRIVATE_KEY/FACTORY_ADDRESS not set — skipping auto-deploy");
      return;
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain:     arcTestnet as any,
      transport: http("https://rpc.testnet.arc.network"),
    });
    const publicClient = createPublicClient({
      chain:     arcTestnet as any,
      transport: http("https://rpc.testnet.arc.network"),
    });

    // Check USDC balance
    const balance = await publicClient.readContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: "balanceOf",
      args:         [account.address],
    } as any) as bigint;

    const balanceNum = Number(balance) / 1e6;
    if (balanceNum < 5) {
      console.log(`[Scheduler] Low USDC (${balanceNum.toFixed(2)}) — skipping deploy. Get more at faucet.circle.com`);
      return;
    }

    // Get undeployed markets (future resolvesAt only)
    const undeployed = await prisma.market.findMany({
      where: {
        outcome:   "OPEN",
        status:    "active",
        resolvesAt: { gt: new Date() },
        OR: [
          { address: { startsWith: "ai-" } },
          { address: { startsWith: "0x000" } },
        ],
      },
      take: Math.min(Math.floor(balanceNum / 5), 10),
      orderBy: { createdAt: "desc" },
    });

    if (undeployed.length === 0) return;

    console.log(`[Scheduler] Auto-deploying ${undeployed.length} markets (${balanceNum.toFixed(2)} USDC available)...`);

    // Approve total USDC needed
    const needed = BigInt(undeployed.length) * INIT_LIQUIDITY;
    const approveTx = await walletClient.writeContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: "approve",
      args:         [factoryAddress as `0x${string}`, needed],
      chain:        null,
      ...GAS,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    let deployed = 0;
    for (const market of undeployed) {
      try {
        const resolvesAt = BigInt(Math.floor(new Date(market.resolvesAt).getTime() / 1000));

        const tx = await walletClient.writeContract({
          address:      factoryAddress as `0x${string}`,
          abi:          FACTORY_ABI,
          functionName: "createMarket",
          args:         [market.question, market.category, resolvesAt, INIT_LIQUIDITY],
          chain:        null,
          ...GAS,
        } as any);
        await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });

        // Get the address of the newly created market
        const count = await publicClient.readContract({
          address:      factoryAddress as `0x${string}`,
          abi:          FACTORY_ABI,
          functionName: "getMarketCount",
        } as any) as bigint;

        const marketAddr = await publicClient.readContract({
          address:      factoryAddress as `0x${string}`,
          abi:          FACTORY_ABI,
          functionName: "allMarkets",
          args:         [count - 1n],
        } as any) as string;

        await prisma.market.update({
          where: { id: market.id },
          data:  { address: marketAddr },
        });

        console.log(`[Scheduler] ✓ Deployed: ${market.question.slice(0, 50)}... → ${marketAddr}`);
        deployed++;

        await new Promise(r => setTimeout(r, 2000));
      } catch (err: any) {
        console.error(`[Scheduler] Deploy failed: ${err.message?.slice(0, 80)}`);
        if (err.message?.includes("insufficient") || err.message?.includes("transfer")) break;
      }
    }

    console.log(`[Scheduler] Auto-deploy complete: ${deployed}/${undeployed.length} deployed`);
  } catch (err: any) {
    console.error("[Scheduler] deployNewMarkets error:", err.message);
  }
}

// ── Expired market cleanup ──────────────────────────────────────────────────
async function cleanupExpiredMarkets() {
  const updated = await prisma.market.updateMany({
    where: {
      resolvesAt: { lt: new Date() },
      outcome:    "OPEN",
      status:     "active",
    },
    data: { status: "expired" },
  });
  if (updated.count > 0) {
    console.log(`[Scheduler] Marked ${updated.count} markets as expired`);
  }
}

// ── Extract JSON array robustly ─────────────────────────────────────────────
function extractJson(text: string): any[] | null {
  const clean = text.replace(/```json|```/g, "");
  const match = clean.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildPrompts() {
  const now     = new Date();
  const refDate = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const year    = now.getFullYear();
  const minDate = new Date(now.getTime() + 14 * 86400_000).toISOString().slice(0, 10);
  const maxDate = new Date(now.getTime() + 60 * 86400_000).toISOString().slice(0, 10);

  return [
    {
      category: "sports",
      prompt: `You are creating prediction markets. Today is ${refDate}.
Generate 6 YES/NO sports prediction markets. Use SPECIFIC team names, player names, exact dates.
Focus on: Premier League, Champions League, NBA playoffs, Formula 1 ${year}, IPL ${year}, tennis, FA Cup.
Rules: answerable YES/NO, resolvesAt between ${minDate} and ${maxDate}, description states resolution source.
Respond with ONLY a JSON array:
[{"question":"...","description":"...","category":"sports","resolvesAt":"${minDate}T18:00:00Z"}]`,
    },
    {
      category: "crypto",
      prompt: `You are creating prediction markets. Today is ${refDate}.
Generate 5 YES/NO crypto prediction markets with SPECIFIC price targets and exact resolution dates.
Focus on: Bitcoin, Ethereum, SOL, BNB, XRP price milestones, ETF flows, regulatory decisions.
Rules: answerable YES/NO, resolvesAt between ${minDate} and ${maxDate}, specific exchange for resolution.
Respond with ONLY a JSON array:
[{"question":"...","description":"...","category":"crypto","resolvesAt":"${minDate}T00:00:00Z"}]`,
    },
    {
      category: "tech",
      prompt: `You are creating prediction markets. Today is ${refDate}.
Generate 5 YES/NO tech prediction markets about REAL upcoming events.
Focus on: Apple WWDC ${year}, Google I/O ${year}, Microsoft Build, OpenAI, Nvidia earnings, Meta AI.
Rules: answerable YES/NO, resolvesAt between ${minDate} and ${maxDate}.
Respond with ONLY a JSON array:
[{"question":"...","description":"...","category":"tech","resolvesAt":"${minDate}T20:00:00Z"}]`,
    },
    {
      category: "politics",
      prompt: `You are creating prediction markets. Today is ${refDate}.
Generate 4 YES/NO political/macro prediction markets about REAL scheduled events.
Focus on: Fed FOMC meetings, ECB, Bank of England, G7/G20 summits, major elections.
Rules: answerable YES/NO, resolvesAt between ${minDate} and ${maxDate}.
Respond with ONLY a JSON array:
[{"question":"...","description":"...","category":"politics","resolvesAt":"${minDate}T20:00:00Z"}]`,
    },
    {
      category: "entertainment",
      prompt: `You are creating prediction markets. Today is ${refDate}.
Generate 4 YES/NO entertainment prediction markets about REAL upcoming releases.
Focus on: major movie openings, Billboard chart debuts, streaming show performance.
Rules: answerable YES/NO, resolvesAt between ${minDate} and ${maxDate}.
Respond with ONLY a JSON array:
[{"question":"...","description":"...","category":"entertainment","resolvesAt":"${minDate}T23:59:00Z"}]`,
    },
  ];
}

// ── Core AI market generation ───────────────────────────────────────────────
export async function generateDailyMarkets() {
  const today = new Date().toDateString();
  console.log(`[Scheduler] Generating markets for ${today}...`);

  await prisma.user.upsert({
    where:  { address: SYSTEM_ADDRESS },
    update: {},
    create: { address: SYSTEM_ADDRESS, username: null, totalPnl: 0 },
  });

  const prompts = buildPrompts();
  let totalCreated = 0;

  for (const { category, prompt } of prompts) {
    try {
      console.log(`[Scheduler] Generating ${category} markets...`);

      const res = await anthropic.messages.create({
        model:      "claude-3-5-sonnet-latest",
        max_tokens: 2000,
        messages:   [{ role: "user", content: prompt }],
      });

      const tb = res.content.find((b: any) => b.type === "text");
      if (!tb || !(tb as any).text) continue;

      const markets = extractJson((tb as any).text);
      if (!markets) {
        console.error(`[Scheduler] No JSON for ${category}: ${(tb as any).text.slice(0, 100)}`);
        continue;
      }

      for (const m of markets) {
        if (!m.question || !m.description || !m.resolvesAt) continue;

        const resolvesAt = new Date(m.resolvesAt);
        if (isNaN(resolvesAt.getTime()) || resolvesAt <= new Date()) continue;

        const snippet = String(m.question).slice(0, 60);
        const exists = await prisma.market.findFirst({
          where: { question: { contains: snippet, mode: "insensitive" } },
        });
        if (exists) continue;

        await prisma.market.create({
          data: {
            address:        `ai-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            question:       String(m.question),
            description:    String(m.description),
            category:       String(m.category ?? category),
            creatorAddress: SYSTEM_ADDRESS,
            resolvesAt,
            outcome:        "OPEN",
            status:         "active",
            yesProbability: 50,
            volume24h:      0,
            totalVolume:    0,
            liquidity:      0,
            initLiquidity:  0,
          },
        });
        totalCreated++;
      }

      await new Promise(r => setTimeout(r, 2000));
    } catch (err: any) {
      console.error(`[Scheduler] Error for ${category}:`, err.message);
    }
  }

  console.log(`[Scheduler] Generated ${totalCreated} new markets`);
  return totalCreated;
}

// ── Scheduler entry point ───────────────────────────────────────────────────
export function startScheduler() {
  console.log("[Scheduler] Started — AI generation every 6h, auto-deploy every 30min");

  // On startup: generate then immediately deploy
  generateDailyMarkets()
    .then(() => deployNewMarkets())
    .catch(console.error);

  // Every 6 hours: generate new markets then deploy them
  setInterval(() => {
    generateDailyMarkets()
      .then(() => deployNewMarkets())
      .catch(console.error);
  }, 6 * 60 * 60 * 1000);

  // Every 30 minutes: deploy any pending undeployed markets
  setInterval(() => {
    deployNewMarkets().catch(console.error);
  }, 30 * 60 * 1000);

  // Every hour: clean up expired markets
  setInterval(() => {
    cleanupExpiredMarkets().catch(console.error);
  }, 60 * 60 * 1000);

  cleanupExpiredMarkets().catch(console.error);
}
