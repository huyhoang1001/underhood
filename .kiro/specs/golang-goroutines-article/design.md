# Design Document

## Overview

This document covers the design for the `golang-goroutines-article` feature: a full experiment-driven engineering article about Go's concurrency model, its M:N scheduler, and goroutine starvation under CPU load.

The deliverable has five parts that must be built together:

1. **Go experiment server** — `experiments/golang-goroutines/` — a minimal HTTP server implementing three `/compute` strategies to demonstrate scheduler behaviour empirically.
2. **`GoSchedulerDiagram` React component** — `src/components/GoSchedulerDiagram.tsx` — a 5-layer interactive architectural map of the Go scheduler, modelled after `TokioArchitectureDiagram.tsx`.
3. **`GoSchedulerDiagramIsland.astro`** — the Astro island wrapper that hydrates the React component client-side.
4. **Keystatic and slug-page wiring** — registering the component in `keystatic.config.ts` and `src/pages/writing/[slug].astro`.
5. **MDX content files** — `src/content/articles/golang-goroutines.mdx` and `src/content/experiments/golang-goroutines.mdx`.

The article is the third entry in the backend concurrency series, following `nodejs-single-threaded` and `rust-async-runtime`. It must maintain the same narrative rigour, visual vocabulary, and structural conventions as those two articles.

---

## Architecture

### Component interaction map

```
src/pages/writing/[slug].astro
  └── renders Content with components={...}
        └── GoSchedulerDiagramIsland.astro  (client:load)
              └── GoSchedulerDiagram.tsx    (React, interactive)

keystatic.config.ts
  └── articles.content.components
        └── GoSchedulerDiagram: GoSchedulerDiagramBlock (block, empty schema)

src/content/articles/golang-goroutines.mdx
  └── frontmatter → validated by articlesCollection (src/content/config.ts)
  └── body references <GoSchedulerDiagram /> JSX tag

src/content/experiments/golang-goroutines.mdx
  └── frontmatter → validated by experimentsCollection (src/content/config.ts)

experiments/golang-goroutines/
  ├── go.mod
  ├── go.sum
  └── main.go           (HTTP server: /health + /compute with 3 strategies)
```

The article page loads the island component with `client:load`, which means the diagram is interactive immediately on page load — the same approach as `TokioArchitectureDiagramIsland.astro`.

No changes are needed to `src/content/config.ts` — the existing Zod schemas for articles and experiments already accommodate all required frontmatter fields. The `interactiveType` enum in `experimentsCollection` is optional, and the Go experiment does not need to register a new enum value since `GoSchedulerDiagram` is a named MDX component, not an `ExperimentVisualizer`.

---

## Components and Interfaces

### 1. Go experiment server (`experiments/golang-goroutines/main.go`)

The server replicates the same contract as `experiments/rust-tokio-blocking/src/main.rs`, translated to idiomatic Go:

**Routes:**
- `GET /health` → `{"status":"ok"}` with HTTP 200
- `GET /compute?strategy=<s>` → JSON response or error

**Strategies:**

| Strategy | Behaviour |
|---|---|
| `goroutine` | Runs the 100 ms busy-wait directly in the request goroutine. Default when `strategy` is omitted. |
| `workerpool` | Dispatches the busy-wait to a pre-started pool of 4 worker goroutines draining a buffered job channel. |
| `bounded` | Same worker pool as `workerpool`, but enforces a maximum queue depth of 20 pending jobs via a buffered channel. Returns 503 when the channel is full. |
| anything else | Returns 400 with an `error` field listing the three valid values. |

**Response shape (all valid strategies):**
```json
{
  "strategy": "workerpool",
  "duration_ms": 102,
  "goroutine_id": "7"
}
```

**Error response shape:**
```json
{
  "error": "Unknown strategy 'x'. Valid values: goroutine, workerpool, bounded"
}
```

**Stdout CSV logging** (one line per request, no header):
```
goroutine,1721000000000,103
```
Fields: `strategy`, Unix epoch milliseconds, observed latency in milliseconds.

**Goroutine ID extraction:**

Go does not expose a goroutine ID in its public API. The idiomatic workaround is to read the runtime stack trace and parse the integer from the first line, which always starts with `goroutine <N> [`.

