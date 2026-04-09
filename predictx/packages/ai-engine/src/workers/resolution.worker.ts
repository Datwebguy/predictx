import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { resolveMarket } from "../services/ai.service";

// Connection is created lazily inside startResolutionWorker() so that
// dotenv.config() in index.ts has already populated process.env.REDIS_URL
// before this module's top-level code runs. Creating IORedis at import time
// would connect before the env is loaded, falling back to localhost:6379.

function makeConnection() {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
  });
}

export function startResolutionWorker() {
  const connection = makeConnection();
  const queueConnection = makeConnection();

  // Export-equivalent: expose the queue for enqueueing from other modules
  const resolutionQueue = new Queue("resolution", { connection: queueConnection });

  const worker = new Worker(
    "resolution",
    async (job) => {
      const { marketId, marketAddress, question, resolvesAt } = job.data;
      console.log(`[Resolution Worker] Resolving market ${marketId}: "${question}"`);

      const result = await resolveMarket(question, resolvesAt);
      console.log(`[Resolution Worker] Outcome: ${result.outcome} (confidence: ${result.confidence})`);

      if (result.confidence >= 0.85) {
        // TODO: cast vote on ResolutionOracle via viem wallet client
        // const outcomeCode = result.outcome === "YES" ? 1 : result.outcome === "NO" ? 2 : 3;
        // await oracleContract.write.castVote([marketAddress, outcomeCode]);
        console.log(`[Resolution Worker] High confidence — would submit on-chain vote`);
      } else {
        console.log(`[Resolution Worker] Low confidence (${result.confidence}) — flagging for manual review`);
      }

      return result;
    },
    { connection, concurrency: 3 }
  );

  worker.on("completed", (job, result) => {
    console.log(`[Resolution Worker] Job ${job.id} done:`, result.outcome);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Resolution Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log("[Resolution Worker] Started");

  // Schedule polling: every 5 min check for markets past resolvesAt
  setInterval(async () => {
    // TODO: query DB for expired OPEN markets and enqueue them
    console.log("[Resolution Worker] Polling for expired markets...");
  }, 5 * 60 * 1000);

  return { worker, resolutionQueue };
}
