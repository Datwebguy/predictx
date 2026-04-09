"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useBuyShares, STEP_LABELS } from "@/hooks/useBuyShares";
import { useSellShares, SELL_STEP_LABELS } from "@/hooks/useSellShares";
import { txExplorerUrl, getOnChainPosition } from "@/lib/arcWallet";
import { useWalletAddress } from "@/hooks/useWalletAddress";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    crypto: "rgba(251,191,36,0.15)", sports: "rgba(59,130,246,0.15)",
    politics: "rgba(239,68,68,0.15)", tech: "rgba(168,85,247,0.15)",
    entertainment: "rgba(236,72,153,0.15)", macroeconomics: "rgba(16,185,129,0.15)",
    other: "rgba(107,114,128,0.15)",
  };
  return map[category?.toLowerCase()] ?? map.other;
}
function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    crypto: "#fbbf24", sports: "#60a5fa", politics: "#f87171",
    tech: "#c084fc", entertainment: "#f472b6", macroeconomics: "#34d399",
    other: "#9ca3af",
  };
  return map[category?.toLowerCase()] ?? map.other;
}

function isDeployedMarket(address: string | null | undefined): boolean {
  if (!address) return false;
  if (!address.startsWith("0x")) return false;
  if (address.startsWith("0x000000")) return false;
  return address.length === 42;
}

function MarketDetailInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const { authenticated, login } = usePrivy();
  const { buyShares, step: buyStep, txHash: buyTxHash, errorMsg: buyErr, reset: resetBuy, isProcessing: isBuying } = useBuyShares();
  const { sellShares, step: sellStep, txHash: sellTxHash, errorMsg: sellErr, reset: resetSell, isProcessing: isSelling } = useSellShares();
  const { address: walletAddress, provider: walletProvider } = useWalletAddress();

  const [market,   setMarket]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [trades,   setTrades]   = useState<any[]>([]);
  const [tab,      setTab]      = useState<"buy" | "sell">("buy");
  const [side,     setSide]     = useState<"YES" | "NO">(
    (searchParams.get("side") as "YES" | "NO") ?? "YES"
  );
  const [amount,      setAmount]      = useState("");
  const [sellShares_, setSellShares_] = useState("");
  const [position,    setPosition]    = useState<{ yesShares: string; noShares: string } | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`${API}/api/markets/${params.id}`)
      .then(r => r.json())
      .then(({ data }) => { setMarket(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    fetch(`${API}/api/markets/${params.id}/trades`)
      .then(r => r.json())
      .then(d => setTrades(d.data ?? []))
      .catch(() => {});
  }, [params.id]);

  // Load on-chain position when we have address + deployed market
  useEffect(() => {
    if (!walletAddress || !market?.address || !isDeployedMarket(market.address)) return;
    getOnChainPosition(market.address, walletAddress)
      .then(setPosition)
      .catch(() => {});
  }, [walletAddress, market?.address]);

  // Reload position after a successful sell
  useEffect(() => {
    if (sellStep === "success" && walletAddress && market?.address) {
      getOnChainPosition(market.address, walletAddress).then(setPosition).catch(() => {});
    }
  }, [sellStep, walletAddress, market?.address]);

  if (loading) return (
    <div style={{ padding: 60, color: "#555", fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
      Loading market...
    </div>
  );
  if (!market) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <p style={{ color: "#666", fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>Market not found</p>
      <Link href="/" style={{ color: "#FFD60A", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>← Back to markets</Link>
    </div>
  );

  const yesProb = market.yesProbability ?? 50;
  const noProb  = 100 - yesProb;
  const price   = side === "YES" ? yesProb / 100 : noProb / 100;
  const shares  = amount ? (Number(amount) / price).toFixed(2) : "0";
  const payout  = amount ? Number(shares).toFixed(2) : "0";
  const profit  = amount ? (Number(payout) - Number(amount)).toFixed(2) : "0";
  const deployed = isDeployedMarket(market.address);

  const yesHeld = Number(position?.yesShares ?? 0);
  const noHeld  = Number(position?.noShares  ?? 0);
  const hasPosition = yesHeld > 0.0001 || noHeld > 0.0001;

  // Estimated USDC back from selling (rough: shares * price)
  const sellSide = side === "YES" ? "YES" : "NO";
  const sellPrice = side === "YES" ? yesProb / 100 : noProb / 100;
  const sellEstimate = sellShares_ ? (Number(sellShares_) * sellPrice).toFixed(2) : "0";

  const handleBuy = async () => {
    if (!authenticated) { login(); return; }
    if (!amount || Number(amount) < 1) { alert("Minimum bet is 1 USDC"); return; }
    if (!deployed) { alert("This market is not yet deployed on-chain."); return; }
    resetBuy();
    await buyShares(market.address, side === "YES", amount, walletProvider);
    // Refresh position after buy
    if (walletAddress) getOnChainPosition(market.address, walletAddress).then(setPosition).catch(() => {});
  };

  const handleSell = async () => {
    if (!authenticated) { login(); return; }
    if (!sellShares_ || Number(sellShares_) <= 0) { alert("Enter the number of shares to sell"); return; }
    if (!deployed) { alert("This market is not yet deployed on-chain."); return; }
    resetSell();
    await sellShares(market.address, side === "YES", sellShares_, walletProvider);
  };

  const card: React.CSSProperties = {
    background: "#141414", border: "1px solid #232323",
    borderRadius: 14, padding: 24, marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        color: "#555", fontSize: 13, textDecoration: "none",
        marginBottom: 24, fontFamily: "'DM Sans', sans-serif",
        transition: "color 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={e => (e.currentTarget.style.color = "#555")}
      >
        ← All markets
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* ── Left column ── */}
        <div>
          {/* Header */}
          <div style={card}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              background: getCategoryBg(market.category), color: getCategoryColor(market.category),
              textTransform: "uppercase", letterSpacing: "0.3px",
              display: "inline-block", marginBottom: 14,
            }}>
              {market.category}
            </span>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif", fontSize: 26,
              fontWeight: 700, color: "#fff", lineHeight: 1.35, marginBottom: 14,
            }}>
              {market.question}
            </h1>
            <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
              {market.description}
            </p>
          </div>

          {/* Probability */}
          <div style={card}>
            <p style={{ color: "#555", fontSize: 12, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
              Current probability
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 52, fontWeight: 700, color: "#22c55e", lineHeight: 1 }}>
                  {yesProb}%
                </div>
                <div style={{ color: "#555", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>chance YES</div>
              </div>
              <div style={{ color: "#333", fontSize: 28, fontFamily: "'DM Serif Display', serif", marginBottom: 16 }}>vs</div>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 52, fontWeight: 700, color: "#ef4444", lineHeight: 1 }}>
                  {noProb}%
                </div>
                <div style={{ color: "#555", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>chance NO</div>
              </div>
            </div>
            <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", background: "#22c55e", width: `${yesProb}%`, borderRadius: 4, transition: "width 0.7s" }} />
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { label: "24h volume",   value: `$${(market.volume24h   ?? 0).toLocaleString()}` },
                { label: "Total volume", value: `$${(market.totalVolume ?? 0).toLocaleString()}` },
                { label: "Liquidity",    value: `$${(market.liquidity   ?? 0).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ color: "#555", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
                  <div style={{ color: "#F0F0F0", fontSize: 15, fontWeight: 600, fontFamily: "monospace", marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Your position */}
          {authenticated && hasPosition && (
            <div style={{ ...card, border: "1px solid rgba(255,214,10,0.25)" }}>
              <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 800, color: "#FFD60A", marginBottom: 12 }}>
                Your position
              </h3>
              <div style={{ display: "flex", gap: 24 }}>
                {yesHeld > 0.0001 && (
                  <div>
                    <div style={{ color: "#555", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>YES shares</div>
                    <div style={{ color: "#22c55e", fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>
                      {yesHeld.toFixed(4)}
                    </div>
                    <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                      ≈ ${(yesHeld * yesProb / 100).toFixed(2)} USDC
                    </div>
                  </div>
                )}
                {noHeld > 0.0001 && (
                  <div>
                    <div style={{ color: "#555", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>NO shares</div>
                    <div style={{ color: "#ef4444", fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>
                      {noHeld.toFixed(4)}
                    </div>
                    <div style={{ color: "#444", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                      ≈ ${(noHeld * noProb / 100).toFixed(2)} USDC
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution info */}
          <div style={card}>
            <p style={{ color: "#555", fontSize: 13, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              Resolved by AI oracle using verified data sources. Results are submitted on-chain to Arc Testnet.
            </p>
          </div>

          {/* Trade history */}
          <div style={{ ...card, marginBottom: 0 }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              Recent trades
            </h3>
            {trades.length === 0 ? (
              <p style={{ color: "#444", fontSize: 13, fontFamily: "Space Grotesk, sans-serif", textAlign: "center", padding: "20px 0" }}>
                No trades yet — be the first!
              </p>
            ) : (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 60px 80px 90px",
                  gap: 12, paddingBottom: 8, borderBottom: "1px solid #232323", marginBottom: 8,
                }}>
                  {["Trader", "Side", "Amount", "Time"].map(h => (
                    <span key={h} style={{ fontSize: 10, color: "#444", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {trades.map((trade: any) => (
                  <div key={trade.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 80px 90px",
                    gap: 12, padding: "8px 0", borderBottom: "1px solid #1a1a1a", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>
                      {trade.userAddress.slice(0,6)}...{trade.userAddress.slice(-4)}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: trade.isYes ? "#22c55e" : "#ef4444",
                      background: trade.isYes ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      padding: "2px 8px", borderRadius: 20, textAlign: "center",
                    }}>
                      {trade.isYes ? "YES" : "NO"}
                    </span>
                    <span style={{ fontSize: 12, color: "#F0F0F0", fontFamily: "monospace" }}>
                      ${trade.usdcAmount.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 11, color: "#444", fontFamily: "Space Grotesk, sans-serif" }}>
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ position: "sticky", top: 24 }}>
          {deployed ? (
            <div style={{ ...card, marginBottom: 0, padding: 20 }}>

              {/* Buy / Sell tab toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 20, background: "#1A1A1A", borderRadius: 10, padding: 4 }}>
                {(["buy", "sell"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); resetBuy(); resetSell(); }}
                    style={{
                      padding: "9px 0", borderRadius: 8,
                      fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      border: "none", transition: "all 0.15s",
                      background: tab === t ? (t === "buy" ? "#FFD60A" : "#ef4444") : "transparent",
                      color: tab === t ? (t === "buy" ? "#000" : "#fff") : "#555",
                    }}
                  >
                    {t === "buy" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>

              {/* YES/NO selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {(["YES", "NO"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { if (!isBuying && !isSelling) setSide(s); }}
                    style={{
                      padding: "12px 0", borderRadius: 10,
                      fontWeight: 700, fontSize: 14,
                      cursor: (isBuying || isSelling) ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif", border: "none",
                      transition: "all 0.15s",
                      background: side === s
                        ? s === "YES" ? "#22c55e" : "#ef4444"
                        : "#1A1A1A",
                      color: side === s ? (s === "YES" ? "#000" : "#fff") : "#555",
                    }}
                  >
                    {s} · {s === "YES" ? yesProb : noProb}¢
                  </button>
                ))}
              </div>

              {/* ── BUY tab ── */}
              {tab === "buy" && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                      Amount (USDC)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number" placeholder="0.00" value={amount}
                        onChange={e => setAmount(e.target.value)}
                        disabled={isBuying}
                        style={{
                          width: "100%", background: "#1A1A1A",
                          border: "1px solid #232323", borderRadius: 10,
                          padding: "12px 50px 12px 14px",
                          color: "#fff", fontSize: 16, fontFamily: "monospace",
                          outline: "none", boxSizing: "border-box",
                          opacity: isBuying ? 0.5 : 1,
                        }}
                      />
                      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 12 }}>
                        USDC
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {[10, 25, 50, 100].map(n => (
                        <button key={n} onClick={() => { if (!isBuying) setAmount(String(n)); }}
                          style={{ flex: 1, background: "#1A1A1A", border: "1px solid #232323", borderRadius: 8, color: "#555", fontSize: 11, padding: "5px 0", cursor: isBuying ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
                          onMouseEnter={e => { if (!isBuying) e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#555"; }}
                        >
                          ${n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {amount && Number(amount) > 0 && (
                    <div style={{ background: "#1A1A1A", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                      {[
                        { label: "Shares",           value: shares },
                        { label: "Price per share",  value: `${(price * 100).toFixed(0)}¢` },
                        { label: "Max payout",       value: `$${payout}` },
                        { label: "Potential profit", value: `+$${profit}`, color: "#22c55e" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ color: "#555", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                          <span style={{ color: color ?? "#F0F0F0", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={buyStep === "error" ? handleBuy : (!isBuying ? handleBuy : undefined)}
                    disabled={isBuying}
                    style={{
                      width: "100%", padding: "14px 0",
                      background: buyStep === "success" ? "#22c55e" : buyStep === "error" ? "#ef4444" : side === "YES" ? "#22c55e" : "#ef4444",
                      color: (buyStep === "success" || side === "YES") ? "#000" : "#fff",
                      fontWeight: 700, fontSize: 14, borderRadius: 12, border: "none",
                      cursor: isBuying ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif", opacity: isBuying ? 0.8 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {authenticated ? STEP_LABELS[buyStep] ?? `Buy ${side} shares` : "Connect wallet to trade"}
                  </button>

                  {buyStep === "error" && buyErr && (
                    <p style={{ textAlign: "center", marginTop: 8, color: "#ef4444", fontSize: 11, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                      {buyErr}
                    </p>
                  )}
                  {buyStep === "success" && buyTxHash && (
                    <a href={txExplorerUrl(buyTxHash)} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", textAlign: "center", marginTop: 10, color: "#FFD60A", fontSize: 12, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                      View on Arc Explorer →
                    </a>
                  )}
                </>
              )}

              {/* ── SELL tab ── */}
              {tab === "sell" && (
                <>
                  {/* Show current holdings */}
                  {hasPosition ? (
                    <div style={{ background: "#1A1A1A", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "#555", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
                        Your holdings
                      </div>
                      <div style={{ display: "flex", gap: 20 }}>
                        {yesHeld > 0.0001 && (
                          <div style={{ cursor: "pointer" }} onClick={() => { setSide("YES"); setSellShares_(yesHeld.toFixed(4)); }}>
                            <div style={{ color: "#22c55e", fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{yesHeld.toFixed(4)}</div>
                            <div style={{ color: "#555", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>YES shares (tap to fill)</div>
                          </div>
                        )}
                        {noHeld > 0.0001 && (
                          <div style={{ cursor: "pointer" }} onClick={() => { setSide("NO"); setSellShares_(noHeld.toFixed(4)); }}>
                            <div style={{ color: "#ef4444", fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{noHeld.toFixed(4)}</div>
                            <div style={{ color: "#555", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>NO shares (tap to fill)</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "#1A1A1A", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center" }}>
                      <p style={{ color: "#555", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                        You have no shares in this market to sell.
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, color: "#555", display: "block", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                      Shares to sell ({side})
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number" placeholder="0.0000"
                        value={sellShares_}
                        onChange={e => setSellShares_(e.target.value)}
                        disabled={isSelling}
                        style={{
                          width: "100%", background: "#1A1A1A",
                          border: "1px solid #232323", borderRadius: 10,
                          padding: "12px 70px 12px 14px",
                          color: "#fff", fontSize: 16, fontFamily: "monospace",
                          outline: "none", boxSizing: "border-box",
                          opacity: isSelling ? 0.5 : 1,
                        }}
                      />
                      <button
                        onClick={() => setSellShares_(side === "YES" ? yesHeld.toFixed(4) : noHeld.toFixed(4))}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#232323", border: "none", borderRadius: 6, color: "#aaa", fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {sellShares_ && Number(sellShares_) > 0 && (
                    <div style={{ background: "#1A1A1A", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                      {[
                        { label: "Shares selling",   value: `${sellShares_} ${side}` },
                        { label: "Est. USDC back",   value: `~$${sellEstimate}`, color: "#FFD60A" },
                        { label: "Current price",    value: `${(sellPrice * 100).toFixed(0)}¢` },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ color: "#555", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                          <span style={{ color: color ?? "#F0F0F0", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={sellStep === "error" ? handleSell : (!isSelling ? handleSell : undefined)}
                    disabled={isSelling || !hasPosition}
                    style={{
                      width: "100%", padding: "14px 0",
                      background: sellStep === "success" ? "#22c55e" : sellStep === "error" ? "#ef4444" : "#ef4444",
                      color: sellStep === "success" ? "#000" : "#fff",
                      fontWeight: 700, fontSize: 14, borderRadius: 12, border: "none",
                      cursor: (isSelling || !hasPosition) ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: (isSelling || !hasPosition) ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {authenticated
                      ? SELL_STEP_LABELS[sellStep] ?? `Sell ${side} shares`
                      : "Connect wallet to trade"
                    }
                  </button>

                  {sellStep === "error" && sellErr && (
                    <p style={{ textAlign: "center", marginTop: 8, color: "#ef4444", fontSize: 11, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                      {sellErr}
                    </p>
                  )}
                  {sellStep === "success" && sellTxHash && (
                    <a href={txExplorerUrl(sellTxHash)} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", textAlign: "center", marginTop: 10, color: "#FFD60A", fontSize: 12, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                      View on Arc Explorer →
                    </a>
                  )}
                </>
              )}

              <p style={{ textAlign: "center", color: "#444", fontSize: 11, marginTop: 14, fontFamily: "'DM Sans', sans-serif" }}>
                2% protocol fee · Powered by Arc Testnet
              </p>
            </div>
          ) : (
            <div style={{
              background: "#141414", border: "1px solid rgba(255,214,10,0.2)",
              borderRadius: 14, padding: 28, textAlign: "center",
            }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🚀</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 700, color: "#FFD60A", marginBottom: 10 }}>
                Coming soon
              </h3>
              <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: 20 }}>
                This market is AI-generated and will be deployed on Arc Testnet soon.
                Once deployed, you can place real USDC bets.
              </p>
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", background: "#FFD60A", color: "#000", fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 10, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
                Get testnet USDC ready →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 60, color: "#555", fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
        Loading...
      </div>
    }>
      <MarketDetailInner />
    </Suspense>
  );
}