```go
func goroutineID() string {
    var buf [64]byte
    n := runtime.Stack(buf[:], false)
    // first line: "goroutine 42 [running]:"
    s := strings.TrimPrefix(string(buf[:n]), "goroutine ")
    idx := strings.IndexByte(s, ' ')
    if idx < 0 {
        return "unknown"
    }
    return s[:idx]
}
```

**Worker pool design:**

Both `workerpool` and `bounded` strategies share the same pool infrastructure, started once in `main` and held in an `AppState` struct passed through the HTTP handler. The difference is the channel buffer size: `workerpool` uses a large buffer (e.g. 1000) so it never returns 503 under the test load; `bounded` caps it at 20.

```go
type jobRequest struct {
    result chan jobResult
}

type jobResult struct {
    durationMs  int64
    goroutineID string
}

type AppState struct {
    workerJobs  chan jobRequest   // large buffer – workerpool strategy
    boundedJobs chan jobRequest   // small buffer (20) – bounded strategy
}
```

Each worker goroutine loops on `<-jobs`, does the work, and sends the result back through the per-request `result` channel. The handler blocks on `<-req.result` — a channel receive — not a spin or sleep, satisfying Requirement 3.11.

**Startup logging:**
```
GOMAXPROCS        : 8
Logical CPU cores : 8
Listening on http://0.0.0.0:3000
```

**Module path:** `golang-goroutines` (local module, no external dependencies beyond the standard library).

**Testing:** Unit-testable using `net/http/httptest.NewRecorder()` and direct handler calls without starting a live server.

---

### 2. `GoSchedulerDiagram` React component (`src/components/GoSchedulerDiagram.tsx`)

Modelled directly after `TokioArchitectureDiagram.tsx`. The component renders a 5-layer interactive architectural map of Go's M:N scheduler.

**Component interface:**
```tsx
export const GoSchedulerDiagram: React.FC = () => { ... }
```

No props — same zero-prop design as the Tokio and Node.js diagrams.

**The five layers:**

| Layer | ID | Title | Subtitle |
|---|---|---|---|
| 01 | `goroutine` | Goroutine (G) | Lightweight Execution Unit |
| 02 | `logical-processor` | Logical Processor (P) | Goroutine Run Queue Holder |
| 03 | `os-thread` | OS Thread (M) | Machine Thread Executor |
| 04 | `network-poller` | Network Poller | Non-blocking I/O Watcher |
| 05 | `work-stealing` | Work Stealing Scheduler | Cross-P Task Balancing |

Each layer entry follows the same `RuntimeLayer` interface shape used in `TokioArchitectureDiagram.tsx`:

```tsx
interface SchedulerLayer {
  id: string;
  title: string;
  subtitle: string;
  threadModel: string;   // shown in layer card footer and inspector
  operations: string[];  // bullet list in inspector
  blockingRisk: string;  // amber callout in inspector
  description: string;   // prose in inspector
  codeSnippet: string;   // code block in inspector
}
```

**Visual design — identical to existing diagrams:**
- Outer container: `rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22]`
- Header: `bg-[#f7f4ee] dark:bg-[#0d1117]` with a `cpu` or `Zap` lucide icon in `text-sky-500`
- Layer cards: 5-column grid, same active/inactive classes as `TokioArchitectureDiagram`
- Inspector drawer: same layout (title + subtitle + threadModel line + amber risk callout + prose + operations list + code block)
- Default selected layer: `logical-processor` (P) — it is the most conceptually central component for understanding `GOMAXPROCS`

**Layer content sketches:**

*Goroutine (G):*
- threadModel: "Goroutine stack: starts at 2–8 KB, grows on demand"
- blockingRisk: "ZERO thread held — goroutines waiting on I/O or channels consume no M thread while parked."
- description: A goroutine is a lightweight execution unit managed entirely by the Go runtime. Unlike OS threads (which start with an 8 MB fixed stack), goroutines start with a 2–8 KB stack that grows as needed. You can run a million of them. The Go scheduler, not the OS, decides when each goroutine runs.
- operations: `go func(){}()`, `runtime.Gosched()`, goroutine park/unpark, channel block/unblock, `sync.WaitGroup`
- codeSnippet: creating a goroutine with `go` keyword, noting it's not an OS thread

