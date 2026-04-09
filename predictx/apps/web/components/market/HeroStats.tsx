"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Stats {
  totalMarkets:   number;
  activeMarkets:  number;
  totalVolume:    number;
  totalLiquidity: number;
}

export function HeroStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`${API}/api/markets/stats`)
      .then(r => r.json())
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  const items = [
    {
      label: "Active markets",
      value: stats ? String(stats.activeMarkets) : "—",
      sub:   stats ? `${stats.totalMarkets} total` : "loading…",
    },
    {
      label: "Total volume",
      value: "$0",
      sub:   "Be the first to trade",
    },
    {
      label: "Traders",
      value: "0",
      sub:   "Be the first to trade",
    },
    {
      label: "Paid out",
      value: "$0",
      sub:   "Be the first to trade",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, sub }) => (
        <div key={label} className="card p-4">
          <div className="text-2xl font-display text-white mb-0.5">{value}</div>
          <div className="text-sm text-gray-400 font-medium">{label}</div>
          <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
        </div>
      ))}
    </div>
  );
}
