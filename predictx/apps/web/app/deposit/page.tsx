"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { sendUSDC } from "@/lib/arcWallet";
import { useWalletAddress } from "@/hooks/useWalletAddress";

type SendStep =
  | "idle" | "checking_wallet" | "switching_network"
  | "checking_balance" | "sending" | "confirming"
  | "success" | "error";

const SEND_LABELS: Record<SendStep, string> = {
  idle:              "Send USDC",
  checking_wallet:   "Checking wallet...",
  switching_network: "Switching to Arc Testnet...",
  checking_balance:  "Checking balance...",
  sending:           "Confirm in your wallet...",
  confirming:        "Confirming on Arc...",
  success:           "Sent successfully! ✓",
  error:             "Failed — try again",
};

const SEND_PROCESSING: SendStep[] = [
  "checking_wallet", "switching_network", "checking_balance", "sending", "confirming",
];

export default function DepositPage() {
  const { authenticated, login, user, exportWallet, linkWallet } = usePrivy();

  // Universal hook — works with Rabby, MetaMask, Zerion, Privy embedded
  const { address, balance: walletBalance, provider: walletProvider, refreshBalance } = useWalletAddress();

  const [activeTab,  setActiveTab]  = useState<"deposit"|"withdraw"|"wallet">("deposit");
  const [copied,     setCopied]     = useState(false);
  const [recipient,  setRecipient]  = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendStep,   setSendStep]   = useState<SendStep>("idle");
  const [sendTxHash, setSendTxHash] = useState("");
  const [sendError,  setSendError]  = useState("");

  const isEmbedded = user?.wallet?.walletClientType === "privy";

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!recipient || !sendAmount) return;
    if (!address) {
      setSendError("No wallet connected.");
      setSendStep("error");
      return;
    }
    setSendError("");
    setSendTxHash("");
    try {
      const hash = await sendUSDC(
        address,
        recipient,
        sendAmount,
        step => setSendStep(step as SendStep),
        walletProvider,
      );
      setSendTxHash(hash);
      setSendStep("success");
      setSendAmount("");
      setRecipient("");
      refreshBalance();
    } catch (err: any) {
      setSendError(err.message ?? "Transaction failed");
      setSendStep("error");
    }
  };

  const isSendProcessing = SEND_PROCESSING.includes(sendStep);

  if (!authenticated) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:20 }}>💰</div>
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:32, fontWeight:800, color:"#fff", marginBottom:10 }}>Connect your wallet</h1>
        <p style={{ color:"#666", fontSize:15, marginBottom:28, fontFamily:"Space Grotesk,sans-serif" }}>Sign in to manage your funds</p>
        <button onClick={() => login()} style={{ background:"#FFD60A", color:"#000", fontWeight:700, fontSize:15, padding:"12px 32px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
          Connect wallet
        </button>
      </div>
    );
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding:"10px 20px", borderRadius:10, fontWeight:600, fontSize:13,
    cursor:"pointer", fontFamily:"Space Grotesk,sans-serif", border:"none",
    background: activeTab===t ? "#FFD60A" : "#141414",
    color: activeTab===t ? "#000" : "#666",
    outline: activeTab!==t ? "1px solid #232323" : "none",
    transition:"all 0.15s",
  });

  const card: React.CSSProperties = {
    background:"#141414", border:"1px solid #232323",
    borderRadius:14, padding:24, marginBottom:16,
  };

  return (
    <div style={{ maxWidth:560, padding:"0 0 60px" }}>
      <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:36, fontWeight:800, color:"#fff", marginBottom:6 }}>
        Funds &amp; <span style={{ color:"#FFD60A" }}>Wallet</span>
      </h1>
      <p style={{ color:"#666", fontSize:14, marginBottom:28, fontFamily:"Space Grotesk,sans-serif" }}>
        Manage your USDC on Arc Testnet
      </p>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        <button style={tabStyle("deposit")}  onClick={() => setActiveTab("deposit")}>Deposit</button>
        <button style={tabStyle("withdraw")} onClick={() => setActiveTab("withdraw")}>Withdraw</button>
        <button style={tabStyle("wallet")}   onClick={() => setActiveTab("wallet")}>Wallet</button>
      </div>

      {/* ── DEPOSIT TAB ── */}
      {activeTab === "deposit" && (
        <>
          <div style={{ ...card, border:"1px solid rgba(255,214,10,0.3)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ background:"#FFD60A", color:"#000", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20 }}>FREE</span>
              <span style={{ color:"#fff", fontWeight:600, fontFamily:"Space Grotesk,sans-serif" }}>Get testnet USDC</span>
            </div>
            <p style={{ color:"#666", fontSize:13, marginBottom:16, lineHeight:1.5, fontFamily:"Space Grotesk,sans-serif" }}>
              Claim 20 free testnet USDC every 2 hours from Circle&apos;s official faucet. Select &quot;Arc Testnet&quot; on the faucet page.
            </p>
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" style={{
              display:"block", background:"#FFD60A", color:"#000", fontWeight:700,
              fontSize:14, padding:"13px 20px", borderRadius:10,
              textDecoration:"none", textAlign:"center", fontFamily:"Space Grotesk,sans-serif",
            }}>
              Go to Circle Faucet →
            </a>
          </div>

          {address && (
            <div style={card}>
              <p style={{ color:"#666", fontSize:12, marginBottom:8, fontFamily:"Space Grotesk,sans-serif" }}>
                Your Arc Testnet wallet address — send USDC here
              </p>
              <div style={{ background:"#1A1A1A", border:"1px solid #232323", borderRadius:10, padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:"#F0F0F0", wordBreak:"break-all", marginBottom:10 }}>
                {address}
              </div>
              <button onClick={copy} style={{ background: copied?"rgba(34,197,94,0.1)":"#1A1A1A", border: copied?"1px solid rgba(34,197,94,0.3)":"1px solid #232323", borderRadius:8, color: copied?"#22c55e":"#666", fontSize:12, padding:"7px 14px", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif", transition:"all 0.15s" }}>
                {copied ? "✓ Copied!" : "Copy address"}
              </button>
              <p style={{ color:"#444", fontSize:11, marginTop:10, fontFamily:"Space Grotesk,sans-serif" }}>
                After claiming from faucet, balance updates within 30 seconds
              </p>
            </div>
          )}

          <div style={card}>
            <p style={{ color:"#666", fontSize:12, marginBottom:12, fontFamily:"Space Grotesk,sans-serif", fontWeight:600 }}>Arc Testnet details</p>
            {[
              { label:"Network",  value:"Arc Testnet" },
              { label:"Chain ID", value:"5042002" },
              { label:"Currency", value:"USDC" },
              { label:"RPC URL",  value:"https://rpc.testnet.arc.network" },
              { label:"Explorer", value:"testnet.arcscan.app" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:"#666", fontSize:12, fontFamily:"Space Grotesk,sans-serif" }}>{label}</span>
                <span style={{ color:"#F0F0F0", fontSize:12, fontFamily:"monospace" }}>{value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── WITHDRAW TAB ── */}
      {activeTab === "withdraw" && (
        <div>
          <div style={card}>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:18, fontWeight:800, color:"#fff", marginBottom:6 }}>
              Send USDC
            </h3>

            {/* Balance display */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#1A1A1A", border:"1px solid #232323", borderRadius:10, padding:"10px 14px", marginBottom:20 }}>
              <span style={{ fontSize:12, color:"#666", fontFamily:"Space Grotesk,sans-serif" }}>Available balance</span>
              <span style={{ fontSize:15, fontWeight:700, color:"#FFD60A", fontFamily:"monospace" }}>{walletBalance} USDC</span>
            </div>

            {/* Recipient */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:"#666", display:"block", marginBottom:6, fontFamily:"Space Grotesk,sans-serif" }}>
                Recipient address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                disabled={isSendProcessing}
                style={{
                  width:"100%", background:"#1A1A1A",
                  border:`1px solid ${recipient && recipient.length > 2 && !recipient.startsWith("0x") ? "#ef4444" : "#232323"}`,
                  borderRadius:10, padding:"12px 14px", color:"#fff",
                  fontSize:13, fontFamily:"monospace", outline:"none",
                  boxSizing:"border-box", opacity: isSendProcessing ? 0.6 : 1,
                }}
              />
              {recipient && recipient.length > 2 && !recipient.startsWith("0x") && (
                <p style={{ color:"#ef4444", fontSize:11, marginTop:4, fontFamily:"Space Grotesk,sans-serif" }}>
                  Address must start with 0x
                </p>
              )}
            </div>

            {/* Amount */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:"#666", display:"block", marginBottom:6, fontFamily:"Space Grotesk,sans-serif" }}>
                Amount (USDC)
              </label>
              <div style={{ position:"relative" }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  disabled={isSendProcessing}
                  min="0.01"
                  step="0.01"
                  style={{
                    width:"100%", background:"#1A1A1A", border:"1px solid #232323",
                    borderRadius:10, padding:"12px 60px 12px 14px",
                    color:"#fff", fontSize:14, fontFamily:"monospace",
                    outline:"none", boxSizing:"border-box",
                    opacity: isSendProcessing ? 0.6 : 1,
                  }}
                />
                <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#666", fontSize:12 }}>
                  USDC
                </span>
              </div>
              {/* Quick amounts */}
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                {["10","25","50","100"].map(n => (
                  <button key={n} onClick={() => setSendAmount(n)} disabled={isSendProcessing} style={{ flex:1, background:"#1A1A1A", border:"1px solid #232323", borderRadius:8, color:"#666", fontSize:11, padding:"5px 0", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
                    ${n}
                  </button>
                ))}
                <button onClick={() => setSendAmount(walletBalance)} disabled={isSendProcessing} style={{ flex:1, background:"#1A1A1A", border:"1px solid #232323", borderRadius:8, color:"#FFD60A", fontSize:11, padding:"5px 0", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif", fontWeight:600 }}>
                  MAX
                </button>
              </div>
            </div>

            {/* Processing indicator */}
            {isSendProcessing && (
              <div style={{ background:"rgba(255,214,10,0.08)", border:"1px solid rgba(255,214,10,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#FFD60A", flexShrink:0 }} />
                <span style={{ color:"#FFD60A", fontSize:12, fontFamily:"Space Grotesk,sans-serif", fontWeight:600 }}>
                  {SEND_LABELS[sendStep]}
                </span>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isSendProcessing || !recipient || !sendAmount || sendStep === "success"}
              style={{
                width:"100%", padding:"14px 0",
                background: sendStep==="success" ? "#22c55e" : sendStep==="error" ? "#ef4444" : "#FFD60A",
                color: sendStep==="success" || sendStep!=="error" ? "#000" : "#fff",
                fontWeight:700, fontSize:15, borderRadius:12, border:"none",
                cursor: isSendProcessing ? "not-allowed" : "pointer",
                fontFamily:"Space Grotesk,sans-serif",
                opacity: isSendProcessing ? 0.8 : 1,
                transition:"all 0.15s",
              }}
            >
              {SEND_LABELS[sendStep]}
            </button>

            {/* Success */}
            {sendStep === "success" && sendTxHash && (
              <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:10, padding:14, marginTop:12, textAlign:"center" }}>
                <p style={{ color:"#22c55e", fontSize:13, marginBottom:8, fontFamily:"Space Grotesk,sans-serif" }}>
                  ✓ USDC sent successfully
                </p>
                <a href={`https://testnet.arcscan.app/tx/${sendTxHash}`} target="_blank" rel="noopener noreferrer"
                  style={{ color:"#FFD60A", fontSize:12, fontFamily:"Space Grotesk,sans-serif" }}>
                  View on Arc Explorer →
                </a>
                <br />
                <button onClick={() => setSendStep("idle")} style={{ marginTop:10, background:"transparent", border:"none", color:"#666", fontSize:12, cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
                  Send another
                </button>
              </div>
            )}

            {/* Error */}
            {sendStep === "error" && sendError && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:12, marginTop:12 }}>
                <p style={{ color:"#ef4444", fontSize:12, margin:0, fontFamily:"Space Grotesk,sans-serif" }}>
                  {sendError}
                </p>
                {sendError.toLowerCase().includes("usdc") && (
                  <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                    style={{ color:"#FFD60A", fontSize:12, display:"block", marginTop:6, fontFamily:"Space Grotesk,sans-serif" }}>
                    Get testnet USDC from faucet →
                  </a>
                )}
              </div>
            )}

            <p style={{ textAlign:"center", color:"#444", fontSize:11, marginTop:14, fontFamily:"Space Grotesk,sans-serif" }}>
              Gas fee: ~0.001 USDC · Arc Testnet only
            </p>
          </div>

          <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:12, padding:14 }}>
            <p style={{ color:"#ef4444", fontSize:12, fontFamily:"Space Grotesk,sans-serif", lineHeight:1.5, margin:0 }}>
              ⚠️ Always verify the recipient address before sending.
              Blockchain transactions are irreversible.
              This is Arc Testnet — funds have no real monetary value.
            </p>
          </div>
        </div>
      )}

      {/* ── WALLET TAB ── */}
      {activeTab === "wallet" && (
        <>
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:18, fontWeight:800, color:"#fff", margin:0 }}>
                Your wallet
              </h3>
              <span style={{
                fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                background: isEmbedded?"rgba(255,214,10,0.1)":"rgba(34,197,94,0.1)",
                color: isEmbedded?"#FFD60A":"#22c55e",
                fontFamily:"Space Grotesk,sans-serif",
              }}>
                {isEmbedded ? "Embedded wallet" : "External wallet"}
              </span>
            </div>
            <div style={{ background:"#1A1A1A", border:"1px solid #232323", borderRadius:10, padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:"#F0F0F0", wordBreak:"break-all", marginBottom:10 }}>
              {address}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={copy} style={{ flex:1, background:"#1A1A1A", border:"1px solid #232323", borderRadius:8, color: copied?"#22c55e":"#666", fontSize:12, padding:"8px 0", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
                {copied ? "✓ Copied" : "Copy address"}
              </button>
              <a href={`https://testnet.arcscan.app/address/${address}`} target="_blank" rel="noopener noreferrer"
                style={{ flex:1, background:"#1A1A1A", border:"1px solid #232323", borderRadius:8, color:"#666", fontSize:12, padding:"8px 0", textDecoration:"none", textAlign:"center", fontFamily:"Space Grotesk,sans-serif", display:"block" }}>
                View on Explorer
              </a>
            </div>
          </div>

          {isEmbedded && (
            <div style={{ ...card, border:"1px solid rgba(255,214,10,0.2)", background:"rgba(255,214,10,0.03)" }}>
              <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:800, color:"#FFD60A", marginBottom:10 }}>
                Export private key
              </h3>
              <p style={{ color:"#666", fontSize:13, lineHeight:1.5, marginBottom:16, fontFamily:"Space Grotesk,sans-serif" }}>
                Export to Rabby, MetaMask, or any wallet. Keep it secret.
              </p>
              <button onClick={() => exportWallet()} style={{ width:"100%", background:"#FFD60A", color:"#000", fontWeight:700, fontSize:14, padding:"12px 0", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
                Export private key
              </button>
              <p style={{ color:"#444", fontSize:11, marginTop:10, textAlign:"center", fontFamily:"Space Grotesk,sans-serif" }}>
                Privy will verify your identity before showing your key
              </p>
            </div>
          )}

          <div style={card}>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:800, color:"#fff", marginBottom:10 }}>
              {isEmbedded ? "Link external wallet" : "Switch wallet"}
            </h3>
            <p style={{ color:"#666", fontSize:13, lineHeight:1.5, marginBottom:16, fontFamily:"Space Grotesk,sans-serif" }}>
              {isEmbedded
                ? "Connect Rabby, MetaMask, or Zerion for full custody."
                : "Link another wallet to your PredictX account."}
            </p>
            <button onClick={() => linkWallet()} style={{ width:"100%", background:"#1A1A1A", border:"1px solid #232323", borderRadius:10, color:"#F0F0F0", fontWeight:600, fontSize:14, padding:"12px 0", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
              {isEmbedded ? "Link Rabby / MetaMask / Zerion" : "Link another wallet"}
            </button>
          </div>

          <div style={card}>
            <h3 style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:800, color:"#fff", marginBottom:12 }}>
              Add Arc Testnet to your wallet
            </h3>
            {[
              { label:"Network name", value:"Arc Testnet" },
              { label:"RPC URL",      value:"https://rpc.testnet.arc.network" },
              { label:"Chain ID",     value:"5042002" },
              { label:"Currency",     value:"USDC" },
              { label:"Explorer",     value:"https://testnet.arcscan.app" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #1a1a1a" }}>
                <span style={{ color:"#666", fontSize:12, fontFamily:"Space Grotesk,sans-serif" }}>{label}</span>
                <span style={{ color:"#F0F0F0", fontSize:12, fontFamily:"monospace" }}>{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