*Logical Processor (P):*
- threadModel: "GOMAXPROCS Ps (default: runtime.NumCPU())"
- blockingRisk: "CRITICAL — A CPU-bound goroutine with no yield points holds the P it runs on, preventing all other goroutines in its local queue from progressing."
- description: A P is a resource that an M (OS thread) must hold before it can run goroutines. Each P has its own local run queue. GOMAXPROCS determines how many Ps exist, which determines how many goroutines can truly run in parallel. With GOMAXPROCS=1, all goroutines share one P and run on one OS thread at a time.
- operations: local run queue, `GOMAXPROCS`, goroutine scheduling, work-stealing victim, `runtime.GOMAXPROCS(n)`
- codeSnippet: `runtime.GOMAXPROCS(runtime.NumCPU())` with a comment

*OS Thread (M):*
- threadModel: "One OS thread per active goroutine; count varies"
- blockingRisk: "HIGH when blocked on syscall — the Go runtime will spin up a new M to keep the P running, but thread proliferation has OS-level costs."
- description: An M is a real OS thread. The Go runtime maintains a pool of Ms and assigns them to Ps. When a goroutine makes a blocking syscall (e.g. a file read on a system without async support), the Go runtime automatically parks the P with the remaining goroutines on a new M, preventing the syscall from starving other goroutines. This is the key mechanism that makes Go's approach different from Node.js.
- operations: OS thread creation/parking, syscall hand-off, `runtime.LockOSThread()`, P hand-off on syscall
- codeSnippet: demonstrating the runtime's automatic M/P hand-off on a blocking syscall

*Network Poller:*
- threadModel: "Zero M threads held while waiting (epoll/kqueue)"
- blockingRisk: "ZERO — network I/O goroutines are parked and do not hold an M or a P while waiting for data."
- description: The Go network poller integrates epoll (Linux) or kqueue (macOS) directly into the runtime. When a goroutine reads from a net.Conn or sends an HTTP request, it does not block an OS thread. The goroutine parks itself, and the network poller watches for readiness events. When the kernel signals that data arrived, the poller unparks the goroutine and puts it back in the run queue.
- operations: `net.Conn.Read()`, `http.Get()`, goroutine park on I/O, kernel event arrival, goroutine unpark
- codeSnippet: net.Conn read with comment that no M is held during the wait

*Work Stealing Scheduler:*
- threadModel: "All Ps share; idle P steals from busy P's queue"
- blockingRisk: "LOW — the scheduler is lock-free; risk only arises when all Ps are saturated by CPU-bound goroutines with no yield points."
- description: Each P has its own local run queue of goroutines. When a P runs out of work, it steals half the goroutines from another P's queue. There is also a global run queue that Ps check periodically. This keeps all Ps busy under load without a central dispatch bottleneck. The global queue is checked every 61 scheduling ticks to prevent starvation of globally-queued goroutines.
- operations: local queue push/pop, global run queue poll, `go` keyword task placement, idle P steal, 61-tick global poll
- codeSnippet: `go` statements creating tasks that distribute across Ps

---

### 3. `GoSchedulerDiagramIsland.astro`

Exact same structure as `TokioArchitectureDiagramIsland.astro`:

```astro
---
import { GoSchedulerDiagram } from './GoSchedulerDiagram';
---
<GoSchedulerDiagram client:load />
```

---

### 4. Keystatic registration (`keystatic.config.ts`)

Add a `GoSchedulerDiagramBlock` constant following the same zero-schema pattern as the existing blocks:

```ts
const GoSchedulerDiagramBlock = block({
  label: 'Go Scheduler Diagram',
  schema: {}
});
```

Register it in both the `articles` and `experiments` collection `content` field component maps — same pattern as `TokioArchitectureDiagramBlock`.

---

### 5. `[slug].astro` update

Add `GoSchedulerDiagramIsland` to the import list and to the `components` prop passed to `<Content>`:

```astro
import GoSchedulerDiagramIsland from '../../components/GoSchedulerDiagramIsland.astro';
```

```astro
<Content components={{
  ...existingComponents,
  GoSchedulerDiagram: GoSchedulerDiagramIsland
}} />
```

---

