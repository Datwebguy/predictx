import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { arcTestnet } from "@/app/providers";

// ── Chain constants ─────────────────────────────────────────────────────────
export const ARC_CHAIN_ID  = 5042002;
// 5042002 decimal = 0x4CEF52 (verified: parseInt("4CEF52",16) === 5042002)
export const ARC_CHAIN_HEX = "0x4CEF52";
export const ARC_RPC       = "https://rpc.testnet.arc.network";
export const ARC_EXPLORER  = "https://testnet.arcscan.app";

export const USDC_ADDRESS  = "0x3600000000000000000000000000000000000000" as const;
export const USDC_DECIMALS = 6;

export const GAS_CONFIG = {
  maxFeePerGas:         BigInt("160000000000"), // 160 Gwei minimum on Arc
  maxPriorityFeePerGas: BigInt("1000000000"),   // 1 Gwei tip
} as const;

// Params used by wallet_addEthereumChain
const ARC_CHAIN_PARAMS = {
  chainId:           ARC_CHAIN_HEX,
  chainName:         "Arc Testnet",
  nativeCurrency:    { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls:           [ARC_RPC],
  blockExplorerUrls: [ARC_EXPLORER],
};

// ── ABIs ────────────────────────────────────────────────────────────────────
export const USDC_ABI = [
  {
    name: "balanceOf", type: "function", stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance", type: "function", stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve", type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transfer", type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const MARKET_ABI = [
  {
    name: "buyShares", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "isYes",        type: "bool"    },
      { name: "usdcIn",       type: "uint256" },
      { name: "minSharesOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sellShares", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "isYes",       type: "bool"    },
      { name: "sharesIn",    type: "uint256" },
      { name: "minUsdcOut",  type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "positions", type: "function", stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [
      { name: "yesShares", type: "uint256" },
      { name: "noShares",  type: "uint256" },
    ],
  },
] as const;

// ── Provider detection ──────────────────────────────────────────────────────
// Works with Rabby, Zerion, MetaMask, Coinbase Wallet, Rainbow, and any
// EIP-1193 wallet that injects window.ethereum.
export function getEthereumProvider(): any {
  if (typeof window === "undefined") return null;
  if ((window as any).ethereum) return (window as any).ethereum;
  // EIP-6963 fallback (newer wallets)
  const evmProviders = (window as any).evmproviders;
  if (evmProviders) {
    const first = Object.values(evmProviders)[0];
    if (first) return first;
  }
  return null;
}

// ── Arc Testnet network management ─────────────────────────────────────────
export async function addArcToWallet(injectedProvider?: any): Promise<void> {
  const provider = injectedProvider ?? getEthereumProvider();
  if (!provider) throw new Error("No wallet found");
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [ARC_CHAIN_PARAMS],
    });
  } catch (err: any) {
    if (err.code !== 4001) throw err; // 4001 = user rejected, that's ok
  }
}

export async function switchToArc(injectedProvider?: any): Promise<void> {
  const provider = injectedProvider ?? getEthereumProvider();
  if (!provider) throw new Error("No wallet found");

  const currentChainId = await provider.request({ method: "eth_chainId" });
  if (currentChainId === ARC_CHAIN_HEX) return; // already on Arc

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_CHAIN_HEX }],
    });
  } catch (err: any) {
    // 4902: chain not added, 32603: generic error (often means chain not added in some mobile wallets)
    if (err.code === 4902 || err.code === -32603 || err.message?.includes("Unrecognized chain ID")) {
      // Chain not in wallet — add it then switch
      await addArcToWallet(provider);
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_HEX }],
      });
    } else if (err.code === 4001) {
      throw new Error("Please switch to Arc Testnet in your wallet to continue");
    } else {
      throw err;
    }
  }
}

// ── USDC balance ────────────────────────────────────────────────────────────
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const client = createPublicClient({
      chain:     arcTestnet,
      transport: http(ARC_RPC),
    });
    const balance = await client.readContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: "balanceOf",
      args:         [address as `0x${string}`],
    });
    return formatUnits(balance as bigint, USDC_DECIMALS);
  } catch {
    return "0.00";
  }
}

