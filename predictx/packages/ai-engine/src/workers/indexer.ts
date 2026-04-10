import { createPublicClient, http, parseAbi } from "viem";
import { prisma } from "../lib/prisma";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public:  { http: ["https://rpc.testnet.arc.network"] },
  },
} as const;

const publicClient = createPublicClient({
  chain: arcTestnet as any,
  transport: http("https://rpc.testnet.arc.network"),
});

const SHARES_BOUGHT_EVENT = parseAbi([
  "event SharesBought(address indexed trader, bool isYes, uint256 usdcIn, uint256 sharesOut)",
])[0];

const WINNINGS_CLAIMED_EVENT = parseAbi([
  "event WinningsClaimed(address indexed trader, uint256 amount)",
])[0];

async function ensureUser(address: string): Promise<void> {
  const exists = await prisma.user.findUnique({ where: { address } });
  if (!exists) {
    await prisma.user.create({
      data: { address, username: null, totalPnl: 0 },
    });
    console.log(`[Indexer] Created new user: ${address}`);
  }
}

async function processSharesBought(
  marketAddress: string,
  trader: string,
  isYes: boolean,
  usdcIn: bigint,
  sharesOut: bigint,
  txHash: string,
) {
  try {
    const usdcAmount = Number(usdcIn) / 1e6;
    const shares     = Number(sharesOut) / 1e6;

    const market = await prisma.market.findFirst({
      where: { address: { equals: marketAddress, mode: "insensitive" } },
    });
    if (!market) {
      console.log(`[Indexer] Market not in DB: ${marketAddress}`);
      return;
    }

    // Deduplicate
    const existing = await prisma.trade.findUnique({ where: { txHash } });
    if (existing) return;

    await ensureUser(trader);

    const price = isYes
      ? market.yesProbability / 100
      : (100 - market.yesProbability) / 100;

    // Record trade
    await prisma.trade.create({
      data: { marketId: market.id, userAddress: trader, isYes, usdcAmount, shares, price, txHash },
    });

    // Upsert position
    const pos = await prisma.position.findUnique({
      where: { marketId_userAddress: { marketId: market.id, userAddress: trader } },
    });
    const addShares = BigInt(Math.round(shares * 1e6));

    if (pos) {
      await prisma.position.update({
        where: { marketId_userAddress: { marketId: market.id, userAddress: trader } },
        data: {
          yesShares:   isYes  ? String(BigInt(pos.yesShares) + addShares) : pos.yesShares,
          noShares:    !isYes ? String(BigInt(pos.noShares)  + addShares) : pos.noShares,
          avgYesPrice: isYes  ? price : pos.avgYesPrice,
          avgNoPrice:  !isYes ? price : pos.avgNoPrice,
        },
      });
    } else {
      await prisma.position.create({
        data: {
          marketId:    market.id,
          userAddress: trader,
          yesShares:   isYes  ? String(addShares) : "0",
          noShares:    !isYes ? String(addShares) : "0",
          avgYesPrice: isYes  ? price : 0,
          avgNoPrice:  !isYes ? price : 0,
          realizedPnl: 0,
        },
      });
    }

    // Update market volume
    await prisma.market.update({
      where: { id: market.id },
      data: {
        totalVolume: { increment: usdcAmount },
        volume24h:   { increment: usdcAmount },
      },
    });

    console.log(`[Indexer] ✓ Trade: ${trader.slice(0,8)}... ${isYes ? "YES" : "NO"} $${usdcAmount.toFixed(2)} — ${market.question.slice(0, 45)}...`);
  } catch (err: any) {
    console.error(`[Indexer] processSharesBought error:`, err.message);
  }
}

async function processWinningsClaimed(
  marketAddress: string,
  trader: string,
  amount: bigint,
  txHash: string,
) {
  try {
    const usdcAmount = Number(amount) / 1e6;

    const market = await prisma.market.findFirst({
      where: { address: { equals: marketAddress, mode: "insensitive" } },
    });
    if (!market) return;

    await ensureUser(trader);

    // Calculate P&L = claimed - invested
    const agg = await prisma.trade.aggregate({
      where:  { marketId: market.id, userAddress: trader },
      _sum:   { usdcAmount: true },
    });
    const invested = agg._sum.usdcAmount ?? 0;
    const pnl = usdcAmount - invested;

    await prisma.user.update({
      where: { address: trader },
      data:  { totalPnl: { increment: pnl } },
    });

    console.log(`[Indexer] ✓ Winnings: ${trader.slice(0,8)}... +$${usdcAmount.toFixed(2)} (P&L $${pnl.toFixed(2)})`);
  } catch (err: any) {
    console.error(`[Indexer] processWinningsClaimed error:`, err.message);
  }
}

let lastIndexedBlock = 0n;

export async function indexNewBlocks() {
  try {
    const currentBlock = await publicClient.getBlockNumber();

    if (lastIndexedBlock === 0n) {
      // First run: backfill last 2000 blocks (~1 hour on Arc)
      lastIndexedBlock = currentBlock > 2000n ? currentBlock - 2000n : 0n;
      console.log(`[Indexer] First run — backfilling from block ${lastIndexedBlock}`);
    }

    console.log(`[Indexer] Checking blocks... current: ${currentBlock}, last: ${lastIndexedBlock}`);

    if (currentBlock <= lastIndexedBlock) return;

    // Get all real deployed market addresses
    const markets = await prisma.market.findMany({
      where: {
        address: { startsWith: "0x" },
        NOT:     { address: { startsWith: "0x000" } },
      },
      select: { address: true },
    });

    if (markets.length === 0) return;

    const addresses = markets.map(m => m.address as `0x${string}`);
    const fromBlock = lastIndexedBlock + 1n;
    const toBlock   = currentBlock;

    // Fetch SharesBought logs
    const boughtLogs = await publicClient.getLogs({
      address:   addresses,
      event:     SHARES_BOUGHT_EVENT,
      fromBlock,
      toBlock,
    });

    for (const log of boughtLogs) {
      if (!log.args || !log.transactionHash) continue;
      await processSharesBought(
        log.address,
        (log.args as any).trader  as string,
        (log.args as any).isYes   as boolean,
        (log.args as any).usdcIn  as bigint,
        (log.args as any).sharesOut as bigint,
        log.transactionHash,
      );
    }

    // Fetch WinningsClaimed logs
    const claimedLogs = await publicClient.getLogs({
      address:   addresses,
      event:     WINNINGS_CLAIMED_EVENT,
      fromBlock,
      toBlock,
    });

    for (const log of claimedLogs) {
      if (!log.args || !log.transactionHash) continue;
      await processWinningsClaimed(
        log.address,
        (log.args as any).trader as string,
        (log.args as any).amount as bigint,
        log.transactionHash,
      );
    }

    if (boughtLogs.length > 0 || claimedLogs.length > 0) {
      console.log(`[Indexer] Blocks ${fromBlock}→${toBlock}: ${boughtLogs.length} trades, ${claimedLogs.length} claims`);
    }

    lastIndexedBlock = currentBlock;
  } catch (err: any) {
    // Don't crash the server on RPC errors — just log and retry next cycle
    console.error(`[Indexer] Poll error:`, err.message);
  }
}

export function startIndexer() {
  console.log("[Indexer] Starting on-chain event indexer for Arc Testnet...");
  indexNewBlocks();
  setInterval(indexNewBlocks, 10_000);
  console.log("[Indexer] Polling Arc Testnet every 10 seconds");
}