### 6. Article MDX (`src/content/articles/golang-goroutines.mdx`)

**Frontmatter:**

```yaml
description: >-
  A hands-on journey through Go's goroutines, the M:N scheduler, GOMAXPROCS,
  and the worker pool pattern — with reproducible benchmarks showing what
  happens when a Go server runs CPU-heavy work without bounding concurrency.
date: 2025-07-15
status: draft
topic: backend-engineering
tags:
  - go
  - goroutines
  - concurrency
  - scheduler
  - performance
featured: false
githubUrl: >-
  https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines
relatedArticles:
  - nodejs-single-threaded
  - rust-async-runtime
relatedExperiments:
  - golang-goroutines
```

**Body structure (sections in order):**

1. **Opening contradiction** — Start with an observable fact: an HTTP server with `GOMAXPROCS=1` where the `/health` handler latency climbs from ~2 ms to >100 ms while concurrent goroutines run a CPU-bound loop. Present `wrk` commands and the measured output showing the spike.

2. **`<GoSchedulerDiagram />`** — Place immediately after the opening section, before the first `##` heading, in the same position as `<TokioArchitectureDiagram />` in the Rust article.

3. **Section: "First, what is a goroutine?"** — Build from OS threads. Stack size (8 MB for OS threads vs 2–8 KB for goroutines), creation cost, scheduling control (OS vs runtime). Avoid Go-specific scheduler vocabulary here — just establish goroutine as the concept.

4. **Section: "The Go scheduler: G, M, and P"** — Introduce the M:N model. Name and explain each component: G (goroutine), M (OS thread), P (logical processor). Explain `GOMAXPROCS`. Use a Mermaid diagram showing the three-level structure with the global run queue, per-P local queues, and the Network Poller.

5. **Section: "What goes wrong when a goroutine won't yield"** — Explain cooperative preemption at function call boundaries and `runtime.Gosched()`. Show the `goroutine` strategy handler code from the experiment. Walk through why `GOMAXPROCS=1` causes total starvation. Present the benchmark table (GOMAXPROCS=1 vs GOMAXPROCS=N).

6. **Section: "Channels and the worker pool pattern"** — Explain channels (buffered vs unbuffered, goroutine blocking on receive without holding M). Show the `workerpool` strategy code. Show the `bounded` strategy code with queue depth limit and 503 backpressure.

7. **Section: "Go vs. Node.js and Rust — a quick comparison"** — The three-runtime comparison table. Side-by-side code blocks (Go worker pool + Rust spawn_blocking/Semaphore). Inline links to both companion articles. Notes on GOMAXPROCS vs UV_THREADPOOL_SIZE distinction, goroutine stacks vs Tokio stackless tasks.

8. **Section: "Part N: Benchmark Results"** — Table showing all three strategies under GOMAXPROCS=1 and GOMAXPROCS=num_cores. Labelled as expected outcomes until real measurements are run.

9. **Section: "The production decision guide"** — Mermaid flowchart with three branches: I/O-bound → plain goroutines, CPU-bound with bounded concurrency needs → worker pool + job channel, CPU-bound with true parallelism needs → ensure GOMAXPROCS=num_cores.

10. **Conclusion** — One or two sentences restating the core mental model: goroutines are cheap, but a P is not; CPU-bound work without yield points holds a P and starves everything else queued on it; the worker pool pattern bounds this.

**Warning callout:**

Include at least one `> ⚠ Warning:` blockquote — good candidate: "Goroutine leaks are silent. A goroutine blocked forever on a channel receive that never gets a sender consumes memory indefinitely. Always ensure every job sent into a worker channel has a corresponding receiver, or use `select` with a `ctx.Done()` case."

**Code examples:** Every code snippet must match the actual `main.go` implementation exactly — same function names, variable names, and struct field names.

---

### 7. Experiment MDX (`src/content/experiments/golang-goroutines.mdx`)

**Required frontmatter fields** (all from `experimentsCollection` Zod schema):