// ── Main buy shares function ─────────────────────────────────────────────────
// Works with ALL EIP-1193 wallets: Rabby, Zerion, MetaMask, Coinbase, Rainbow.
// Also works with Privy embedded wallets via their injected provider.
export async function executeBuyShares(
  marketAddress: string,
  isYes: boolean,
  usdcAmountString: string,
  onStep: (step: string) => void,
  injectedProvider?: any,
): Promise<string> {
  console.group("[BuyShares]");
  console.log("Market:", marketAddress);
  console.log("Side:", isYes ? "YES" : "NO");
  console.log("Amount:", usdcAmountString, "USDC");
  console.log("Provider:", injectedProvider ? "injected" : "window.ethereum");
  console.groupEnd();

  // 1. Detect provider — use injected first, then window.ethereum
  const provider = injectedProvider ?? getEthereumProvider();
  if (!provider) {
    throw new Error(
      "No wallet detected. Please install MetaMask, Rabby, or Zerion and refresh.",
    );
  }

  // 2. Switch to Arc Testnet
  onStep("switching_network");
  await switchToArc(provider);

  // 3. Get connected account
  const accounts: string[] = await provider.request({ method: "eth_accounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("Wallet is locked. Please unlock your wallet and try again.");
  }
  const address = accounts[0] as `0x${string}`;

  // 4. Create viem clients
  const walletClient = createWalletClient({
    account:   address,
    chain:     arcTestnet,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain:     arcTestnet,
    transport: http(ARC_RPC),
  });

  // 5. Parse amount — USDC is always 6 decimals on Arc
  const usdcAmount = parseUnits(usdcAmountString, USDC_DECIMALS);

  // 6. Check balance
  onStep("checking_balance");
  const balance = await publicClient.readContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: "balanceOf",
    args:         [address],
  }) as bigint;

  if (balance < usdcAmount) {
    const have = Number(formatUnits(balance, USDC_DECIMALS)).toFixed(2);
    throw new Error(
      `Insufficient USDC. You have ${have} USDC but need ${usdcAmountString} USDC. ` +
      `Visit faucet.circle.com to get testnet USDC.`,
    );
  }

  // 7. Check/set allowance — skip approve tx if already sufficient
  const allowance = await publicClient.readContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: "allowance",
    args:         [address, marketAddress as `0x${string}`],
  }) as bigint;

  if (allowance < usdcAmount) {
    onStep("approving");
    const approveTx = await walletClient.writeContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: "approve",
      args:         [marketAddress as `0x${string}`, usdcAmount],
      ...GAS_CONFIG,
    });
    onStep("waiting_approve");
    await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 });
  }

  // 8. Buy shares
  onStep("buying");
  const buyTx = await walletClient.writeContract({
    address:      marketAddress as `0x${string}`,
    abi:          MARKET_ABI,
    functionName: "buyShares",
    args:         [isYes, usdcAmount, BigInt(0)],
    ...GAS_CONFIG,
  });

  onStep("confirming");
  await publicClient.waitForTransactionReceipt({ hash: buyTx, timeout: 60_000 });

  return buyTx;
}

// ── Sell shares ──────────────────────────────────────────────────────────────
export async function executeSellShares(
  marketAddress: string,
  isYes: boolean,
  sharesAmountString: string,   // number of shares (6 decimals — USDC scale)
  onStep: (step: string) => void,
  injectedProvider?: any,
): Promise<string> {
  const provider = injectedProvider ?? getEthereumProvider();
  if (!provider) throw new Error("No wallet detected.");

  onStep("switching_network");
  await switchToArc(provider);

  const accounts: string[] = await provider.request({ method: "eth_accounts" });
  if (!accounts?.length) throw new Error("Wallet is locked.");
  const address = accounts[0] as `0x${string}`;

  const walletClient = createWalletClient({
    account:   address,
    chain:     arcTestnet,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain:     arcTestnet,
    transport: http(ARC_RPC),
  });

  // Shares use USDC scale (6 decimals) — the AMM pools are seeded/denominated in USDC units
  const sharesIn = parseUnits(sharesAmountString, USDC_DECIMALS);

  // Check on-chain position to make sure user has enough shares
  onStep("checking_balance");
  const pos = await publicClient.readContract({
    address:      marketAddress as `0x${string}`,
    abi:          MARKET_ABI,
    functionName: "positions",
    args:         [address],
  }) as [bigint, bigint];

  const held = isYes ? pos[0] : pos[1];
  if (held < sharesIn) {
    const haveShares = formatUnits(held, USDC_DECIMALS);
    throw new Error(`Insufficient shares. You have ${Number(haveShares).toFixed(4)} shares.`);
  }

  onStep("buying"); // reusing label — shows as "Confirming..."
  const sellTx = await walletClient.writeContract({
    address:      marketAddress as `0x${string}`,
    abi:          MARKET_ABI,
    functionName: "sellShares",
    args:         [isYes, sharesIn, BigInt(0)],
    ...GAS_CONFIG,
  });

  onStep("confirming");
  await publicClient.waitForTransactionReceipt({ hash: sellTx, timeout: 60_000 });

  return sellTx;
}

