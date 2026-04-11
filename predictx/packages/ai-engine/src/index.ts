import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // Loads root .env for DEPLOYER_PRIVATE_KEY, FACTORY_ADDRESS, etc.

import Fastify from "fastify";
import cors from "@fastify/cors";
import { marketsRoute } from "./routes/markets";
import { resolutionRoute } from "./routes/resolution";
import { usersRoute } from "./routes/users";
import { startResolutionWorker } from "./workers/resolution.worker";
import { startScheduler } from "./workers/scheduler.worker";
import { startIndexer } from "./workers/indexer";

// Global Error Handlers (The Fortress)
process.on("uncaughtException", (err) => {
  console.error("[FORTRESS] Uncaught Exception:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FORTRESS] Unhandled Rejection at:", promise, "reason:", reason);
});

const server = Fastify({ logger: true });

async function bootstrap() {
  console.log("[Bootstrap] Starting PredictX AI Engine...");

  try {
    console.log("[Bootstrap] Registering CORS...");
    await server.register(cors, {
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    });

    server.get("/health", async () => {
      console.log("[Health] Check requested");
      return { status: "ok", time: new Date().toISOString() };
    });

    console.log("[Bootstrap] Registering routes...");
    server.register(marketsRoute, { prefix: "/api/markets" });
    server.register(resolutionRoute, { prefix: "/api/resolution" });
    server.register(usersRoute, { prefix: "/api/users" });

    server.post("/api/indexer/trigger", async (req, reply) => {
      const { indexNewBlocks } = await import("./workers/indexer");
      await indexNewBlocks();
      return reply.send({ success: true });
    });

    server.get("/", async () => ({
      name: "PredictX AI Engine",
      status: "ok",
    }));

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    console.log(`[Bootstrap] Attempting to listen on port ${port}...`);
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`[Bootstrap] ✓ Server listening on port ${port}`);

    // Start background workers ONLY after server is listening
    if (!process.env.VERCEL) {
      console.log("[Bootstrap] Initializing background tasks...");

      try {
        startResolutionWorker();
        console.log("[Bootstrap] ✓ Resolution Worker started");
      } catch (e: any) { console.error("[Bootstrap] Resolution Worker Error:", e.message); }

      try {
        startScheduler();
        console.log("[Bootstrap] ✓ Scheduler started");
      } catch (e: any) { console.error("[Bootstrap] Scheduler Error:", e.message); }

      try {
        startIndexer();
        console.log("[Bootstrap] ✓ Indexer started");
      } catch (e: any) { console.error("[Bootstrap] Indexer Error:", e.message); }
    }

  } catch (err: any) {
    console.error("[Bootstrap] FATAL STARTUP ERROR:", err.message);
    console.error(err.stack);
    // Keep process alive for at least 30s to allow log viewing
    setTimeout(() => process.exit(1), 30000);
  }
}

bootstrap();
