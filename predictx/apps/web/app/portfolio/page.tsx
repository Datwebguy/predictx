"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function PortfolioPage() {
  const { authenticated, login, user } = usePrivy();
  const [positions, setPositions] = useState<any[]>([]);
  const [trades,    setTrades]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<"positions" | "trades">("positions");

  const address = user?.wallet?.address;

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    Promise.all([
      fetch(`${API}/api/users/${address}/positions`).then(r => r.json()),
      fetch(`${API}/api/users/${address}/history`).then(r => r.json()),
    ])
      .then(([posData, tradeData]) => {
        setPositions(posData.data ?? []);
        setTrades(tradeData.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [address]);

  if (!authenticated) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:20 }}>🔒</div>
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:32, fontWeight:800, color:"#fff", marginBottom:10 }}>Connect your wallet</h1>
        <p style={{ color:"#666", fontSize:15, marginBottom:28, fontFamily:"Space Grotesk,sans-serif" }}>
          Sign in to view your positions and trading history
        </p>
        <button onClick={() => login()} style={{ background:"#FFD60A", color:"#000", fontWeight:700, fontSize:15, padding:"12px 32px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
          Connect wallet
        </button>
      </div>
    );
  }

  const totalInvested = trades.reduce((s, t) => s + (t.usdcAmount ?? 0), 0);

  return (
    <div style={{ padding:"0 0 40px" }}>
      <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:36, fontWeight:800, color:"#fff", marginBottom:6 }}>Portfolio</h1>
      <p style={{ color:"#666", fontFamily:"Space Grotesk,sans-serif", marginBottom:28, fontSize:14 }}>
        {address ? `${address.slice(0,6)}...${address.slice(-4)}` : ""}
      </p>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:28 }}>
        {[
          { label:"Positions",     value: String(positions.length),          color:"#fff" },
          { label:"Total traded",  value:`$${totalInvested.toFixed(2)}`,     color:"#fff" },
          { label:"Win rate",      value:"—",                                 color:"#fff" },
          { label:"Trades",        value: String(trades.length),             color:"#fff" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:"#141414", border:"1px solid #232323", borderRadius:12, padding:16 }}>
            <div style={{ fontFamily:"Syne,sans-serif", fontSize:22, fontWeight:800, color, marginBottom:4 }}>{value}</div>
            <div style={{ fontSize:12, color:"#666", fontFamily:"Space Grotesk,sans-serif" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {(["positions","trades"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"8px 20px", borderRadius:10, fontWeight:600,
            fontSize:13, cursor:"pointer", border:"none",
            fontFamily:"Space Grotesk,sans-serif",
            background: tab===t ? "#FFD60A" : "#141414",
            color: tab===t ? "#000" : "#666",
            outline: tab!==t ? "1px solid #232323" : "none",
            textTransform:"capitalize",
            transition:"all 0.15s",
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color:"#666", fontFamily:"Space Grotesk,sans-serif", padding:40, textAlign:"center" }}>Loading...</div>
      ) : tab === "positions" ? (
        positions.length === 0 ? (
          <div style={{ background:"#141414", border:"1px solid #232323", borderRadius:14, padding:60, textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:22, fontWeight:800, color:"#fff", marginBottom:10 }}>
              No open positions yet
            </h2>
            <p style={{ color:"#666", fontSize:14, marginBottom:24, fontFamily:"Space Grotesk,sans-serif" }}>
              Make your first prediction to get started
            </p>
            <Link href="/" style={{ background:"#FFD60A", color:"#000", fontWeight:700, fontSize:14, padding:"11px 24px", borderRadius:10, textDecoration:"none", fontFamily:"Space Grotesk,sans-serif", display:"inline-block" }}>
              Browse markets
            </Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {positions.map((pos: any) => {
              const yesShares = Number(pos.yesShares) / 1e6;
              const noShares  = Number(pos.noShares)  / 1e6;
              const isYes     = yesShares > 0;
              const sharesHeld = isYes ? yesShares : noShares;
              const price     = isYes
                ? (pos.market?.yesProbability ?? 50) / 100
                : (100 - (pos.market?.yesProbability ?? 50)) / 100;
              const currentValue = sharesHeld * price;
              const invested = isYes
                ? sharesHeld * (pos.avgYesPrice ?? price)
                : sharesHeld * (pos.avgNoPrice  ?? price);
              const pnl = currentValue - invested;

              return (
                <Link key={pos.id} href={`/markets/${pos.marketId}`} style={{ textDecoration:"none" }}>
                  <div style={{ background:"#141414", border:"1px solid #232323", borderRadius:14, padding:20, cursor:"pointer", transition:"border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,214,10,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#232323")}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                          background: isYes?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
                          color: isYes?"#22c55e":"#ef4444", display:"inline-block", marginBottom:8,
                        }}>
                          {isYes ? "YES" : "NO"}
                        </span>
                        <p style={{ color:"#F0F0F0", fontSize:14, fontWeight:600, fontFamily:"Space Grotesk,sans-serif", margin:0 }}>
                          {pos.market?.question ?? "Market"}
                        </p>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:"monospace", fontSize:15, fontWeight:700, color:"#F0F0F0" }}>
                          {sharesHeld.toFixed(2)} shares
                        </div>
                        <div style={{ fontSize:12, color: pnl >= 0 ? "#22c55e" : "#ef4444", fontFamily:"monospace", marginTop:2 }}>
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} P&amp;L
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:20, marginTop:12, paddingTop:12, borderTop:"1px solid #1a1a1a" }}>
                      <span style={{ fontSize:12, color:"#555", fontFamily:"Space Grotesk,sans-serif" }}>
                        Current value: <span style={{ color:"#F0F0F0" }}>${currentValue.toFixed(2)}</span>
                      </span>
                      <span style={{ fontSize:12, color:"#555", fontFamily:"Space Grotesk,sans-serif" }}>
                        Price: <span style={{ color:"#F0F0F0" }}>{(price * 100).toFixed(0)}¢</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        /* Trades tab */
        trades.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"#444", fontFamily:"Space Grotesk,sans-serif" }}>
            No trades yet
          </div>
        ) : (
          <div style={{ background:"#141414", border:"1px solid #232323", borderRadius:14, overflow:"hidden" }}>
            {trades.map((t: any) => (
              <div key={t.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #232323" }}>
                <div style={{ flex:1 }}>
                  <span style={{
                    fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                    background: t.isYes?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",
                    color: t.isYes?"#22c55e":"#ef4444", display:"inline-block", marginBottom:4,
                  }}>{t.isYes ? "YES" : "NO"}</span>
                  <p style={{ color:"#F0F0F0", fontSize:13, fontFamily:"Space Grotesk,sans-serif", margin:0 }}>
                    {(t.market?.question ?? "Market").slice(0, 65)}…
                  </p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
                  <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, color:"#F0F0F0" }}>
                    ${(t.usdcAmount ?? 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize:11, color:"#444", fontFamily:"Space Grotesk,sans-serif" }}>
                    {new Date(t.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
