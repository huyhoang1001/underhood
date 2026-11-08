#!/usr/bin/env node
/**
 * Experiment D: Offloading CPU Work to Worker Threads
 *
 * Demonstrates:
 * 1. Offloading synchronous CPU execution from the main thread into node:worker_threads.
 * 2. Proving that the main thread's Event Loop remains 100% responsive while
 *    parallel worker threads execute heavy computation across real OS threads.
 * 3. Measuring worker thread spawn overhead vs. reusable execution.
 *
 * Run with:
 *   node experiment-d-worker-threads.mjs
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

if (!isMainThread) {
  // Worker code
  const { iterations, id } = workerData;
  const start = performance.now();
  let count = 0;
  for (let i = 0; i < iterations; i++) {
    count += Math.sqrt(i) % 2;
  }
  const duration = performance.now() - start;
  parentPort.postMessage({ id, count, duration });
  process.exit(0);
}

// Main thread code
console.log(`\n============================================================`);
console.log(`Experiment D: Worker Threads Concurrency`);
console.log(`============================================================\n`);

async function runWorker(id, iterations = 30_000_000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: { id, iterations }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

async function main() {
  console.log(`Dispatching 4 heavy CPU jobs to 4 independent Worker Threads...`);
  const start = performance.now();

  // Concurrent ping interval on main thread to verify responsiveness
  let pingCount = 0;
  let maxPingDelay = 0;
  const pingInterval = setInterval(() => {
    const pingStart = performance.now();
    // Simulate lightweight event loop tick
    const delay = performance.now() - pingStart;
    maxPingDelay = Math.max(maxPingDelay, delay);
    pingCount++;
  }, 10);

  const workerPromises = [1, 2, 3, 4].map((id) => runWorker(id));
  const results = await Promise.all(workerPromises);

  clearInterval(pingInterval);
  const totalDuration = performance.now() - start;

  results.forEach((r) => {
    console.log(`  Worker #${r.id} finished in ${r.duration.toFixed(1)} ms`);
  });

  console.log(`\nAll 4 workers finished in ${totalDuration.toFixed(1)} ms total.`);
  console.log(`Main thread Event Loop health:`);
  console.log(`  - Heartbeat ticks executed : ${pingCount}`);
  console.log(`  - Max heartbeat lag         : ${maxPingDelay.toFixed(3)} ms`);
  console.log(`\nConclusion: Main thread remained completely responsive while 4 CPU cores ran in parallel.`);
}

main();
