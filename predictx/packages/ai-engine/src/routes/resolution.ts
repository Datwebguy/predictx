import { FastifyInstance } from "fastify";
import { resolveMarket } from "../services/ai.service";

export async function resolutionRoute(fastify: FastifyInstance) {
  // POST /api/resolution/resolve — trigger AI resolution for a market
  fastify.post("/resolve", async (req, reply) => {
    const { marketId, question, resolvesAt } = req.body as any;
    if (!marketId || !question || !resolvesAt) {
      return reply.status(400).send({ error: "marketId, question, resolvesAt required" });
    }

    try {
      const result = await resolveMarket(question, resolvesAt);
      // TODO: if confidence > 0.85, auto-cast vote via ResolutionOracle contract
      // TODO: store resolution attempt in DB
      return reply.send({ data: result });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // GET /api/resolution/pending — markets ready to resolve
  fastify.get("/pending", async (req, reply) => {
    // TODO: query DB for markets past resolvesAt and still OPEN
    return reply.send({ data: [] });
  });
}
