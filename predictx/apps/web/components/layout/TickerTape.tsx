"use client";
import { useEffect, useState } from "react";
import type { Market } from "@predictx/shared";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface TickerItem {
  id: string;
  question: string;
  yesProbability: number;
}

// Fallback items shown before API loads or if no markets exist
const FALLBACK: TickerItem[] = [
  { id: "f1", question: "PredictX — AI-Powered Prediction Markets", yesProbability: 50 },
  { id: "f2", question: "Running on Circle Arc Testnet", yesProbability: 100 },
  { id: "f3", question: "Trade YES / NO shares with USDC", yesProbability: 50 },
];

function TickerItem({ item }: { item: TickerItem }) {
  const up = item.yesProbability >= 50;
  return (
    <span className="inline-flex items-center gap-3 px-8 text-sm">
      <span className="text-gray-400 truncate max-w-xs">{item.question}</span>
      <span className={up ? "text-yes font-semibold" : "text-no font-semibold"}>
        {item.yesProbability}%
      </span>
      <span className="text-surface-4">·</span>
    </span>
  );
}

export function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);

  useEffect(() => {
    fetch(`${API}/api/markets?pageSize=16&status=active`)
      .then(r => r.json())
      .then(({ data }: { data: Market[] }) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data.map(m => ({ id: m.id, question: m.question, yesProbability: m.yesProbability })));
        }
      })
      .catch(() => {});
  }, []);

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap py-2.5">
      <div className="ticker-inner">
        {doubled.map((item, i) => (
          <TickerItem key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
