"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { formatDistanceToNow } from "date-fns";
import type { Market } from "@predictx/shared";

interface Props { market: Market }

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    crypto:        "rgba(251,191,36,0.15)",
    sports:        "rgba(59,130,246,0.15)",
    politics:      "rgba(239,68,68,0.15)",
    tech:          "rgba(168,85,247,0.15)",
    entertainment: "rgba(236,72,153,0.15)",
    macroeconomics:"rgba(16,185,129,0.15)",
    other:         "rgba(107,114,128,0.15)",
  };
  return map[category.toLowerCase()] ?? map.other;
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    crypto:        "#fbbf24",
    sports:        "#60a5fa",
    politics:      "#f87171",
    tech:          "#c084fc",
    entertainment: "#f472b6",
    macroeconomics:"#34d399",
    other:         "#9ca3af",
  };
  return map[category.toLowerCase()] ?? map.other;
}

export function MarketCard({ market }: Props) {
  const { authenticated, login } = usePrivy();
  const [expiresIn, setExpiresIn] = useState("");

  // Client-only — prevents SSR/hydration mismatch
  useEffect(() => {
    setExpiresIn(formatDistanceToNow(new Date(market.resolvesAt), { addSuffix: true }));
  }, [market.resolvesAt]);

  const handleBet = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.preventDefault();
    e.stopPropagation();
    if (!authenticated) {
      login();
      return;
    }
    window.location.href = `/markets/${market.id}?side=${side}`;
  };

  return (
    <Link href={`/markets/${market.id}`} style={{ textDecoration: "none", display: "block" }}>
      <article
        style={{
          background:    "#141414",
          border:        "1px solid #232323",
          borderRadius:  14,
          padding:       18,
          cursor:        "pointer",
          transition:    "border-color 0.2s, box-shadow 0.2s",
          display:       "block",
          height:        "100%",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,214,10,0.3)";
          (e.currentTarget as HTMLElement).style.boxShadow  = "0 0 20px rgba(255,214,10,0.05)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "#232323";
          (e.currentTarget as HTMLElement).style.boxShadow  = "none";
        }}
      >
        {/* Category + expiry row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: 20,
            background: getCategoryBg(market.category),
            color: getCategoryColor(market.category),
            textTransform: "uppercase", letterSpacing: "0.3px",
          }}>
            {market.category}
          </span>
          <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
            {expiresIn || "—"}
          </span>
        </div>

        {/* Question */}
        <h3 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 15, fontWeight: 700,
          color: "#F0F0F0", lineHeight: 1.4,
          marginBottom: 16,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {market.question}
        </h3>

        {/* Probability bar */}
        <div style={{ height: 4, background: "#222", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", background: "#22c55e", width: `${market.yesProbability}%`, borderRadius: 2, transition: "width 0.5s" }} />
        </div>

        {/* Probability labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{market.yesProbability}% YES</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{100 - market.yesProbability}% NO</span>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: 12 }}>
          <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
            ${(market.totalVolume ?? 0).toLocaleString()} vol
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={(e) => handleBet(e, "YES")}
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#22c55e", fontSize: 11, fontWeight: 700,
                padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#22c55e";
                e.currentTarget.style.color      = "#000";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(34,197,94,0.1)";
                e.currentTarget.style.color      = "#22c55e";
              }}
            >
              YES {market.yesProbability}¢
            </button>
            <button
              onClick={(e) => handleBet(e, "NO")}
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444", fontSize: 11, fontWeight: 700,
                padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.color      = "#fff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                e.currentTarget.style.color      = "#ef4444";
              }}
            >
              NO {100 - market.yesProbability}¢
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
