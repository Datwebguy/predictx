"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/users/leaderboard?limit=50`)
      .then(r => r.json())
      .then(d => { setTraders(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 860, padding: "0 0 40px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:32 }}>
        <span style={{ fontSize:36 }}>🏆</span>
        <div>
          <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:36, fontWeight:800, color:"#fff", margin:0 }}>
            Leaderboard
          </h1>
          <p style={{ color:"#666", fontSize:13, margin:0, fontFamily:"Space Grotesk,sans-serif" }}>
            Top traders by total profit · All time
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ color:"#666", textAlign:"center", padding:40, fontFamily:"Space Grotesk,sans-serif" }}>Loading...</div>
      ) : traders.length === 0 ? (
        <div style={{ background:"#141414", border:"1px solid #232323", borderRadius:14, padding:60, textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🏆</div>
          <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:24, fontWeight:800, color:"#FFD60A", marginBottom:10 }}>
            No traders yet
          </h2>
          <p style={{ color:"#666", fontSize:14, marginBottom:24, fontFamily:"Space Grotesk,sans-serif" }}>
            Be the first to make a prediction and claim the #1 spot
          </p>
          <Link href="/" style={{ background:"#FFD60A", color:"#000", fontWeight:700, fontSize:14, padding:"11px 24px", borderRadius:10, textDecoration:"none", fontFamily:"Space Grotesk,sans-serif", display:"inline-block" }}>
            Browse markets
          </Link>
        </div>
      ) : (
        <div style={{ background:"#141414", border:"1px solid #232323", borderRadius:14, overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"48px 1fr 100px 80px 100px", gap:12, padding:"10px 20px", borderBottom:"1px solid #232323" }}>
            {["Rank","Trader","P&L","Trades","Volume"].map(h => (
              <span key={h} style={{ fontSize:10, color:"#444", fontFamily:"Space Grotesk,sans-serif", fontWeight:600, textTransform:"uppercase" }}>{h}</span>
            ))}
          </div>

          {traders.map((trader, i) => (
            <div key={trader.address} style={{
              display:"grid", gridTemplateColumns:"48px 1fr 100px 80px 100px",
              gap:12, padding:"14px 20px",
              borderBottom: i < traders.length - 1 ? "1px solid #232323" : "none",
              background: i === 0 ? "rgba(255,214,10,0.04)" : "transparent",
              alignItems:"center",
            }}>
              {/* Rank */}
              <span style={{
                fontFamily:"Syne,sans-serif", fontSize:15, fontWeight:800,
                color: i===0?"#FFD60A" : i===1?"#C0C0C0" : i===2?"#CD7F32" : "#444",
              }}>#{i+1}</span>

              {/* Trader */}
              <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                <div style={{
                  width:32, height:32, borderRadius:"50%", background:"#232323", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700, color:"#FFD60A", fontFamily:"monospace",
                }}>
                  {(trader.username ?? trader.address).slice(0,2).toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ color:"#F0F0F0", fontSize:13, fontWeight:600, fontFamily:"Space Grotesk,sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {trader.username ?? `${trader.address.slice(0,6)}...${trader.address.slice(-4)}`}
                  </div>
                  {trader.username && (
                    <div style={{ fontSize:11, color:"#444", fontFamily:"monospace" }}>
                      {trader.address.slice(0,6)}...{trader.address.slice(-4)}
                    </div>
                  )}
                </div>
              </div>

              {/* P&L */}
              <span style={{ fontFamily:"monospace", fontSize:14, fontWeight:700, color: trader.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                {trader.totalPnl >= 0 ? "+" : ""}${(trader.totalPnl ?? 0).toFixed(2)}
              </span>

              {/* Trades */}
              <span style={{ fontFamily:"monospace", fontSize:13, color:"#666" }}>
                {trader.tradeCount ?? 0}
              </span>

              {/* Volume */}
              <span style={{ fontFamily:"monospace", fontSize:13, color:"#666" }}>
                ${(trader.totalVolume ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
