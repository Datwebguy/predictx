"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState, useCallback } from "react";
import { getUSDCBalance } from "@/lib/arcWallet";

export function useWalletAddress() {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [balance,    setBalance]    = useState("0.00");
  const [address,    setAddress]    = useState<string | null>(null);
  const [provider,   setProvider]   = useState<any>(null);
  const [walletType, setWalletType] = useState<string>("Unknown");
  const [isReady,    setIsReady]    = useState(false);

  const detectActiveWallet = useCallback(async () => {
    if (!authenticated) {
      setAddress(null);
      setBalance("0.00");
      setProvider(null);
      setWalletType("Unknown");
      setIsReady(false);
      return;
    }

    let detectedAddress: string | null = null;
    let detectedProvider: any = null;
    let detectedType = "Connected";

    const win = typeof window !== "undefined" ? (window as any) : null;

    // ── Step 1: Determine which wallet Privy considers "active" ──────────────
    // user?.wallet is the wallet Privy has associated with the current session.
    // For Google/email login → walletClientType === "privy" (embedded)
    // For external wallet login → walletClientType === "metamask" / "rabby_wallet" etc.
    const privyActiveWallet = user?.wallet;

    // ── Step 2: If Privy says the active wallet is EMBEDDED, use it directly ─
    // Do NOT check window.ethereum — that belongs to a different (external) wallet
    if (privyActiveWallet?.walletClientType === "privy") {
      // wallets list may not be populated yet — fall back to user.wallet.address
      const embeddedWallet = wallets?.find(
        w => w.address.toLowerCase() === privyActiveWallet.address.toLowerCase()
      ) ?? wallets?.find(w => w.walletClientType === "privy");

      // If wallets list is empty but user.wallet exists, use address directly
      if (!embeddedWallet && privyActiveWallet.address) {
        detectedAddress = privyActiveWallet.address;
        detectedType = "Embedded (Google/Email)";
        console.log("[Wallet] Embedded wallet (from user.wallet):", detectedAddress);
      }

      if (embeddedWallet) {
        detectedAddress = embeddedWallet.address;
        try { detectedProvider = await embeddedWallet.getEthereumProvider(); } catch {}
        detectedType = "Embedded (Google/Email)";
        console.log("[Wallet] Embedded wallet:", detectedAddress);
      }
    }

    // ── Step 3: External wallet (Rabby, MetaMask, etc.) ──────────────────────
    // Only if Privy says the active wallet is external AND window.ethereum matches
    if (!detectedAddress && privyActiveWallet && privyActiveWallet.walletClientType !== "privy") {
      if (win?.ethereum) {
        try {
          const accounts = await win.ethereum.request({ method: "eth_accounts" });
          if (accounts?.length > 0) {
            const externalAddr = accounts[0].toLowerCase();
            // Must match what Privy has on record
            if (externalAddr === privyActiveWallet.address.toLowerCase()) {
              detectedAddress = privyActiveWallet.address;
              detectedProvider = win.ethereum;
              // Identify the specific wallet brand
              if (win.ethereum.isRabby)          detectedType = "Rabby";
              else if (win.ethereum.isZerion)    detectedType = "Zerion";
              else if (win.ethereum.isCoinbaseWallet) detectedType = "Coinbase";
              else if (win.ethereum.isMetaMask)  detectedType = "MetaMask";
              else                               detectedType = privyActiveWallet.walletClientType ?? "External";
              console.log("[Wallet] External wallet:", detectedAddress, detectedType);
            }
          }
        } catch {}
      }

      // If window.ethereum didn't match, get provider from Privy wallet object
      if (!detectedAddress) {
        const matchedWallet = wallets?.find(
          w => w.address.toLowerCase() === privyActiveWallet.address.toLowerCase()
        );
        if (matchedWallet) {
          detectedAddress = matchedWallet.address;
          try { detectedProvider = await matchedWallet.getEthereumProvider(); } catch {}
          detectedType = matchedWallet.walletClientType ?? "External";
          console.log("[Wallet] Privy external wallet:", detectedAddress);
        }
      }
    }

    // ── Step 4: Fallback — any wallet in the Privy wallets list ──────────────
    if (!detectedAddress && wallets?.length) {
      // Prefer embedded > external
      const fallback =
        wallets.find(w => w.walletClientType === "privy") ?? wallets[0];
      detectedAddress = fallback.address;
      try { detectedProvider = await fallback.getEthereumProvider(); } catch {}
      detectedType = fallback.walletClientType === "privy"
        ? "Embedded (Google/Email)"
        : fallback.walletClientType ?? "Connected";
      console.log("[Wallet] Fallback wallet:", detectedAddress, detectedType);
    }

    // ── Step 5: Last resort ───────────────────────────────────────────────────
    if (!detectedAddress && user?.wallet?.address) {
      detectedAddress = user.wallet.address;
      detectedType = user.wallet.walletClientType === "privy"
        ? "Embedded (Google/Email)"
        : user.wallet.walletClientType ?? "Connected";
      console.log("[Wallet] user.wallet fallback:", detectedAddress);
    }

    if (detectedAddress) {
      setAddress(detectedAddress);
      setProvider(detectedProvider);
      setWalletType(detectedType);
      setIsReady(true);
      
      getUSDCBalance(detectedAddress)
        .then(b => setBalance(Number(b).toFixed(2)))
        .catch(() => {});
    }
  }, [authenticated, wallets, user]);

  // Re-detect whenever auth state or wallets change
  useEffect(() => {
    detectActiveWallet();
  }, [detectActiveWallet]);

  // Listen for external wallet events (accountsChanged fires when Rabby disconnects)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as any;
    if (!win.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log("[Wallet] accountsChanged:", accounts);
      detectActiveWallet();
    };
    const handleChainChanged = () => {
      console.log("[Wallet] chainChanged");
      detectActiveWallet();
    };
    const handleDisconnect = () => {
      console.log("[Wallet] disconnect event");
      detectActiveWallet();
    };

    win.ethereum.on("accountsChanged", handleAccountsChanged);
    win.ethereum.on("chainChanged",    handleChainChanged);
    win.ethereum.on("disconnect",      handleDisconnect);

    return () => {
      win.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      win.ethereum.removeListener("chainChanged",    handleChainChanged);
      win.ethereum.removeListener("disconnect",      handleDisconnect);
    };
  }, [detectActiveWallet]);

  // Refresh balance every 30 seconds
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      getUSDCBalance(address).then(b => setBalance(Number(b).toFixed(2))).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [address]);

  const refreshBalance = useCallback(() => {
    if (address) {
      getUSDCBalance(address).then(b => setBalance(Number(b).toFixed(2))).catch(() => {});
    }
  }, [address]);

  return { address, balance, provider, walletType, isReady, refreshBalance };
}
