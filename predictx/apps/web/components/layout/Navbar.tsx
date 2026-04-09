"use client";
import { usePrivy } from "@privy-io/react-auth";
import { Search, Copy, LogOut, Droplets, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useWalletAddress } from "@/hooks/useWalletAddress";

export function Navbar() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address: walletAddr, balance, walletType } = useWalletAddress();
  const [connecting, setConnecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const address = walletAddr;
  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const activeWalletType = walletType;
  const isEmbedded = walletType === "Embedded (Google/Email)";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleConnect = () => {
    setConnecting(true);
    login();
    setConnecting(false);
  };

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setDropdownOpen(false);
    logout();
  };

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
      background: "#0C0C0C",
      borderBottom: "1px solid #232323",
    }}>
      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, maxWidth: 420 }}>
        <div style={{ position: "relative", width: "100%" }}>
          <Search style={{
            position: "absolute", left: 12,
            top: "50%", transform: "translateY(-50%)",
            width: 15, height: 15, color: "#555",
          }} />
          <input
            type="text"
            placeholder="Search markets..."
            style={{
              width: "100%", background: "#141414",
              border: "1px solid #232323", borderRadius: 10,
              padding: "8px 12px 8px 36px",
              color: "#F0F0F0", fontSize: 13, outline: "none",
              fontFamily: "Space Grotesk, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* Faucet shortcut — always visible */}
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Get free testnet USDC"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#141414", border: "1px solid #232323",
            borderRadius: 10, padding: "7px 12px",
            color: "#666", fontSize: 12, textDecoration: "none",
            fontFamily: "Space Grotesk, sans-serif",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,214,10,0.3)";
            (e.currentTarget as HTMLElement).style.color = "#FFD60A";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = "#232323";
            (e.currentTarget as HTMLElement).style.color = "#666";
          }}
        >
          <Droplets style={{ width: 14, height: 14 }} />
          <span>Faucet</span>
        </a>

        {ready && authenticated ? (
          <>
            {/* USDC Balance */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#141414", border: "1px solid #232323",
              borderRadius: 10, padding: "7px 14px",
            }}>
              <span style={{
                fontSize: 10, color: "#555",
                fontFamily: "monospace", fontWeight: 600,
              }}>
                USDC
              </span>
              <span style={{
                fontSize: 14, color: "#F0F0F0",
                fontWeight: 700, fontFamily: "monospace",
              }}>
                {balance}
              </span>
            </div>

            {/* Wallet dropdown */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#141414",
                  border: `1px solid ${dropdownOpen ? "rgba(255,214,10,0.3)" : "#232323"}`,
                  borderRadius: 10, padding: "7px 14px",
                  color: "#F0F0F0", fontSize: 13, cursor: "pointer",
                  fontFamily: "Space Grotesk, sans-serif",
                  transition: "border-color 0.15s",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#22c55e", display: "inline-block",
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {shortAddr}
                </span>
                <ChevronDown style={{
                  width: 14, height: 14, color: "#666",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                }} />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)",
                  right: 0, width: 260,
                  background: "#141414",
                  border: "1px solid #232323",
                  borderRadius: 12, overflow: "hidden",
                  zIndex: 100,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}>
                  {/* Address section */}
                  <div style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid #232323",
                  }}>
                    <div style={{
                      fontSize: 10, color: "#555",
                      fontFamily: "Space Grotesk, sans-serif",
                      marginBottom: 6, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>
                      Connected wallet
                    </div>
                    <div style={{
                      fontSize: 12, color: "#F0F0F0",
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                      lineHeight: 1.4,
                    }}>
                      {address}
                    </div>
                  </div>

                  {/* Balance section */}
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #232323",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span style={{
                      fontSize: 12, color: "#666",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}>
                      USDC Balance
                    </span>
                    <span style={{
                      fontSize: 14, color: "#FFD60A",
                      fontWeight: 700, fontFamily: "monospace",
                    }}>
                      {balance} USDC
                    </span>
                  </div>

                  {/* Wallet type */}
                  <div style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #232323",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <span style={{ fontSize: 11, color: "#666", fontFamily: "Space Grotesk, sans-serif" }}>
                      Wallet type
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 20,
                      background: isEmbedded ? "rgba(255,214,10,0.1)" : "rgba(34,197,94,0.1)",
                      color: isEmbedded ? "#FFD60A" : "#22c55e",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}>
                      {activeWalletType}
                    </span>
                  </div>

                  {/* Export / Link wallet for embedded users */}
                  {isEmbedded && (
                    <a
                      href="/deposit"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        width: "100%", display: "flex",
                        alignItems: "center", gap: 10,
                        padding: "12px 16px",
                        borderBottom: "1px solid #232323",
                        color: "#aaa",
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 13, textDecoration: "none",
                        transition: "all 0.15s",
                        boxSizing: "border-box",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "#1A1A1A";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span style={{ fontSize: 14 }}>🔑</span>
                      Export / Link wallet
                    </a>
                  )}

                  {/* Arc Testnet badge */}
                  <div style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #232323",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#22c55e", display: "inline-block",
                    }} />
                    <span style={{
                      fontSize: 11, color: "#666",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}>
                      Arc Testnet · Chain 5042002
                    </span>
                  </div>

                  {/* Copy address */}
                  <button
                    onClick={handleCopy}
                    style={{
                      width: "100%", display: "flex",
                      alignItems: "center", gap: 10,
                      padding: "12px 16px", background: "transparent",
                      border: "none", cursor: "pointer",
                      borderBottom: "1px solid #232323",
                      color: copied ? "#22c55e" : "#aaa",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13, textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      if (!copied) (e.currentTarget as HTMLElement).style.background = "#1A1A1A";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Copy style={{ width: 14, height: 14 }} />
                    {copied ? "Copied!" : "Copy address"}
                  </button>

                  {/* View on Arc Explorer */}
                  <a
                    href={`https://testnet.arcscan.app/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      width: "100%", display: "flex",
                      alignItems: "center", gap: 10,
                      padding: "12px 16px",
                      borderBottom: "1px solid #232323",
                      color: "#aaa",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13, textDecoration: "none",
                      transition: "all 0.15s",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "#1A1A1A";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 14 }}>↗</span>
                    View on Arc Explorer
                  </a>

                  {/* Get testnet USDC */}
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      width: "100%", display: "flex",
                      alignItems: "center", gap: 10,
                      padding: "12px 16px",
                      borderBottom: "1px solid #232323",
                      color: "#aaa",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13, textDecoration: "none",
                      transition: "all 0.15s",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "#1A1A1A";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Droplets style={{ width: 14, height: 14 }} />
                    Get testnet USDC
                  </a>

                  {/* Disconnect */}
                  <button
                    onClick={handleDisconnect}
                    style={{
                      width: "100%", display: "flex",
                      alignItems: "center", gap: 10,
                      padding: "12px 16px", background: "transparent",
                      border: "none", cursor: "pointer",
                      color: "#ef4444",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13, textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <LogOut style={{ width: 14, height: 14 }} />
                    Disconnect wallet
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting || !ready}
            style={{
              background: "#FFD60A", color: "#000",
              fontWeight: 700, fontSize: 13,
              padding: "9px 20px", borderRadius: 10,
              border: "none", cursor: "pointer",
              fontFamily: "Space Grotesk, sans-serif",
              opacity: connecting ? 0.7 : 1,
              transition: "all 0.15s",
            }}
          >
            {connecting ? "Connecting..." : "Connect wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
