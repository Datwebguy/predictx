"use client";
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useWalletAddress } from "@/hooks/useWalletAddress";

export function DebugPanel() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { address, balance, provider, walletType } = useWalletAddress();
  const [open, setOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking...");
  const [marketCount, setMarketCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [chainId, setChainId] = useState<string>("unknown");

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d.status === "ok" ? "✅ Online" : "❌ Error"))
      .catch(() => setApiStatus("❌ Offline"));

    fetch(`${API}/api/markets?pageSize=200`)
      .then(r => r.json())
      .then(d => {
        const list = d.data ?? [];
        setMarketCount(d.total ?? list.length);
        setLiveCount(list.filter((m: any) =>
          m.address?.startsWith("0x") &&
          !m.address?.startsWith("0x000") &&
          !m.address?.startsWith("ai-")
        ).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as any;
    if (win.ethereum) {
      win.ethereum.request({ method: "eth_chainId" })
        .then((id: string) => {
          const dec = parseInt(id, 16);
          setChainId(dec === 5042002
            ? "✅ Arc Testnet (5042002)"
            : `❌ Wrong chain: ${id} (${dec})`);
        })
        .catch(() => setChainId("Error reading chain"));
    } else {
      setChainId("No window.ethereum");
    }
  }, [address]);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, fontFamily: "monospace" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "#FFD60A", color: "#000", border: "none",
          borderRadius: 8, padding: "6px 12px", fontSize: 11,
          fontWeight: 700, cursor: "pointer",
          display: "block", marginLeft: "auto", marginBottom: 6,
        }}
      >
        {open ? "Close Debug" : "🔍 Debug"}
      </button>

      {open && (
        <div style={{
          background: "#0C0C0C", border: "1px solid #FFD60A",
          borderRadius: 12, padding: 16, width: 320,
          maxHeight: 520, overflowY: "auto",
          fontSize: 11, lineHeight: 1.6,
        }}>
          <div style={{ color: "#FFD60A", fontWeight: 700, marginBottom: 10, fontSize: 12 }}>
            PredictX Debug Panel
          </div>

          {/* API */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>API</div>
            <div style={{ color: "#fff" }}>Status: {apiStatus}</div>
            <div style={{ color: "#555" }}>URL: {API}</div>
          </div>

          {/* Markets */}
          <div style={{ marginBottom: 10, borderTop: "1px solid #232323", paddingTop: 10 }}>
            <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>Markets</div>
            <div style={{ color: "#fff" }}>Total in DB: {marketCount}</div>
            <div style={{ color: liveCount > 0 ? "#22c55e" : "#ef4444" }}>Live on-chain: {liveCount}</div>
            <div style={{ color: "#666" }}>Pending deploy: {marketCount - liveCount}</div>
          </div>

          {/* Wallet */}
          <div style={{ marginBottom: 10, borderTop: "1px solid #232323", paddingTop: 10 }}>
            <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>Wallet State</div>
            <div style={{ color: authenticated ? "#22c55e" : "#ef4444" }}>
              Auth: {authenticated ? "✅ Connected" : "❌ Not connected"}
            </div>
            <div style={{ color: "#fff", wordBreak: "break-all" }}>
              Address: {address ? `${address.slice(0,10)}...${address.slice(-4)}` : "none"}
            </div>
            <div style={{ color: "#FFD60A" }}>Balance: {balance} USDC</div>
            <div style={{ color: walletType.includes("Embedded") ? "#FFD60A" : "#22c55e" }}>
              Type: {walletType}
            </div>
            <div style={{ color: provider ? "#22c55e" : "#ef4444" }}>
              Provider: {provider ? "✅ Found" : "❌ None"}
            </div>
            <div style={{ color: chainId.includes("✅") ? "#22c55e" : "#ef4444" }}>
              Chain: {chainId}
            </div>
          </div>

          {/* Privy wallets */}
          <div style={{ marginBottom: 10, borderTop: "1px solid #232323", paddingTop: 10 }}>
            <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Privy Wallets ({wallets?.length ?? 0})
            </div>
            {wallets?.map((w, i) => (
              <div key={i} style={{ color: w.address === address ? "#FFD60A" : "#888", marginBottom: 2 }}>
                {w.address === address ? "→ " : "  "}
                {w.address.slice(0,10)}... ({w.walletClientType})
              </div>
            ))}
            {(!wallets || wallets.length === 0) && (
              <div style={{ color: "#444" }}>No wallets</div>
            )}
          </div>

          {/* User */}
          <div style={{ marginBottom: 10, borderTop: "1px solid #232323", paddingTop: 10 }}>
            <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>User</div>
            <div style={{ color: "#fff" }}>
              Login: {(user as any)?.google?.email ?? user?.email?.address ?? user?.wallet?.address?.slice(0,14) ?? "unknown"}
            </div>
            <div style={{ color: "#fff" }}>
              Wallet type: {user?.wallet?.walletClientType ?? "none"}
            </div>
            <div style={{ color: "#fff" }}>
              Wallet addr: {user?.wallet?.address?.slice(0,10) ?? "none"}...
            </div>
          </div>

          {/* Actions */}
          <div style={{ borderTop: "1px solid #232323", paddingTop: 10 }}>
            <button
              onClick={() => {
                fetch(`${API}/api/markets/generate`, { method: "POST" })
                  .then(() => alert("Generation triggered!"))
                  .catch(() => alert("Failed"));
              }}
              style={{
                background: "#1A1A1A", border: "1px solid #232323",
                color: "#FFD60A", fontSize: 10, padding: "4px 10px",
                borderRadius: 6, cursor: "pointer", marginRight: 6,
              }}
            >
              Generate markets
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#1A1A1A", border: "1px solid #232323",
                color: "#666", fontSize: 10, padding: "4px 10px",
                borderRadius: 6, cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
