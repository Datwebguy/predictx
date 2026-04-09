/**
 * Deploy all AI-generated markets to Arc Testnet via MarketFactory.
 *
 * Usage:
 *   cd C:\Users\EBEN\Downloads\predictx\predictx
 *   npx ts-node --transpile-only --compiler-options '{"module":"commonjs","target":"ES2020","esModuleInterop":true,"skipLibCheck":true}' scripts/deploy-all-markets.ts
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  privateKeyToAccount,
} from "viem";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS ?? "0x1C969004C2A6EfBE1059038A3553AAbF4AB99645") as `0x${string}`;
const USDC_ADDRESS    = "0x3600000000000000000000000000000000000000" as const;
const RPC             = "https://rpc.testnet.arc.network";
const EXPLORER        = "https://testnet.arcscan.app";
const GAS             = { maxFeePerGas: 160000000000n, maxPriorityFeePerGas: 1000000000n };
const INIT_LIQUIDITY  = parseUnits("5", 6); // 5 USDC per market

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: [RPC] },
    public:  { http: [RPC] },
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
    inputs:  [],
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

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!privateKey)      throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
  if (!FACTORY_ADDRESS) throw new Error("FACTORY_ADDRESS not set in .env");

  const account = privateKeyToAccount(privateKey);
  console.log("Deployer:", account.address);
  console.log("Factory: ", FACTORY_ADDRESS);

  const walletClient = createWalletClient({
    account,
    chain:     arcTestnet as any,
    transport: http(RPC),
  });
  const publicClient = createPublicClient({
    chain:     arcTestnet as any,
    transport: http(RPC),
  });

  // Check USDC balance
  const balance = await publicClient.readContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: "balanceOf",
    args:         [account.address],
  }) as bigint;

  const balanceNum = Number(balance) / 1e6;
  console.log(`USDC Balance: ${balanceNum.toFixed(2)} USDC`);

  if (balanceNum < 5) {
    console.log("Need at least 5 USDC. Get from https://faucet.circle.com (select Arc Testnet)");
    await prisma.$disconnect();
    return;
  }

  // Get all undeployed markets with future resolve dates
  const undeployed = await prisma.market.findMany({
    where: {
      outcome:    "OPEN",
      status:     "active",
      resolvesAt: { gt: new Date() },
      OR: [
        { address: { startsWith: "ai-" } },
        { address: { startsWith: "0x000" } },
        { address: "" },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\nFound ${undeployed.length} markets to deploy`);

  // Cap by USDC balance
  const maxDeploy = Math.floor(balanceNum / 5);
  const toDeploy  = undeployed.slice(0, maxDeploy);

  if (toDeploy.length === 0) {
    console.log("Nothing to deploy (all markets either deployed or expired)");
    await prisma.$disconnect();
    return;
  }

  console.log(`Deploying ${toDeploy.length} markets at 5 USDC each = ${toDeploy.length * 5} USDC total`);

  // Approve total USDC needed
  const needed = BigInt(toDeploy.length) * INIT_LIQUIDITY;
  console.log(`\nApproving ${Number(needed) / 1e6} USDC for factory...`);
  const approveTx = await walletClient.writeContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: "approve",
    args:         [FACTORY_ADDRESS, needed],
    ...GAS,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log(`Approved ✓\n`);

  let deployed = 0;
  let failed   = 0;

  for (const market of toDeploy) {
    try {
      const resolvesAt = BigInt(Math.floor(new Date(market.resolvesAt).getTime() / 1000));

      console.log(`[${deployed + 1}/${toDeploy.length}] ${market.question.slice(0, 70)}...`);

      const tx = await walletClient.writeContract({
        address:      FACTORY_ADDRESS,
        abi:          FACTORY_ABI,
        functionName: "createMarket",
        args:         [market.question, market.category, resolvesAt, INIT_LIQUIDITY],
        ...GAS,
      });

      await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });

      // Get the newly deployed market address from the factory
      const count = await publicClient.readContract({
        address:      FACTORY_ADDRESS,
        abi:          FACTORY_ABI,
        functionName: "getMarketCount",
      }) as bigint;

      const marketAddr = await publicClient.readContract({
        address:      FACTORY_ADDRESS,
        abi:          FACTORY_ABI,
        functionName: "allMarkets",
        args:         [count - 1n],
      }) as string;

      await prisma.market.update({
        where: { id: market.id },
        data:  { address: marketAddr },
      });

      console.log(`  ✓ Address: ${marketAddr}`);
      console.log(`  ✓ TX:      ${EXPLORER}/tx/${tx}`);
      deployed++;

      await new Promise(r => setTimeout(r, 2000));
    } catch (err: any) {
      console.error(`  ✗ Failed: ${err.message?.slice(0, 100)}`);
      failed++;
      if (err.message?.includes("insufficient") || err.message?.includes("transfer")) {
        console.log("\nOut of USDC — stopping. Get more at https://faucet.circle.com");
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Deployed:  ${deployed}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  USDC used: ~${deployed * 5} USDC`);
  console.log(`  Remaining: ~${(balanceNum - deployed * 5).toFixed(2)} USDC`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await prisma.$disconnect();
}

main().catch(err => { console.error("Script failed:", err); process.exit(1); });
