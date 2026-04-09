import { useState } from "react";
import { executeSellShares } from "@/lib/arcWallet";

export type SellStep =
  | "idle"
  | "switching_network"
  | "checking_balance"
  | "buying"       // reused — "Confirm sell in wallet"
  | "confirming"
  | "success"
  | "error";

export const SELL_STEP_LABELS: Record<SellStep, string> = {
  idle:             "Sell shares",
  switching_network:"Switching to Arc Testnet...",
  checking_balance: "Checking your shares...",
  buying:           "Confirm sell in your wallet...",
  confirming:       "Confirming on Arc Testnet...",
  success:          "✓ Shares sold!",
  error:            "Failed — try again",
};

function friendlyError(raw: string): string {
  if (raw.includes("User rejected") || raw.includes("user rejected") || raw.includes("4001"))
    return "You cancelled the transaction in your wallet";
  if (raw.includes("Insufficient shares"))
    return raw;
  if (raw.includes("No wallet"))
    return raw;
  if (raw.includes("locked"))
    return raw;
  if (raw.includes("Market closed") || raw.includes("Market expired"))
    return "This market is closed and shares can no longer be sold";
  return "Transaction failed. Check your wallet is on Arc Testnet.";
}

export function useSellShares() {
  const [step,     setStep]     = useState<SellStep>("idle");
  const [txHash,   setTxHash]   = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sellShares = async (
    marketAddress: string,
    isYes: boolean,
    sharesAmount: string,
    injectedProvider?: any,
  ): Promise<string | null> => {
    setStep("idle");
    setTxHash("");
    setErrorMsg("");

    try {
      const hash = await executeSellShares(
        marketAddress,
        isYes,
        sharesAmount,
        (s) => setStep(s as SellStep),
        injectedProvider,
      );
      setTxHash(hash);
      setStep("success");
      return hash;
    } catch (err: any) {
      console.error("[useSellShares]", err);
      setErrorMsg(friendlyError(err?.message ?? "Transaction failed"));
      setStep("error");
      return null;
    }
  };

  const reset = () => {
    setStep("idle");
    setTxHash("");
    setErrorMsg("");
  };

  const isProcessing = [
    "switching_network",
    "checking_balance",
    "buying",
    "confirming",
  ].includes(step);

  return { sellShares, step, txHash, errorMsg, reset, isProcessing };
}
