"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Trophy,
  PlusCircle,
  ArrowDownCircle,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/",            icon: LayoutDashboard, label: "Markets"     },
  { href: "/portfolio",   icon: Wallet,           label: "Portfolio"   },
  { href: "/leaderboard", icon: Trophy,           label: "Leaderboard" },
  { href: "/create",      icon: PlusCircle,       label: "Create"      },
  { href: "/deposit",     icon: ArrowDownCircle,  label: "Deposit"     },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "100%",
        height: "100vh",
        background: "#0C0C0C",
        borderRight: "1px solid #232323",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "20px",
          borderBottom: "1px solid #232323",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: "#FFD60A",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Zap style={{ width: 16, height: 16, color: "#000" }} />
        </div>
        <span
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.5px",
          }}
        >
          Predict<span style={{ color: "#FFD60A" }}>X</span>
        </span>
      </div>

      {/* Navigation links */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 10,
                marginBottom: 4,
                textDecoration: "none",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#FFD60A" : "#666",
                background: isActive
                  ? "rgba(255,214,10,0.08)"
                  : "transparent",
                borderLeft: isActive
                  ? "3px solid #FFD60A"
                  : "3px solid transparent",
                transition: "all 0.15s",
                boxSizing: "border-box",
              }}
            >
              <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Network badge at bottom */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid #232323",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "#666",
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          Arc Testnet · USDC
        </span>
      </div>
    </aside>
  );
}
