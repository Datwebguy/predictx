/**
 * Deploy a real PredictionMarket on Arc Testnet via MarketFactory.
 *
 * Usage:
 *   cd C:\Users\EBEN\Downloads\predictx\predictx
 *   npx ts-node --transpile-only scripts/create-real-market.ts
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  parseAbi,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";

dotenv.config();

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public:  { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
} as const;

const RPC      = "https://rpc.testnet.arc.network";
const EXPLORER = "https://testnet.arcscan.app";
const USDC     = "0x3600000000000000000000000000000000000000" as `0x${string}`;
const FACTORY  = (process.env.FACTORY_ADDRESS ?? "0x1C969004C2A6EfBE1059038A3553AAbF4AB99645") as `0x${string}`;
const GAS      = {
  maxFeePerGas:         BigInt("160000000000"),
  maxPriorityFeePerGas: BigInt("1000000000"),
};

const FACTORY_ABI = parseAbi([
  "function createMarket(string question, string category, uint256 resolvesAt, uint256 initLiquidity) returns (address market)",
  "event MarketCreated(address indexed market, address indexed creator, string question)",
]);

const USDC_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

const MARKETS = [
  {
    question:      "Will Bitcoin exceed $120,000 by July 2026?",
    category:      "crypto",
    daysToResolve: 60,
    liquidity:     "50",
  },
];

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");

  const account = privateKeyToAccount(privateKey);
  console.log("Deployer:", account.address);
  console.log("Factory: ", FACTORY);

  const walletClient = createWalletClient({
    account,
    chain:     arcTestnet as any,
    transport: http(RPC),
  });

  const publicClient = createPublicClient({
    chain:     arcTestnet as any,
    transport: http(RPC),
  });

  console.log("Skipping balance check — going straight to deployment...");

  for (const market of MARKETS) {
    const initLiquidity = parseUnits(market.liquidity, 6);
    const resolvesAt    = BigInt(Math.floor(Date.now() / 1000) + market.daysToResolve * 86400);

    console.log(`\nDeploying: "${market.question}"`);

    // Approve USDC
    console.log("  Step 1/2: Approving USDC for factory...");
    const approveTx = await walletClient.writeContract({
      address:      USDC,
      abi:          USDC_ABI,
      functionName: "approve",
      args:         [FACTORY, initLiquidity],
      chain:        arcTestnet as any,
      ...GAS,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 });
    console.log(`  Approved: ${EXPLORER}/tx/${approveTx}`);

    // Create market
    console.log("  Step 2/2: Creating market on-chain...");
    const createTx = await walletClient.writeContract({
      address:      FACTORY,
      abi:          FACTORY_ABI,
      functionName: "createMarket",
      args:         [market.question, market.category, resolvesAt, initLiquidity],
      chain:        arcTestnet as any,
      ...GAS,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx, timeout: 60_000 });
    console.log(`\n✓ Market created!`);
    console.log(`  TX hash:  ${createTx}`);
    console.log(`  Explorer: ${EXPLORER}/tx/${createTx}`);

    // Try to decode MarketCreated event to get market address
    let marketAddress: string | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi:      FACTORY_ABI,
          data:     log.data,
          topics:   log.topics,
          eventName:"MarketCreated",
        }) as any;
        marketAddress = decoded.args?.market ?? null;
        break;
      } catch {}
    }

    if (marketAddress) {
      console.log(`  Market address: ${marketAddress}`);
      console.log(`  Market on Arc:  ${EXPLORER}/address/${marketAddress}`);
    } else {
      // Fallback: first log address is usually the deployed contract
      const firstLogAddr = receipt.logs[0]?.address;
      console.log(`  Market address (from logs[0]): ${firstLogAddr ?? "not found"}`);
      console.log(`  All log addresses: ${receipt.logs.map((l: any) => l.address).join(", ")}`);
    }
  }

  console.log("\n✓ Done! Copy the market address above.");
  console.log("  Update the DB: cd packages/ai-engine && npx prisma studio");
}

main().catch(err => { console.error(err); process.exit(1); });
