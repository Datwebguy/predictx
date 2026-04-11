import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // Loads root .env for DEPLOYER_PRIVATE_KEY, FACTORY_ADDRESS, etc.

import Fastify from "fastify";
import cors from "@fastify/cors";
import { marketsRoute }    from "./routes/markets";
import { resolutionRoute } from "./routes/resolution";
import { usersRoute }      from "./routes/users";
import { startResolutionWorker } from "./workers/resolution.worker";
import { startScheduler }       from "./workers/scheduler.worker";
import { startIndexer }         from "./workers/indexer";

const server = Fastify({ logger: true });

async function bootstrap() {
  await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  });

  server.get("/health", async () => {
    console.log("[Health] Check requested at", new Date().toISOString());
    return { status: "ok", time: new Date().toISOString() };
  });

  // Routes
  server.register(marketsRoute,    { prefix: "/api/markets" });
  server.register(resolutionRoute, { prefix: "/api/resolution" });
  server.register(usersRoute,      { prefix: "/api/users" });

  // Manual trigger for Indexer (useful for Vercel/Cron)
  server.post("/api/indexer/trigger", async (req, reply) => {
    try {
      const { indexNewBlocks } = await import("./workers/indexer");
      await indexNewBlocks();
      return reply.send({ success: true, message: "Indexing complete" });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Root
  server.get("/", async () => ({
    name: "PredictX AI Engine",
    version: "0.1.0",
    status: "ok",
    endpoints: ["/health", "/api/markets", "/api/resolution", "/api/users"],
  }));

  // Health check
  server.get("/health", async () => ({ status: "ok", ts: Date.now() }));

  // Start background workers
  if (!process.env.VERCEL) {
    console.log("[Bootstrap] Starting background services...");
    try {
      startResolutionWorker();
      console.log("[Bootstrap] ✓ Resolution Worker initialized");
    } catch (err: any) {
      console.warn("[Bootstrap] ⚠ Resolution Worker failed to start (likely missing Redis):", err.message);
    }

    try {
      startScheduler();
      console.log("[Bootstrap] ✓ Scheduler initialized");
    } catch (err: any) {
      console.warn("[Bootstrap] ⚠ Scheduler failed to start:", err.message);
    }

    try {
      startIndexer();
      console.log("[Bootstrap] ✓ Indexer initialized");
    } catch (err: any) {
      console.warn("[Bootstrap] ⚠ Indexer failed to start:", err.message);
    }
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`PredictX AI Engine running on :${port}`);
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
