import { useState } from "react";
import { executeBuyShares } from "@/lib/arcWallet";

export type BuyStep =
  | "idle"
  | "switching_network"
  | "checking_balance"
  | "approving"
  | "waiting_approve"
  | "buying"
  | "confirming"
  | "success"
  | "error";

export const STEP_LABELS: Record<BuyStep, string> = {
  idle:             "Buy shares",
  switching_network:"Switching to Arc Testnet...",
  checking_balance: "Checking USDC balance...",
  approving:        "Approve USDC in your wallet...",
  waiting_approve:  "Waiting for approval...",
  buying:           "Confirm purchase in your wallet...",
  confirming:       "Confirming on Arc Testnet...",
  success:          "✓ Prediction placed!",
  error:            "Failed — try again",
};

function friendlyError(raw: string): string {
  if (raw.includes("User rejected") || raw.includes("user rejected") || raw.includes("4001"))
    return "You cancelled the transaction in your wallet";
  if (raw.includes("Insufficient USDC") || raw.includes("insufficient"))
    return raw;
  if (raw.includes("No wallet"))
    return raw;
  if (raw.includes("locked"))
    return raw;
  if (raw.includes("Arc Testnet") || raw.includes("switch"))
    return raw;
  return "Transaction failed. Check your wallet is on Arc Testnet and has USDC.";
}

export function useBuyShares() {
  const [step,     setStep]     = useState<BuyStep>("idle");
  const [txHash,   setTxHash]   = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const buyShares = async (
    marketAddress: string,
    isYes: boolean,
    usdcAmount: string,
    injectedProvider?: any,
  ): Promise<string | null> => {
    setStep("idle");
    setTxHash("");
    setErrorMsg("");

    try {
      const hash = await executeBuyShares(
        marketAddress,
        isYes,
        usdcAmount,
        (s) => setStep(s as BuyStep),
        injectedProvider,
      );
      setTxHash(hash);
      setStep("success");
      return hash;
    } catch (err: any) {
      console.error("[useBuyShares]", err);
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
    "approving",
    "waiting_approve",
    "buying",
    "confirming",
  ].includes(step);

  return { buyShares, step, txHash, errorMsg, reset, isProcessing, STEP_LABELS };
}
