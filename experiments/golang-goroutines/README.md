# Go Goroutines Experiment Server

A minimal Go HTTP server demonstrating how Go scheduler behaviour changes across three `/compute` strategies — direct goroutine, worker pool, and bounded worker pool — and how each strategy affects `/health` latency under concurrent CPU load.

Companion experiment for the article **"Go Under the Hood: Goroutines, the Runtime Scheduler, and Concurrency That Actually Works"**.

---

## Prerequisites

- **Go 1.22+** — `go version` to confirm
- **wrk** — HTTP benchmarking tool (`brew install wrk` on macOS)
- **curl** — included on macOS and most Linux distributions

---

## Build and Run

```bash
# Confirm the project compiles
go build ./...

# Start the server on port 3000
go run .
```

On startup the server logs the current `GOMAXPROCS` value and the number of logical CPU cores:

```
GOMAXPROCS        : 8
Logical CPU cores : 8
Listening on http://0.0.0.0:3000
```

To force single-processor mode (the starvation scenario):

```bash
GOMAXPROCS=1 go run .
```

---

## Endpoints

### `GET /health`

Always returns `{"status":"ok"}` with HTTP 200. No query parameters. Used to measure scheduler responsiveness while `/compute` is under load.

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

### `GET /compute?strategy=goroutine`

Runs a 100 ms CPU-bound busy-wait loop directly in the request goroutine. The goroutine holds the logical processor (P) for the full 100 ms without yielding.

This is the **default strategy** — omitting the `strategy` parameter behaves identically.

```bash
curl "http://localhost:3000/compute?strategy=goroutine"
curl  http://localhost:3000/compute         # same result
```

### `GET /compute?strategy=workerpool`

Dispatches the 100 ms busy-wait to one of 4 pre-started worker goroutines via a buffered job channel (capacity 1000). The request goroutine blocks on a channel receive while waiting — it does not spin or sleep, so it releases its P.

```bash
curl "http://localhost:3000/compute?strategy=workerpool"
```

### `GET /compute?strategy=bounded`

Same 4-worker pool as `workerpool`, but the job channel has a capacity of 20. When the queue is full, the endpoint returns `503 Service Unavailable` immediately rather than blocking the caller.

```bash
curl "http://localhost:3000/compute?strategy=bounded"
```

### `GET /compute?strategy=<unknown>`

Any unrecognised strategy value returns `400 Bad Request` with an error message listing the valid options.

```bash
curl "http://localhost:3000/compute?strategy=foo"
# {"error":"Unknown strategy 'foo'. Valid values: goroutine, workerpool, bounded"}
```

**Response shape (all valid strategies):**

```json
{
  "strategy": "workerpool",
  "duration_ms": 102,
  "goroutine_id": "7"
}
```

**Error shape (503 and 400):**

```json
{
  "error": "Server overloaded: job queue full"
}
```

---

## Benchmark Commands

Run each benchmark from a second terminal while the server is running in the first. `wrk` sends 50 concurrent connections for 30 seconds using 4 threads.

### GOMAXPROCS=1 — single logical processor (starvation scenario)

**Terminal 1:**
```bash
GOMAXPROCS=1 go run .
```

**Terminal 2:**
```bash
# Goroutine strategy — expect /health latency to degrade significantly
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=goroutine"

# Worker pool strategy — expect /health latency to stay low
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=workerpool"

# Bounded strategy — expect 503s when queue fills, /health stays low
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=bounded"
```

### GOMAXPROCS=N (default) — all logical cores

**Terminal 1:**
```bash
go run .   # uses GOMAXPROCS=runtime.NumCPU() by default
```

**Terminal 2:**
```bash
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=goroutine"
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=workerpool"
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=bounded"
```

---

## Measuring /health Impact During Load

Use three terminals to observe how `/health` latency responds while `/compute` is under load.

**Terminal 1 — start the server:**
```bash
GOMAXPROCS=1 go run .
```

**Terminal 2 — apply load to `/compute`:**
```bash
wrk -t4 -c50 -d30s "http://localhost:3000/compute?strategy=goroutine"
```

**Terminal 3 — poll `/health` every 100 ms:**
```bash
while true; do curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/health; sleep 0.1; done
```

Watch the `time_total` values in Terminal 3 during the `wrk` run. With `strategy=goroutine` and `GOMAXPROCS=1` you should see `/health` response times climb above 100 ms. Switch the `wrk` command to `strategy=workerpool` and they should return to under 5 ms.

---

## Expected Outcomes

> **Expected outcomes — replace with measured values after running benchmarks.**

The table below shows predicted behaviour based on the Go scheduler's design. Run the benchmarks above on your machine and record the actual values.

| Strategy | GOMAXPROCS | /health p99 latency | /compute throughput | Error rate |
|---|---|---|---|---|
| `goroutine` | 1 | >100 ms | ~8 req/s | 0% |
| `goroutine` | num_cores | ≤10 ms | ~300 req/s | 0% |
| `workerpool` | 1 | ≤5 ms | ~40 req/s | 0% |
| `workerpool` | num_cores | ≤5 ms | ~40 req/s | 0% |
| `bounded` | 1 | ≤5 ms | ~40 req/s | varies (excess requests get 503) |
| `bounded` | num_cores | ≤5 ms | ~40 req/s | varies (excess requests get 503) |

**Why `goroutine` throughput is higher at `GOMAXPROCS=num_cores`:** multiple cores can run the busy-wait in true parallel, so more requests complete per second. The worker pool strategies are limited to 4 workers regardless of core count, capping throughput at approximately 4 workers × 10 completions/s = 40 req/s.

**Why `bounded` has a varying error rate:** when 50 concurrent requests arrive and only 4 workers are active, the job channel fills to its capacity of 20. Any request arriving while the queue is full receives a 503 immediately. The error rate depends on arrival rate relative to worker throughput.

---

## Per-request Latency Log

The server writes one CSV line to stdout for every completed `/compute` request. There is no header row. Fields are:

```
strategy,timestamp_ms,duration_ms
```

| Field | Type | Description |
|---|---|---|
| `strategy` | string | One of `goroutine`, `workerpool`, `bounded` |
| `timestamp_ms` | integer | Unix epoch time in milliseconds when the response was sent |
| `duration_ms` | integer | Observed wall-clock latency of the compute work in milliseconds |

**Example output:**

```
goroutine,1721000000000,103
workerpool,1721000000105,101
bounded,1721000000210,100
goroutine,1721000000311,102
```

You can pipe the server output to a file and analyse it:

```bash
go run . 2>/dev/null | tee latency.csv

# Count requests per strategy
awk -F, '{print $1}' latency.csv | sort | uniq -c

# Compute average duration per strategy
awk -F, '{sum[$1]+=$3; count[$1]++} END {for (s in sum) print s, sum[s]/count[s] "ms avg"}' latency.csv
```
