"use client";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Market } from "@predictx/shared";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function AiSuggestions() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    fetch(`${API}/api/markets?pageSize=8&status=active`)
      .then(r => r.json())
      .then(({ data }) => setMarkets(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => {});
  }, []);

  if (markets.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {markets.map((m) => (
        <Link
          key={m.id}
          href={`/markets/${m.id}`}
          className="flex-none w-64 card p-4 hover:border-brand-500/40 transition-all duration-150 group"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span className="text-xs text-brand-500 font-medium">AI generated</span>
          </div>
          <p className="text-sm text-gray-200 font-medium leading-snug mb-3 line-clamp-2
                         group-hover:text-white transition-colors">
            {m.question}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full bg-yes rounded-full" style={{ width: `${m.yesProbability}%` }} />
              </div>
              <span className="text-yes text-xs font-semibold">{m.yesProbability}%</span>
            </div>
            <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-brand-500 transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}
