// ─── Market Types ─────────────────────────────────────────────────────────────
export type MarketCategory = "crypto" | "sports" | "politics" | "tech" | "entertainment" | "other";
export type MarketOutcome = "OPEN" | "YES" | "NO" | "INVALID";
export type MarketStatus  = "active" | "expired" | "resolved";

export interface Market {
  id:            string;       // DB UUID
  address:       string;       // on-chain contract address
  question:      string;
  description:   string;
  category:      MarketCategory;
  creatorAddress: string;
  resolvesAt:    string;       // ISO datetime
  createdAt:     string;
  outcome:       MarketOutcome;
  status:        MarketStatus;
  // AMM state (fetched from chain)
  yesProbability: number;      // 0-100
  yesPrice:       number;      // USDC cents per share
  noPrice:        number;
  volume24h:      number;      // USDC
  totalVolume:    number;
  liquidity:      number;
  // Social
  commentCount:  number;
}

export interface Position {
  marketId:   string;
  userAddress: string;
  yesShares:  string;   // BigInt as string
  noShares:   string;
  avgYesPrice: number;
  avgNoPrice:  number;
}

export interface Trade {
  id:          string;
  marketId:    string;
  userAddress: string;
  isYes:       boolean;
  usdcAmount:  number;
  shares:      number;
  price:       number;
  txHash:      string;
  timestamp:   string;
}

// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
  id:            string;
  address:       string;       // smart account address
  username:      string | null;
  avatarUrl:     string | null;
  usdcBalance:   number;
  totalPnl:      number;
  rank:          number | null;
  createdAt:     string;
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data:    T;
  success: boolean;
  error?:  string;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  hasMore:    boolean;
}

// ─── AI Market Creation ───────────────────────────────────────────────────────
export interface MarketCreateRequest {
  question:    string;
  description: string;
  category:    MarketCategory;
  resolvesAt:  string;
  initLiquidity: number;       // USDC amount
}

export interface AiMarketSuggestion {
  question:    string;
  description: string;
  category:    MarketCategory;
  suggestedResolvesAt: string;
  rationale:   string;
}