```yaml
tagline: >-
  Empirical benchmark of Go scheduler starvation under CPU-bound goroutines,
  worker pool isolation with buffered channels, and bounded concurrency
  backpressure on a Go net/http server.
date: 2025-07-15
status: draft
topic: backend-engineering
hypothesis: >-
  Executing a 100 ms CPU-bound loop directly in a request goroutine with
  GOMAXPROCS=1 starves the Go scheduler — causing /health latency to spike
  from ~2 ms to >100 ms under 50 concurrent connections. A fixed-size worker
  pool draining a buffered channel keeps /health latency at ≤5 ms regardless
  of GOMAXPROCS, because CPU concurrency is bounded independently of the
  goroutine count.
setup: >-
  Go 1.22 on macOS (Apple Silicon). Three strategies benchmarked with
  wrk -t4 -c50 -d30s. Tested under GOMAXPROCS=1 and GOMAXPROCS=num_cores.
  Worker pool size: 4 goroutines. Bounded channel depth: 20. Per-request
  CSV latency logged to stdout.
implementation: >-
  Three /compute?strategy= branches in main.go: 'goroutine' runs the busy-wait
  directly in the request goroutine, 'workerpool' dispatches to a pre-started
  pool of 4 goroutines via a buffered job channel, and 'bounded' adds a
  queue-depth cap of 20 returning 503 when full. Goroutine ID extracted from
  runtime.Stack() output. Handlers unit-tested via net/http/httptest.
keyFindings:
  - >-
    'goroutine' strategy with GOMAXPROCS=1: /health p99 degrades to >100 ms
    under 50 concurrent compute requests — Go scheduler starvation confirmed.
  - >-
    'goroutine' strategy with GOMAXPROCS=num_cores: /health p99 stays ≤10 ms —
    true parallelism prevents starvation when cores are available.
  - >-
    'workerpool' strategy: /health p99 stays ≤5 ms regardless of GOMAXPROCS
    setting — bounded CPU concurrency keeps the scheduler free.
  - >-
    'bounded' strategy: matches workerpool latency isolation while returning
    503 to excess requests instead of allowing unlimited goroutine queue growth.
limitations:
  - >-
    Benchmark numbers reflect a specific machine; exact latencies vary with
    CPU core count and OS scheduler behaviour.
  - >-
    The 100 ms busy-wait is a synthetic proxy for real CPU work — actual
    workloads show different distribution shapes.
  - >-
    Go's asynchronous preemption (introduced in Go 1.14) can interrupt
    CPU-bound goroutines at safe points, which may reduce starvation severity
    compared to pre-1.14 versions.
githubRepo: >-
  https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines
relatedArticleSlug: golang-goroutines
```

**Body:** Can be empty or minimal — the MDX body for experiments is typically not rendered beyond the metadata page.

---

## Data Models

### Article frontmatter (Zod schema — existing, no changes)

```ts
// articlesCollection schema (src/content/config.ts) — existing
{
  title: z.string().optional(),
  description: z.string(),                    // required
  date: DateSchema,                           // YYYY-MM-DD
  status: z.enum(['draft','published']),       // defaults to 'draft'
  topic: TopicIdSchema,                       // 'backend-engineering'
  tags: z.array(z.string()),                  // ['go','goroutines',...]
  featured: z.boolean().default(false),
  relatedArticles: z.array(z.string()).default([]),
  relatedExperiments: z.array(z.string()).default([]),
  githubUrl: z.string().url().optional()
}
```

### Experiment frontmatter (Zod schema — existing, no changes)

```ts
// experimentsCollection schema (src/content/config.ts) — existing
{
  title: z.string().optional(),
  tagline: z.string(),                        // required
  date: DateSchema,
  status: z.enum(['draft','published']),
  topic: TopicIdSchema,
  hypothesis: z.string(),                     // required
  setup: z.string(),                          // required
  implementation: z.string(),                 // required
  keyFindings: z.array(z.string()),           // required
  limitations: z.array(z.string()).default([]),
  githubRepo: z.string().url(),               // required
  relatedArticleSlug: z.string().optional(),
  interactiveType: z.enum([...]).optional()   // not set for this experiment
}
```

### Go experiment HTTP types

