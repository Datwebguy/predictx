const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  markets: {
    list:      (params?: string) => apiFetch<any>(`/api/markets${params ? "?" + params : ""}`),
    get:       (id: string)      => apiFetch<any>(`/api/markets/${id}`),
    validate:  (question: string) => apiFetch<any>("/api/markets/validate", {
      method: "POST", body: JSON.stringify({ question }),
    }),
    suggest:   (count = 5)      => apiFetch<any>(`/api/markets/ai-suggest?count=${count}`),
    trades:    (id: string)      => apiFetch<any>(`/api/markets/${id}/trades`),
    position:  (id: string, address: string) => apiFetch<any>(`/api/markets/${id}/positions/${address}`),
  },
  users: {
    get:         (address: string) => apiFetch<any>(`/api/users/${address}`),
    positions:   (address: string) => apiFetch<any>(`/api/users/${address}/positions`),
    history:     (address: string) => apiFetch<any>(`/api/users/${address}/history`),
    leaderboard: (limit = 50)     => apiFetch<any>(`/api/users/leaderboard?limit=${limit}`),
  },
  resolution: {
    resolve: (data: any) => apiFetch<any>("/api/resolution/resolve", {
      method: "POST", body: JSON.stringify(data),
    }),
    pending: () => apiFetch<any>("/api/resolution/pending"),
  },
};
