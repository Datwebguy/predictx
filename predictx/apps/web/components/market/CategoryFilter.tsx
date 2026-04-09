"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

const CATEGORIES = [
  { id: "all",           label: "All",           emoji: "🌐" },
  { id: "crypto",        label: "Crypto",         emoji: "₿"  },
  { id: "sports",        label: "Sports",         emoji: "⚽" },
  { id: "politics",      label: "Politics",       emoji: "🏛" },
  { id: "tech",          label: "Tech",           emoji: "💻" },
  { id: "entertainment", label: "Entertainment",  emoji: "🎬" },
];

export function CategoryFilter() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const active      = searchParams.get("category") ?? "all";

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("category");
    else params.set("category", id);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {CATEGORIES.map(({ id, label, emoji }) => (
        <button
          key={id}
          onClick={() => select(id)}
          className={clsx(
            "flex-none flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
            "border transition-all duration-150",
            active === id
              ? "bg-brand-500/10 text-brand-500 border-brand-500/30"
              : "bg-surface-1 text-gray-400 border-surface-3 hover:text-white hover:border-surface-4"
          )}
        >
          <span>{emoji}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
