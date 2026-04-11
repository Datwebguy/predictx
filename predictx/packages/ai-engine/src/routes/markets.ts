import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { suggestMarkets, validateMarketQuestion } from "../services/ai.service";

// Shape a Prisma Market row into the shared Market type the frontend expects
function toMarket(m: any) {
  return {
    id:             m.id,
    address:        m.address,
    question:       m.question,
    description:    m.description,
    category:       m.category,
    creatorAddress: m.creatorAddress,
    resolvesAt:     m.resolvesAt instanceof Date ? m.resolvesAt.toISOString() : m.resolvesAt,
    createdAt:      m.createdAt  instanceof Date ? m.createdAt.toISOString()  : m.createdAt,
    outcome:        m.outcome,
    status:         m.status,
    yesProbability: m.yesProbability,
    yesPrice:       m.yesProbability,
    noPrice:        100 - m.yesProbability,
    volume24h:      m.volume24h,
    totalVolume:    m.totalVolume,
    liquidity:      m.liquidity,
    commentCount:   0,
  };
}

export async function marketsRoute(fastify: FastifyInstance) {
  // GET /api/markets — list all markets
  fastify.get("/", async (req, reply) => {
    const { page = 1, pageSize = 20, category, status } = req.query as any;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    if (category && category !== "all") where.category = category;
    if (status)   where.status = status;

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(pageSize),
      }),
      prisma.market.count({ where }),
    ]);

    return reply.send({
      data: markets.map(toMarket),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      hasMore: skip + markets.length < total,
    });
  });

  // GET /api/markets/stats — aggregate stats for homepage hero
  fastify.get("/stats", async (_req, reply) => {
    const [totalMarkets, activeMarkets, agg, paidOutAgg] = await Promise.all([
      prisma.market.count(),
      prisma.market.count({ where: { status: "active" } }),
      prisma.market.aggregate({ _sum: { totalVolume: true, liquidity: true } }),
      // Sum realizedPnl of winning positions as "paid out"
      prisma.position.aggregate({ _sum: { realizedPnl: true } }),
    ]);

    const paidOut = Math.max(0, paidOutAgg._sum.realizedPnl ?? 0);

    return reply.send({
      data: {
        totalMarkets,
        activeMarkets,
        totalVolume:    agg._sum.totalVolume ?? 0,
        totalLiquidity: agg._sum.liquidity   ?? 0,
        paidOut,
      },
    });
  });

  // GET /api/markets/:id — single market detail
  fastify.get("/:id", async (req, reply) => {
    const { id } = req.params as any;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return reply.status(404).send({ error: "Market not found" });
    return reply.send({ data: toMarket(market) });
  });

  // POST /api/markets/validate — validate a question before creating
  fastify.post("/validate", async (req, reply) => {
    const { question } = req.body as any;
    if (!question) return reply.status(400).send({ error: "Question required" });
    const result = await validateMarketQuestion(question);
    return reply.send({ data: result });
  });

  // GET /api/markets/ai-suggest — AI-generated market suggestions
  fastify.get("/ai-suggest", async (req, reply) => {
    const { count = 5 } = req.query as any;
    const suggestions = await suggestMarkets(Number(count));
    return reply.send({ data: suggestions });
  });

  // POST /api/markets/generate — trigger AI market generation immediately
  fastify.post("/generate", async (req, reply) => {
    try {
      const { generateDailyMarkets } = await import("../workers/scheduler.worker");
      generateDailyMarkets().catch(console.error);
      return reply.send({ success: true, message: "Market generation started" });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/markets/:id/trades — trade history
  fastify.get("/:id/trades", async (req, reply) => {
    const { id } = req.params as any;
    try {
      const market = await prisma.market.findFirst({
        where: { OR: [{ id }, { address: id }] },
      });
      if (!market) return reply.status(404).send({ data: [] });

      const trades = await prisma.trade.findMany({
        where:   { marketId: market.id },
        orderBy: { timestamp: "desc" },
        take:    50,
      });
      return reply.send({ data: trades, success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/markets/:id/positions/:address — user position in a market
  fastify.get("/:id/positions/:address", async (req, reply) => {
    return reply.send({ data: null });
  });

  // POST /api/markets — create a new user-generated market
  fastify.post("/", async (req, reply) => {
    try {
      const { question, description, category, resolvesAt, creatorAddress, initLiquidity } = req.body as any;

      if (!question || !creatorAddress || !resolvesAt) {
        return reply.status(400).send({ error: "Missing required fields" });
      }

      // Ensure creator user exists
      await prisma.user.upsert({
        where: { address: creatorAddress },
        create: { address: creatorAddress },
        update: {},
      });

      // Generate a mock contract address for this market
      const mockAddress = `0x${Buffer.from(question + Date.now()).toString("hex").slice(0, 40)}`;

      const market = await prisma.market.create({
        data: {
          address:        mockAddress,
          question,
          description,
          category,
          creatorAddress,
          resolvesAt:     new Date(resolvesAt),
          initLiquidity:  Number(initLiquidity),
          liquidity:      Number(initLiquidity),
          status:         "active",
        },
      });

      return reply.send({ data: toMarket(market), success: true });
    } catch (err: any) {
      console.error("[Backend] Market Creation Error:", err.message);
      return reply.status(500).send({ error: err.message });
    }
  });
}
