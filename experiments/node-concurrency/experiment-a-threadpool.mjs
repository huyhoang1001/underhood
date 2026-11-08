#!/usr/bin/env node
/**
 * Experiment A: libuv Thread Pool Saturation
 *
 * Demonstrates how asynchronous crypto operations (crypto.pbkdf2)
 * are dispatched onto libuv's worker thread pool, and what happens
 * when job count exceeds UV_THREADPOOL_SIZE.
 *
 * Run with:
 *   node experiment-a-threadpool.mjs 4
 *   node experiment-a-threadpool.mjs 8
 *   UV_THREADPOOL_SIZE=8 node experiment-a-threadpool.mjs 8
 */
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

const poolSize = process.env.UV_THREADPOOL_SIZE || '4 (default)';
const jobCount = parseInt(process.argv[2] || '4', 10);

console.log(`\n============================================================`);
console.log(`Experiment A: libuv Thread Pool Saturation`);
console.log(`UV_THREADPOOL_SIZE : ${poolSize}`);
console.log(`Total crypto jobs  : ${jobCount}`);
console.log(`============================================================\n`);

const startTotal = performance.now();
let completed = 0;
const results = [];

for (let i = 1; i <= jobCount; i++) {
  const jobStart = performance.now();
  crypto.pbkdf2('secret-passphrase', 'salt-token', 100000, 64, 'sha512', (err) => {
    if (err) throw err;
    const duration = performance.now() - jobStart;
    completed++;
    results.push({ job: i, duration });
    console.log(`  Job #${String(i).padStart(2, ' ')} finished in ${duration.toFixed(1).padStart(7, ' ')} ms`);

    if (completed === jobCount) {
      const totalDuration = performance.now() - startTotal;
      console.log(`\nAll ${jobCount} jobs completed in ${totalDuration.toFixed(1)} ms total.`);
      console.log(`Average job duration: ${(results.reduce((a, b) => a + b.duration, 0) / jobCount).toFixed(1)} ms\n`);
    }
  });
}
