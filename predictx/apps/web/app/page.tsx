"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { getUSDCBalance } from "@/lib/arcWallet";

const CATEGORIES = ["all", "crypto", "sports", "politics", "tech", "entertainment"];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  crypto:        { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  sports:        { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  politics:      { bg: "rgba(239,68,68,0.15)",   text: "#f87171" },
  tech:          { bg: "rgba(168,85,247,0.15)",  text: "#c084fc" },
  entertainment: { bg: "rgba(236,72,153,0.15)",  text: "#f472b6" },
  other:         { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
};

function MarketCard({ market }: { market: any }) {
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_COLORS[market.category] ?? CATEGORY_COLORS.other;
  const yesProb = market.yesProbability ?? 50;
  const noProb = 100 - yesProb;
  const isDeployed = market.address?.startsWith("0x") &&
    !market.address?.startsWith("0x000") &&
    !market.address?.startsWith("ai-");

  const handleBet = (e: React.MouseEvent, side: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/markets/${market.id}?side=${side}`;
  };

  return (
    <Link href={`/markets/${market.id}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#141414",
          border: `1px solid ${hovered ? "rgba(255,214,10,0.35)" : "#232323"}`,
          borderRadius: 14, padding: 16, cursor: "pointer",
          transition: "border-color 0.2s",
          height: "100%", boxSizing: "border-box",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: "3px 10px", borderRadius: 20,
            background: cat.bg, color: cat.text,
            textTransform: "uppercase", letterSpacing: "0.3px",
          }}>
            {market.category}
          </span>
          {isDeployed && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: "2px 8px", borderRadius: 20,
              background: "rgba(34,197,94,0.1)", color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.2)",
            }}>
              LIVE
            </span>
          )}
        </div>

        {/* Question */}
        <h3 style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 14, fontWeight: 700,
          color: "#F0F0F0", lineHeight: 1.45,
          marginBottom: 14,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 60,
        }}>
          {market.question}
        </h3>

        {/* Probability bar */}
        <div style={{
          height: 4, background: "#222",
          borderRadius: 2, overflow: "hidden", marginBottom: 8,
        }}>
          <div style={{
            height: "100%", background: "#22c55e",
            width: `${yesProb}%`, borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>

        {/* Probability labels */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
            {yesProb}% YES
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
            {noProb}% NO
          </span>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #232323", paddingTop: 12,
        }}>
          <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>
            ${(market.totalVolume ?? 0).toLocaleString()} vol
          </span>
          {isDeployed ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={(e) => handleBet(e, "YES")}
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#22c55e", fontSize: 11, fontWeight: 700,
                  padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                YES {yesProb}¢
              </button>
              <button
                onClick={(e) => handleBet(e, "NO")}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444", fontSize: 11, fontWeight: 700,
                  padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                NO {noProb}¢
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 10, color: "#444", fontFamily: "Space Grotesk, sans-serif" }}>
              Deploying soon
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { authenticated, user } = usePrivy();
  const [markets, setMarkets] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalVolume: 0, paidOut: 0 });
  const [userBalance, setUserBalance] = useState("0");

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/markets?pageSize=50`).then(r => r.json()),
      fetch(`${API}/api/markets/stats`).then(r => r.json()),
    ]).then(([marketsData, statsData]) => {
        const list = marketsData.data ?? [];
        const sorted = [...list].sort((a: any, b: any) => {
          const aLive = a.address?.startsWith("0x") && !a.address?.startsWith("0x000") && !a.address?.startsWith("ai-");
          const bLive = b.address?.startsWith("0x") && !b.address?.startsWith("0x000") && !b.address?.startsWith("ai-");
          if (aLive && !bLive) return -1;
          if (!aLive && bLive) return 1;
          return 0;
        });
        setMarkets(sorted);
        setFiltered(sorted);
        setStats({
          total:       marketsData.total ?? list.length,
          totalVolume: statsData.data?.totalVolume ?? 0,
          paidOut:     statsData.data?.paidOut ?? 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "all") {
      setFiltered(markets);
    } else {
      setFiltered(markets.filter((m: any) => m.category === activeTab));
    }
  }, [activeTab, markets]);

  useEffect(() => {
    if (!user?.wallet?.address) return;
    getUSDCBalance(user.wallet.address).then(setUserBalance);
  }, [user?.wallet?.address]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      Promise.all([
        fetch(`${API}/api/markets?pageSize=50`).then(r => r.json()),
        fetch(`${API}/api/markets/stats`).then(r => r.json()),
      ]).then(([data, statsData]) => {
          const list = data.data ?? [];
          const sorted = [...list].sort((a: any, b: any) => {
            const aLive = a.address?.startsWith("0x") && !a.address?.startsWith("0x000") && !a.address?.startsWith("ai-");
            const bLive = b.address?.startsWith("0x") && !b.address?.startsWith("0x000") && !b.address?.startsWith("ai-");
            if (aLive && !bLive) return -1;
            if (!aLive && bLive) return 1;
            return 0;
          });
          setMarkets(sorted);
          setStats({
            total:       data.total ?? list.length,
            totalVolume: statsData.data?.totalVolume ?? 0,
            paidOut:     statsData.data?.paidOut ?? 0,
          });
        })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const liveCount = markets.filter((m: any) =>
    m.address?.startsWith("0x") &&
    !m.address?.startsWith("0x000") &&
    !m.address?.startsWith("ai-")
  ).length;

  return (
    <div style={{ padding: "24px 0" }}>

      {/* USDC balance banner */}
      {authenticated && Number(userBalance) === 0 && (
        <div style={{
          background: "rgba(255,214,10,0.07)",
          border: "1px solid rgba(255,214,10,0.25)",
          borderRadius: 12, padding: "12px 18px",
          marginBottom: 20,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ color: "#FFD60A", fontSize: 13, fontFamily: "Space Grotesk, sans-serif" }}>
            You need USDC to place predictions.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#FFD60A", color: "#000",
                fontWeight: 700, fontSize: 12,
                padding: "6px 14px", borderRadius: 8,
                textDecoration: "none", fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Get free USDC →
            </a>
            <Link
              href="/deposit"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,214,10,0.3)",
                color: "#FFD60A", fontWeight: 600, fontSize: 12,
                padding: "6px 14px", borderRadius: 8,
                textDecoration: "none", fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Deposit
            </Link>
          </div>
        </div>
      )}

      {/* Hero stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12, marginBottom: 32,
      }}>
        {[
          { label: "Total volume",   value: `$${stats.totalVolume.toLocaleString()}`, sub: stats.totalVolume > 0 ? "USDC traded on-chain" : "Be the first to trade", accent: true },
          { label: "Active markets", value: stats.total,   sub: "across 5 categories"             },
          { label: "Live on-chain",  value: liveCount,     sub: "deployed on Arc Testnet"         },
          { label: "Paid out",       value: `$${stats.paidOut.toLocaleString()}`,   sub: "in USDC winnings"                },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{
            background: "#141414",
            border: `1px solid ${accent ? "rgba(255,214,10,0.3)" : "#232323"}`,
            borderRadius: 12, padding: 16,
          }}>
            <div style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 26, fontWeight: 800,
              color: accent ? "#FFD60A" : "#fff",
              marginBottom: 4,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "#666", fontFamily: "Space Grotesk, sans-serif" }}>
              {label}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 2, fontFamily: "Space Grotesk, sans-serif" }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Trending strip — latest 6 markets */}
      {markets.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 18, fontWeight: 800,
            color: "#fff", marginBottom: 14,
          }}>
            Trending markets
          </h2>
          <div style={{
            display: "flex", gap: 12,
            overflowX: "auto", paddingBottom: 8,
          }}>
            {markets.slice(0, 6).map((m: any) => {
              const cat = CATEGORY_COLORS[m.category] ?? CATEGORY_COLORS.other;
              return (
                <Link key={m.id} href={`/markets/${m.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                  <div style={{
                    background: "#141414", border: "1px solid #232323",
                    borderRadius: 12, padding: 14, width: 220,
                    cursor: "pointer",
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 20,
                      background: cat.bg, color: cat.text,
                      textTransform: "uppercase", display: "inline-block",
                      marginBottom: 8,
                    }}>
                      {m.category}
                    </span>
                    <p style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 12, fontWeight: 600,
                      color: "#e0e0e0", lineHeight: 1.4,
                      marginBottom: 10,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {m.question}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        flex: 1, height: 3,
                        background: "#222", borderRadius: 2, overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", background: "#22c55e",
                          width: `${m.yesProbability ?? 50}%`,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e" }}>
                        {m.yesProbability ?? 50}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{
        display: "flex", gap: 8,
        overflowX: "auto", marginBottom: 20,
        paddingBottom: 4,
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              padding: "7px 16px", borderRadius: 20,
              fontSize: 12, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
              textTransform: "capitalize",
              fontFamily: "Space Grotesk, sans-serif",
              border: "none",
              background: activeTab === cat ? "#FFD60A" : "#141414",
              color: activeTab === cat ? "#000" : "#666",
              outline: activeTab !== cat ? "1px solid #232323" : "none",
              transition: "all 0.15s",
            }}
          >
            {cat === "all" ? "All markets" : cat}
          </button>
        ))}
      </div>

      {/* Market count */}
      <div style={{
        fontSize: 13, color: "#444",
        fontFamily: "Space Grotesk, sans-serif",
        marginBottom: 16,
      }}>
        {loading ? "Loading markets..." : `${filtered.length} markets`}
      </div>

      {/* Market grid */}
      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              background: "#141414", borderRadius: 14,
              height: 200,
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "#141414", borderRadius: 14,
          border: "1px solid #232323",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{
            fontFamily: "Syne, sans-serif", fontSize: 22,
            fontWeight: 800, color: "#fff", marginBottom: 10,
          }}>
            No markets yet
          </h2>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24, fontFamily: "Space Grotesk, sans-serif" }}>
            Markets are generated automatically every 6 hours
          </p>
          <Link href="/create" style={{
            background: "#FFD60A", color: "#000",
            fontWeight: 700, fontSize: 14,
            padding: "11px 24px", borderRadius: 10,
            textDecoration: "none",
            fontFamily: "Space Grotesk, sans-serif",
            display: "inline-block",
          }}>
            Create first market
          </Link>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}>
          {filtered.map((market: any) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
