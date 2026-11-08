# Node.js Concurrency & Runtime Experiments

Reproducible test harnesses evaluating the libuv thread pool, Event Loop blocking, `Promise.all()` execution semantics, and `node:worker_threads` parallelism.

These scripts support the Underhood publication: *"Node.js Is Single-Threaded. So Who's Doing the Work?"*

## Prerequisites

- Node.js >= 18.0.0 (Tested on Node.js v22 on Linux x86_64)
- No external npm dependencies required (uses only `node:crypto`, `node:net`, `node:http`, `node:perf_hooks`, `node:worker_threads`).

## Experiments

### 1. Experiment A: libuv Thread Pool Saturation
Demonstrates how asynchronous crypto operations are dispatched onto libuv worker threads, and what happens when concurrent job count exceeds `UV_THREADPOOL_SIZE`.

```bash
# Run 4 jobs with default 4-worker pool
node experiment-a-threadpool.mjs 4

# Run 8 jobs with default 4-worker pool (exhibits 2 distinct waves of 4)
node experiment-a-threadpool.mjs 8

# Run 8 jobs with expanded 8-worker pool
UV_THREADPOOL_SIZE=8 node experiment-a-threadpool.mjs 8
```

### 2. Experiment B: Event Loop Blocking
Measures the latency impact on lightweight concurrent requests (`/ping`) when a synchronous CPU loop blocks the main thread. Tracks latency with `perf_hooks.monitorEventLoopDelay()`.

```bash
node experiment-b-eventloop-blocking.mjs
```

### 3. Experiment C: Promise.all() vs. Parallel Execution
Proves that `Promise.all()` overlaps concurrent non-blocking socket operations via OS kernel readiness (`epoll`), but executes CPU-intensive JavaScript callbacks sequentially on the main thread.

```bash
node experiment-c-promise-all.mjs
```

### 4. Experiment D: Worker Threads Concurrency
Offloads CPU-heavy loops to `node:worker_threads` and monitors main-thread heartbeat tick latency to prove true multi-core parallelism with sub-millisecond Event Loop lag.

```bash
node experiment-d-worker-threads.mjs
```