```go
// Request
type ComputeParams struct {
    Strategy string // from query string "strategy"
}

// Success response
type ComputeResponse struct {
    Strategy    string `json:"strategy"`
    DurationMs  int64  `json:"duration_ms"`
    GoroutineID string `json:"goroutine_id"`
}

// Error response
type ErrorResponse struct {
    Error string `json:"error"`
}

// Health response
type HealthResponse struct {
    Status string `json:"status"`
}

// Internal job passing
type jobRequest struct {
    result chan jobResult
}

type jobResult struct {
    durationMs  int64
    goroutineID string
}

// Application state
type AppState struct {
    workerJobs  chan jobRequest
    boundedJobs chan jobRequest
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Article and experiment frontmatter round-trip

*For any* object satisfying the `articlesCollection` or `experimentsCollection` Zod schema shape, serializing it to YAML and parsing it back must produce a deeply equal object, with date fields normalized to `YYYY-MM-DD` string format, booleans preserved as booleans, and arrays preserved as arrays.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 2: Optional frontmatter fields default correctly

*For any* valid article frontmatter object that omits one or more optional fields (`featured`, `relatedArticles`, `relatedExperiments`), parsing it through the `articlesCollection` Zod schema must produce an object where: `featured` is `false`, `relatedArticles` is `[]`, `relatedExperiments` is `[]`, and `status` is `'draft'`. The same must hold for `experimentsCollection` with `limitations` defaulting to `[]`.

**Validates: Requirements 10.5, 10.6**

### Property 3: Date fields survive serialization in canonical format

*For any* valid date representable as a `YYYY-MM-DD` string, writing it to YAML and reading it back must return the same `YYYY-MM-DD` string (not a Date object, not an ISO timestamp with time).

**Validates: Requirements 10.3, 10.4, 1.9**

### Property 4: Valid `/compute` strategy responses always contain required fields

*For any* request to `/compute` with a valid strategy value from `{goroutine, workerpool, bounded}`, the JSON response must contain exactly the fields `strategy`, `duration_ms`, and `goroutine_id`, where `strategy` equals the requested strategy string, `duration_ms` is a non-negative integer, and `goroutine_id` is a non-empty string.

**Validates: Requirements 3.7, 3.8**

### Property 5: Invalid strategy always returns 400 with all valid values listed

*For any* string that is not in `{goroutine, workerpool, bounded}` — including empty string, whitespace-only strings, and arbitrary random strings — sending it as the `strategy` parameter to `/compute` must return HTTP 400 with a JSON body whose `error` field contains all three valid strategy names (`goroutine`, `workerpool`, `bounded`).

**Validates: Requirements 3.10**

### Property 6: Goroutine ID parser round-trips any valid goroutine ID

*For any* non-negative integer goroutine ID N, constructing the canonical Go runtime stack trace header `"goroutine N [running]:\n"` and passing it through the `goroutineID()` parsing function must return the decimal string representation of N.

**Validates: Requirements 3.13**

### Property 7: CSV log lines are always well-formed

*For any* completed request with a known strategy string and a non-negative integer latency, the CSV line written to stdout must be parseable as exactly three comma-separated fields — a non-empty strategy string, a positive integer Unix epoch millisecond timestamp, and a non-negative integer latency in milliseconds — with no header row and no trailing whitespace.

**Validates: Requirements 3.12**

---

## Error Handling

### Go experiment server

**Strategy validation:** Unknown strategy values return HTTP 400 immediately, before any work is dispatched. The error message includes all three valid values so the caller knows what to send.

**Bounded queue full:** When the `bounded` channel is at capacity, the handler does a non-blocking channel send (`select` with a `default` branch) and returns HTTP 503 immediately. It does not block waiting for a slot.

**Worker goroutine panics:** Worker goroutines recover from panics and send an error result back through the per-request result channel rather than crashing the server. The handler surfacing a panic result returns HTTP 500.

**Graceful shutdown:** `main` listens for `SIGINT`/`SIGTERM` and closes the job channels, causing worker goroutines to drain and exit cleanly. In-flight requests complete before shutdown.

### Component and MDX wiring

**Missing island file:** If `GoSchedulerDiagramIsland.astro` is absent, Astro throws a build-time import error — caught before deploy. The fix is deterministic: create the file.

**Missing Keystatic block:** If the block is not registered, Keystatic silently drops the component from the admin-panel editor view but does not break the rendered article. The registration is required for author workflow (Requirement 7.4).

**Schema validation:** Invalid frontmatter is rejected by `astro check` with a Zod validation error identifying the failing field and rule. The article and experiment files are always validated before any deploy.

---

## Testing Strategy

### Go experiment server (unit tests in `main_test.go`)

The server exposes a testable `newRouter(state *AppState) http.Handler` function (following the same pattern as `build_router()` in the Rust server) so tests can call handlers directly via `net/http/httptest` without starting a live server.

**Unit tests:**
- `TestHealthHandler` — GET /health returns 200 with `{"status":"ok"}`
- `TestComputeGoroutineStrategy` — GET /compute?strategy=goroutine returns 200 with correct fields
- `TestComputeWorkerPoolStrategy` — GET /compute?strategy=workerpool returns 200 with correct fields
- `TestComputeBoundedStrategy` — GET /compute?strategy=bounded returns 200 with correct fields
- `TestComputeDefaultStrategy` — GET /compute (no param) defaults to goroutine strategy
- `TestComputeInvalidStrategy` — GET /compute?strategy=invalid returns 400 with all valid values in error message

**Property-based tests** (using [gopter](https://github.com/leanovate/gopter) or [rapid](https://github.com/flyingmutant/rapid)):

- `PropertyGoroutineIDRoundTrip` — *Feature: golang-goroutines-article, Property 6: Goroutine ID parser round-trips any valid goroutine ID* — generates arbitrary non-negative int64, constructs fake stack trace, parses, asserts equality.
- `PropertyInvalidStrategyReturns400` — *Feature: golang-goroutines-article, Property 5: Invalid strategy always returns 400 with all valid values listed* — generates arbitrary strings not in the valid set, asserts 400 + error body contains all three valid strategy names. Minimum 100 iterations.
- `PropertyComputeResponseShape` — *Feature: golang-goroutines-article, Property 4: Valid /compute strategy responses always contain required fields* — iterates over the three valid strategy values (small but exhaustive), asserts response shape. Combined with the round-trip unit test for field values.
- `PropertyCSVLogFormat` — *Feature: golang-goroutines-article, Property 7: CSV log lines are always well-formed* — generates random strategy strings and latency values, formats via the CSV function, asserts the output is parseable as 3 fields with correct types. Minimum 100 iterations.

**Property-based tests** (TypeScript, using [fast-check](https://github.com/dubzzz/fast-check), for frontmatter validation):

- `PropertyFrontmatterRoundTrip` — *Feature: golang-goroutines-article, Property 1: Article and experiment frontmatter round-trip* — generates arbitrary valid article/experiment frontmatter objects, serializes to YAML via `js-yaml`, parses back, asserts deep equality with date normalization. Minimum 100 iterations.
- `PropertyOptionalFieldDefaults` — *Feature: golang-goroutines-article, Property 2: Optional frontmatter fields default correctly* — generates article/experiment objects with random subsets of optional fields omitted, passes through Zod schema, asserts defaults. Minimum 100 iterations.
- `PropertyDateFieldSerialization` — *Feature: golang-goroutines-article, Property 3: Date fields survive serialization in canonical format* — generates dates as strings and Date objects, passes through the DateSchema transformer, asserts `YYYY-MM-DD` output format. Minimum 100 iterations.

**Integration tests (manual / README-driven):**
- Run `go build ./...` — must succeed with no errors.
- Run the server and issue `curl localhost:3000/health` — verify response.
- Run wrk benchmarks per the README for all three strategies under GOMAXPROCS=1 and GOMAXPROCS=num_cores.

### React component (`GoSchedulerDiagram.tsx`)

The component is a pure rendering function with local state. It does not make network requests and has no async behaviour. PBT is not appropriate here (UI rendering). Tests use snapshot testing (Vitest + @testing-library/react):

- Renders without throwing
- Default selected layer is `logical-processor`
- Clicking a layer card updates the inspector content
- All five layers are present in the DOM

### Article and experiment MDX content (example-based)

- `astro check` passes without errors (run in CI)
- Article slug resolves to HTTP 200 at `/writing/golang-goroutines` in local dev
- Experiment slug resolves to HTTP 200 at `/experiments/golang-goroutines` in local dev
- Required frontmatter fields are present and non-empty (checked in the property tests above via Zod validation)
