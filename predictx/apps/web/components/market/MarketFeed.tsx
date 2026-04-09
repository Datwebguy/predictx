"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MarketCard } from "./MarketCard";
import type { Market } from "@predictx/shared";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function MarketFeed() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "all";

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "24" });
    if (category !== "all") params.set("category", category);

    fetch(`${API}/api/markets?${params}`)
      .then(r => r.json())
      .then(({ data, total: t }) => {
        setMarkets(Array.isArray(data) ? data : []);
        setTotal(t ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  );

  if (markets.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📭</div>
      <p className="text-gray-400">No markets yet — the AI scheduler runs every 6 hours.</p>
    </div>
  );

  return (
    <div>
      {total > 0 && (
        <p className="text-xs text-gray-600 mb-4">{total} market{total !== 1 ? "s" : ""}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  );
}
