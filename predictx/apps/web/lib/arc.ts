import { createPublicClient, http, formatUnits, parseUnits } from "viem";
import { arcTestnet } from "@/app/providers";

// ── Verified Arc Testnet constants ──────────────────────────────────────────
export const ARC_CHAIN_ID     = 5042002;
export const ARC_CHAIN_ID_HEX = "0x4CEF52"; // 5042002 in hex — verified: parseInt("4CEF52",16) === 5042002
export const ARC_RPC          = "https://rpc.testnet.arc.network";
export const ARC_EXPLORER     = "https://testnet.arcscan.app";

// USDC on Arc — always 6 decimals in ERC-20 interface
export const USDC_ADDRESS  = "0x3600000000000000000000000000000000000000" as const;
export const USDC_DECIMALS = 6;

// Every Arc transaction must include this gas config
export const ARC_GAS_CONFIG = {
  maxFeePerGas: BigInt("160000000000"), // 160 Gwei minimum
} as const;

// Deployed contract addresses
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
export const ORACLE_ADDRESS  = process.env.NEXT_PUBLIC_ORACLE_ADDRESS  as `0x${string}`;

// ── USDC ERC-20 minimal ABI ─────────────────────────────────────────────────
export const USDC_ABI = [
  {
    name: "balanceOf", type: "function", stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "",        type: "uint256" }],
  },
  {
    name: "approve", type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "",        type: "bool"    }],
  },
  {
    name: "allowance", type: "function", stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "",      type: "uint256" }],
  },
  {
    name: "decimals", type: "function", stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// ── Public viem client ──────────────────────────────────────────────────────
export const arcPublicClient = createPublicClient({
  chain:     arcTestnet,
  transport: http(ARC_RPC),
});

// ── USDC helpers ────────────────────────────────────────────────────────────
export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
}

export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

// ── Fetch real USDC balance from Arc ────────────────────────────────────────
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const balance = await arcPublicClient.readContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: "balanceOf",
      args:         [address as `0x${string}`],
    });
    return formatUSDC(balance as bigint);
  } catch {
    return "0.00";
  }
}

// ── Arc chain params (shared between add + switch) ──────────────────────────
const ARC_CHAIN_PARAMS = {
  chainId:           ARC_CHAIN_ID_HEX,
  chainName:         "Arc Testnet",
  nativeCurrency:    { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls:           [ARC_RPC],
  blockExplorerUrls: [ARC_EXPLORER],
};

// ── Add Arc Testnet to any EIP-1193 wallet (MetaMask, Rabby, etc.) ──────────
export async function addArcToWallet(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    console.log("[Arc] No injected wallet found");
    return false;
  }

  console.log("[Arc] Requesting wallet_addEthereumChain with chainId:", ARC_CHAIN_ID_HEX);
  try {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [ARC_CHAIN_PARAMS],
    });
    console.log("[Arc] wallet_addEthereumChain succeeded");
    return true;
  } catch (err: any) {
    console.error("[Arc] wallet_addEthereumChain failed:", err.code, err.message);
    return false;
  }
}

// ── Switch wallet to Arc Testnet (tries switch → add on 4902) ───────────────
export async function switchToArc(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    console.log("[Arc] No injected wallet found");
    return false;
  }

  console.log("[Arc] Requesting wallet_switchEthereumChain to", ARC_CHAIN_ID_HEX);
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN_ID_HEX }],
    });
    console.log("[Arc] Switched to Arc Testnet successfully");
    return true;
  } catch (err: any) {
    console.log("[Arc] wallet_switchEthereumChain failed:", err.code, err.message);
    // 4902 = chain not found in wallet — add it
    if (err.code === 4902 || err.code === -32603) {
      console.log("[Arc] Chain not found, adding Arc Testnet...");
      return addArcToWallet();
    }
    console.error("[Arc] Unexpected switch error:", err.message);
    return false;
  }
}

// ── Convenience: ensure Arc is added AND active ──────────────────────────────
export async function ensureArcNetwork(): Promise<boolean> {
  const switched = await switchToArc();
  if (!switched) {
    // switchToArc already tried addArcToWallet internally on 4902
    // Try add once more as last resort for wallets with non-standard error codes
    return addArcToWallet();
  }
  return true;
}

// ── Explorer URL helpers ────────────────────────────────────────────────────
export function txExplorerUrl(hash: string): string {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

export function addressExplorerUrl(address: string): string {
  return `${ARC_EXPLORER}/address/${address}`;
}
