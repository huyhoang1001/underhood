#!/usr/bin/env node
/**
 * Experiment C: Promise.all vs. Actual Parallel Execution
 *
 * Demonstrates the crucial distinction:
 * - Concurrent asynchronous I/O (dispatched to OS kernel non-blocking sockets)
 *   runs concurrently without consuming JavaScript threads.
 * - But Promise.all() wrapping CPU-bound JavaScript execution executes sequentially
 *   on the single main thread!
 *
 * Run with:
 *   node experiment-c-promise-all.mjs
 */
import net from 'node:net';
import { performance } from 'node:perf_hooks';

console.log(`\n============================================================`);
console.log(`Experiment C: Promise.all() vs. Actual Parallel Execution`);
console.log(`============================================================\n`);

// 1. Concurrent Non-Blocking Socket I/O
async function testConcurrentSocketIo() {
  console.log(`Part 1: 10 Concurrent Asynchronous Socket Timers (epoll/kqueue)`);

  const server = net.createServer((sock) => {
    setTimeout(() => sock.end('pong'), 50);
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const start = performance.now();
  const socketOps = Array.from({ length: 10 }, (_, i) => {
    return new Promise((resolve) => {
      const s = net.connect(port, () => {
        s.on('data', () => {});
        s.on('end', () => resolve(i));
      });
    });
  });

  await Promise.all(socketOps);
  const duration = performance.now() - start;
  server.close();

  console.log(`   10 socket operations (each taking 50ms) completed in: ${duration.toFixed(1)} ms total.`);
  console.log(`   Result: Overlapped in OS kernel readiness queue (libuv event demultiplexer).\n`);
}

// 2. Promise.all() with CPU-Intensive Tasks
async function testPromiseAllWithCpuTasks() {
  console.log(`Part 2: 4 CPU-Intensive Tasks Wrapped in Promise.all()`);

  function syncWork(id, durationMs = 60) {
    const start = performance.now();
    while (performance.now() - start < durationMs) {
      // Busy spin on main thread
    }
    return id;
  }

  const start = performance.now();
  const cpuPromises = [1, 2, 3, 4].map((id) => {
    return new Promise((resolve) => {
      const jobStart = performance.now();
      syncWork(id, 60);
      const jobDuration = performance.now() - jobStart;
      console.log(`   Job #${id} finished execution after ${jobDuration.toFixed(1)} ms`);
      resolve(id);
    });
  });

  await Promise.all(cpuPromises);
  const totalDuration = performance.now() - start;

  console.log(`\n   Total duration for 4 x 60ms CPU jobs: ${totalDuration.toFixed(1)} ms`);
  console.log(`   Theoretical parallel time (if multi-threaded): ~60 ms`);
  console.log(`   Actual sequential time: ${(60 * 4).toFixed(0)} ms (~${totalDuration.toFixed(0)} ms)`);
  console.log(`\n   Conclusion: Promise.all() DOES NOT parallelize JavaScript CPU execution.`);
  console.log(`   Every synchronous callback ran back-to-back on the single main thread.\n`);
}

async function run() {
  await testConcurrentSocketIo();
  await testPromiseAllWithCpuTasks();
}

run();
