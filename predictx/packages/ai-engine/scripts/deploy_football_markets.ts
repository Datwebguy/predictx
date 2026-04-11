import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "../src/lib/prisma";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

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
] as const;

const USDC_ADDRESS  = "0x3600000000000000000000000000000000000000" as const;
const INIT_LIQUIDITY = parseUnits("5", 6); // 5 USDC liquidity
const GAS = { maxFeePerGas: 160000000000n, maxPriorityFeePerGas: 1000000000n };

async function deploy() {
  try {
    const privateKey     = process.env.DEPLOYER_PRIVATE_KEY;
    const factoryAddress = process.env.FACTORY_ADDRESS;

    if (!privateKey || !factoryAddress) {
      console.error("DEPLOYER_PRIVATE_KEY or FACTORY_ADDRESS not found in root .env");
      return;
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log(`Using deployer: ${account.address}`);

    const walletClient = createWalletClient({
      account,
      chain:     arcTestnet as any,
      transport: http("https://rpc.testnet.arc.network"),
    });
    const publicClient = createPublicClient({
      chain:     arcTestnet as any,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const markets = await prisma.market.findMany({
      where: {
        address: { startsWith: "football-2026-" },
      }
    });

    if (markets.length === 0) {
      console.log("No football-2026- markets found to deploy.");
      return;
    }

    console.log(`Deploying ${markets.length} football markets...`);

    // Approve USDC
    const needed = BigInt(markets.length) * INIT_LIQUIDITY;
    console.log(`Approving ${Number(needed)/1e6} USDC to factory...`);
    const approveTx = await walletClient.writeContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: "approve",
      args:         [factoryAddress as `0x${string}`, needed],
      chain:        null,
      ...GAS,
    } as any);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    for (const m of markets) {
      console.log(`Deploying: ${m.question}`);
      const timestamp = BigInt(Math.floor(new Date(m.resolvesAt).getTime() / 1000));

      const tx = await walletClient.writeContract({
        address:      factoryAddress as `0x${string}`,
        abi:          FACTORY_ABI,
        functionName: "createMarket",
        args:         [m.question, m.category, timestamp, INIT_LIQUIDITY],
        chain:        null,
        ...GAS,
      } as any);
      await publicClient.waitForTransactionReceipt({ hash: tx });

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
        where: { id: m.id },
        data:  { address: marketAddr },
      });

      console.log(`✓ LIVE: ${marketAddr}`);
    }

    console.log("All markets are now LIVE for betting!");
  } catch (err: any) {
    console.error("Deployment failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

deploy();
