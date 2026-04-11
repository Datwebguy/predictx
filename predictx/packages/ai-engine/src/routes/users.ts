import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function usersRoute(fastify: FastifyInstance) {
  // GET /api/users/leaderboard — must be before /:address to avoid param capture
  fastify.get("/leaderboard", async (req, reply) => {
    try {
      const { limit = 50 } = req.query as any;
      const users = await prisma.user.findMany({
        orderBy: { totalVolume: "desc" },
        take: Number(limit),
      });

      const withStats = await Promise.all(
        users.map(async (u, i) => {
          const [tradeCount, volAgg] = await Promise.all([
            prisma.trade.count({ where: { userAddress: u.address } }),
            prisma.trade.aggregate({
              where: { userAddress: u.address },
              _sum:  { usdcAmount: true },
            }),
          ]);
          return {
            rank:        i + 1,
            address:     u.address,
            username:    u.username,
            totalPnl:    u.totalPnl,
            tradeCount,
            totalVolume: volAgg._sum.usdcAmount ?? 0,
          };
        })
      );

      return reply.send({ data: withStats, success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/users/:address
  fastify.get("/:address", async (req, reply) => {
    const { address } = req.params as any;
    const user = await prisma.user.findUnique({ where: { address } });
    return reply.send({ data: user ?? null });
  });

  // GET /api/users/:address/positions
  fastify.get("/:address/positions", async (req, reply) => {
    const { address } = req.params as any;
    try {
      const positions = await prisma.position.findMany({
        where: { userAddress: address },
        include: {
          market: {
            select: {
              id: true, question: true, category: true,
              yesProbability: true, outcome: true, resolvesAt: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      return reply.send({ data: positions, success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/users/:address/history
  fastify.get("/:address/history", async (req, reply) => {
    const { address } = req.params as any;
    try {
      const trades = await prisma.trade.findMany({
        where: { userAddress: address },
        include: {
          market: {
            select: { id: true, question: true, category: true, outcome: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: 100,
      });
      return reply.send({ data: trades, success: true });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
