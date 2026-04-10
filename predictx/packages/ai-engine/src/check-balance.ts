import { createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
]);

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Deployer Address: ${account.address}`);

  const publicClient = createPublicClient({
    transport: http("https://rpc.testnet.arc.network"),
  });

  const [balance, symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "decimals",
    }),
  ]);

  console.log(`Balance: ${Number(balance) / Math.pow(10, decimals)} ${symbol}`);
}

main().catch(console.error);
