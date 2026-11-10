# Rust Tokio Blocking Experiment

Companion to: **"Rust Under the Hood: Async Tasks, Worker Threads, and Blocking Work"**

## Prerequisites

- Rust 1.75+ (Stable), cargo
- wrk (HTTP benchmarking tool): https://github.com/wg/wrk
- curl

## Build and Run

```bash
cargo build --release
cargo run --release
```

The server starts on `http://0.0.0.0:3000` and prints the Tokio worker thread count and blocking thread ceiling to stdout.

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Returns `{"status":"ok"}` with 200 OK |
| `/compute?strategy=blocking` | GET | Runs 100 ms busy-wait directly on async worker thread (starves scheduler) |
| `/compute?strategy=spawn_blocking` | GET | Offloads 100 ms busy-wait to Tokio blocking thread pool |
| `/compute?strategy=bounded` | GET | Same as spawn_blocking, capped at 4 concurrent tasks via Semaphore; returns 503 after 30 s queue wait |
| `/compute?strategy=INVALID` | GET | Returns 400 with error listing valid strategy values |

## Benchmark Commands

All benchmarks use 50 concurrent connections sustained for 30 seconds (`wrk -t4 -c50 -d30s`).

### Strategy: blocking (demonstrates starvation)

```bash
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=blocking
```

### Strategy: spawn_blocking (isolates blocking thread pool)

```bash
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=spawn_blocking
```

### Strategy: bounded (enforces max 4 concurrent blocking tasks)

```bash
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=bounded
```

## Measuring /health Impact During Load

Open two terminals to observe scheduler starvation in action:

```bash
# Terminal 1: run the starvation load
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=blocking

# Terminal 2: probe health endpoint concurrently (observe latency spike)
wrk -t1 -c1 -d30s http://localhost:3000/health
```

## Expected Outcomes

> These values are expected outcomes based on an 8-core machine. Replace with measured values after running the benchmarks above.

| Strategy | /health p99 latency | /compute throughput | Error rate |
|---|---|---|---|
| `blocking` | > 100 ms | ~8 req/s | ~0% |
| `spawn_blocking` | ≤ 5 ms | ~8 req/s | ~0% |
| `bounded` | ≤ 5 ms | ~4 req/s | ~0% (503s counted separately) |

**What to observe:**
- `blocking`: `/health` latency degrades from ~2 ms to >300 ms under load — async worker thread starvation confirmed.
- `spawn_blocking`: `/health` stays at ≤5 ms — worker threads remain free because blocking work is offloaded.
- `bounded`: Same isolation as `spawn_blocking`, plus excess requests receive 503 rather than queueing indefinitely.

## Per-request Latency Log

Each request to `/compute` outputs a CSV line to stdout:

```
strategy,timestamp_ms,duration_ms
```

Example output:
```
blocking,1736956800123,101
spawn_blocking,1736956800234,102
bounded,1736956800345,100
```

Use this output to construct the benchmark result tables in the article.