// ── Read on-chain position for an address ────────────────────────────────────
export async function getOnChainPosition(
  marketAddress: string,
  userAddress: string,
): Promise<{ yesShares: string; noShares: string }> {
  const publicClient = createPublicClient({
    chain:     arcTestnet,
    transport: http(ARC_RPC),
  });
  const pos = await publicClient.readContract({
    address:      marketAddress as `0x${string}`,
    abi:          MARKET_ABI,
    functionName: "positions",
    args:         [userAddress as `0x${string}`],
  }) as [bigint, bigint];

  // Shares are stored in USDC scale (6 decimals) inside the contract
  return {
    yesShares: formatUnits(pos[0], USDC_DECIMALS),
    noShares:  formatUnits(pos[1], USDC_DECIMALS),
  };
}

// ── Send USDC (ERC-20 transfer) ──────────────────────────────────────────────
// Accepts the sender address and provider explicitly so it works with ALL
// wallet types: Rabby/MetaMask (window.ethereum), Privy embedded, Zerion, etc.
export async function sendUSDC(
  fromAddress: string,
  toAddress: string,
  amount: string,
  onStep: (step: string) => void,
  injectedProvider?: any,
): Promise<string> {
  console.group("[SendUSDC]");
  console.log("From:", fromAddress);
  console.log("To:", toAddress);
  console.log("Amount:", amount, "USDC");
  console.log("Provider:", injectedProvider ? "injected" : "window.ethereum");
  console.groupEnd();

  onStep("checking_wallet");

  if (!fromAddress) {
    throw new Error("No wallet connected. Please connect your wallet first.");
  }
  if (!toAddress || !toAddress.startsWith("0x") || toAddress.length !== 42) {
    throw new Error("Invalid recipient address. Must be a valid 0x address.");
  }
  const amountNum = Number(amount);
  if (!amount || isNaN(amountNum) || amountNum <= 0) {
    throw new Error("Invalid amount. Must be greater than 0.");
  }

  // Resolve provider: use injected first, then window.ethereum
  const walletProvider: any = injectedProvider ?? getEthereumProvider();
  if (!walletProvider) {
    throw new Error("No wallet provider found. Please use MetaMask, Rabby, or Zerion.");
  }

  // Switch to Arc Testnet
  onStep("switching_network");
  try {
    const currentChain = await walletProvider.request({ method: "eth_chainId" });
    if (currentChain !== ARC_CHAIN_HEX) {
      try {
        await walletProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARC_CHAIN_HEX }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902 || switchErr.code === -32603) {
          await walletProvider.request({
            method: "wallet_addEthereumChain",
            params: [ARC_CHAIN_PARAMS],
          });
        } else if (switchErr.code === 4001) {
          throw new Error("Please switch to Arc Testnet in your wallet.");
        }
      }
    }
  } catch (err: any) {
    if (err.message?.includes("Arc Testnet")) throw err;
    // Non-fatal — proceed anyway
  }

  const publicClient = createPublicClient({
    chain:     arcTestnet,
    transport: http(ARC_RPC),
  });

  // Check balance against the known fromAddress (not re-queried from provider)
  onStep("checking_balance");
  const balance = await publicClient.readContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: "balanceOf",
    args:         [fromAddress as `0x${string}`],
  }) as bigint;

  const sendAmount = parseUnits(amount, USDC_DECIMALS);
  const formattedBalance = formatUnits(balance, USDC_DECIMALS);

  console.log("[sendUSDC] from:", fromAddress, "balance:", formattedBalance, "sending:", amount);

  if (balance < sendAmount) {
    throw new Error(
      `Insufficient balance. You have ${Number(formattedBalance).toFixed(2)} USDC but trying to send ${amount} USDC.`
    );
  }

  const walletClient = createWalletClient({
    account:   fromAddress as `0x${string}`,
    chain:     arcTestnet,
    transport: custom(walletProvider),
  });

  onStep("sending");
  const txHash = await walletClient.writeContract({
    address:      USDC_ADDRESS,
    abi:          USDC_ABI,
    functionName: "transfer",
    args:         [toAddress as `0x${string}`, sendAmount],
    ...GAS_CONFIG,
  });

  onStep("confirming");
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });

  return txHash;
}

// ── Explorer helpers ─────────────────────────────────────────────────────────
export function txExplorerUrl(hash: string): string {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

export function addressExplorerUrl(address: string): string {
  return `${ARC_EXPLORER}/address/${address}`;
}
