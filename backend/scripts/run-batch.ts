import "dotenv/config";
import { runBatch, getQueueState } from "../src/services/renderQueue.js";

const regenerate = process.argv.includes("--regenerate");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;

const result = await runBatch({ regenerate, limit });
console.log("queued", result);

const timer = setInterval(() => {
  const s = getQueueState();
  console.log(`progress ${s.processed}/${s.total} failed=${s.failed} running=${s.running}`);
  if (!s.running) {
    clearInterval(timer);
    process.exit(s.failed ? 1 : 0);
  }
}, 2000);
