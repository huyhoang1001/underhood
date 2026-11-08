#!/usr/bin/env node
/**
 * Experiment B: Event Loop Blocking
 *
 * Demonstrates how synchronous, CPU-intensive JavaScript on the
 * main thread blocks the Event Loop, preventing concurrent HTTP
 * requests from being accepted or processed.
 *
 * Uses perf_hooks.monitorEventLoopDelay() to measure Event Loop lag.
 *
 * Run with:
 *   node experiment-b-eventloop-blocking.mjs
 */
import http from 'node:http';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 10 });
histogram.enable();

function syncCpuIntensiveTask(iterations = 40_000_000) {
  let count = 0;
  for (let i = 0; i < iterations; i++) {
    count += Math.sqrt(i) % 2;
  }
  return count;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/heavy') {
    const start = performance.now();
    syncCpuIntensiveTask();
    const duration = performance.now() - start;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'completed',
        durationMs: duration.toFixed(1),
        eventLoopMaxLagMs: (histogram.max / 1e6).toFixed(2),
        eventLoopMeanLagMs: (histogram.mean / 1e6).toFixed(2)
      })
    );
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3456;
server.listen(PORT, async () => {
  console.log(`\n============================================================`);
  console.log(`Experiment B: Event Loop Blocking`);
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
  console.log(`============================================================\n`);

  // Helper fetch
  const get = (path) =>
    new Promise((resolve, reject) => {
      const start = performance.now();
      http
        .get(`http://127.0.0.1:${PORT}${path}`, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ duration: performance.now() - start, body }));
        })
        .on('error', reject);
    });

  console.log('1. Measuring baseline /ping latency (unloaded Event Loop)...');
  const baseline = await get('/ping');
  console.log(`   Baseline /ping response time: ${baseline.duration.toFixed(2)} ms\n`);

  console.log('2. Firing concurrent requests:');
  console.log('   - Request 1: /heavy (synchronous CPU loop)');
  console.log('   - Request 2: /ping  (sent 5ms after /heavy started)\n');

  histogram.reset();

  const heavyPromise = get('/heavy');

  // Wait 5ms then dispatch /ping while heavy is running
  await new Promise((r) => setTimeout(r, 5));
  const pingPromise = get('/ping');

  const [heavyRes, pingRes] = await Promise.all([heavyPromise, pingPromise]);

  console.log(`   /heavy finished in : ${heavyRes.duration.toFixed(2)} ms`);
  console.log(`   /ping  finished in : ${pingRes.duration.toFixed(2)} ms (BLOCKED waiting for Event Loop!)`);
  console.log(`\nEvent Loop Histogram Metrics:`);
  console.log(`   Max Event Loop Delay : ${(histogram.max / 1e6).toFixed(2)} ms`);
  console.log(`   Mean Event Loop Delay: ${(histogram.mean / 1e6).toFixed(2)} ms`);
  console.log(`\nConclusion: A single synchronous CPU function blocked every concurrent HTTP caller.`);

  server.close();
});
