# Design Document

## Overview

This design covers the full implementation of the **"Rust Under the Hood: Async Tasks, Worker Threads, and Blocking Work"** article and its companion experiment. The deliverable is four distinct artefacts that must work together as a cohesive series entry:

1. `src/content/articles/rust-async-runtime.mdx` — the long-form article
2. `src/content/experiments/rust-tokio-blocking.mdx` — the experiment metadata file
3. `experiments/rust-tokio-blocking/` — the self-contained Rust/Axum project
4. Keystatic registration and an Astro island for `TokioArchitectureDiagram`

The design mirrors the structural patterns of the existing Node.js article, inheriting its narrative template (opening contradiction → mechanism explanation → experiments → decision guide → corrected mental model) while adapting every technical detail to Rust's async model.

---

## Architecture

### Relationship Between Artefacts

```
src/content/articles/rust-async-runtime.mdx
  ↓ frontmatter.relatedExperiments[0]
src/content/experiments/rust-tokio-blocking.mdx
  ↓ frontmatter.githubRepo
experiments/rust-tokio-blocking/
  ├── Cargo.toml
  ├── src/main.rs
  └── README.md

src/pages/writing/[slug].astro
  renders → rust-async-runtime.mdx
  passes components → { TokioArchitectureDiagram: TokioArchitectureDiagramIsland }

src/components/TokioArchitectureDiagram.tsx  (React, client:load)
src/components/TokioArchitectureDiagramIsland.astro  (Astro island wrapper)

keystatic.config.ts
  registers → TokioArchitectureDiagramBlock in articles + experiments components map
```

### Content Rendering Pipeline

Astro reads MDX frontmatter through `src/content/config.ts` (Zod schemas). `article.render()` returns a `Content` component; the `<Content components={...} />` call in `[slug].astro` injects the island components that replace self-closing JSX tags in the MDX body.

---

## Components and Interfaces

### 1. Article MDX File

**Path:** `src/content/articles/rust-async-runtime.mdx`

#### Frontmatter

```yaml
description: >-
  A hands-on journey through Tokio's scheduler, worker threads, and blocking
  thread pool — with reproducible benchmarks showing what happens when a Rust
  server misuses async primitives under load.
date: 2025-01-15
status: draft
topic: backend-engineering
tags:
  - rust
  - tokio
  - async
  - concurrency
  - performance
featured: false
githubUrl: >-
  https://github.com/huyhoang1001/underhood/tree/main/experiments/rust-tokio-blocking
relatedArticles:
  - nodejs-single-threaded
relatedExperiments:
  - rust-tokio-blocking
```

> Note: `title` is omitted from frontmatter — Keystatic uses `slugField: 'title'` and injects it at the collection level, consistent with the existing `nodejs-single-threaded.mdx` which also omits the `title` field from its own frontmatter block.

#### Full Section Outline

```
[Opening prose — contradiction hook]
<TokioArchitectureDiagram />
---
## Does Rust Have an Event Loop?
  ### The Language Layer: async/await as Zero-Cost Syntax
  ### The Runtime Layer: Tokio as the Executor
## Part 1: Tokio's Internal Architecture
  ### Worker Threads
  ### Per-Thread Task Queues and Work Stealing
  ### The I/O Driver
  ### The Poll Model and Wakers
  [Mermaid: Tokio Architecture Diagram]
## Part 2: Scheduler Starvation Under Load
  [Code: blocking CPU handler]
  [Benchmark results table: blocking strategy]
  ⚠ Warning callout
## Part 3: spawn_blocking and the Blocking Thread Pool
  [Code: spawn_blocking handler]
  [Code: bounded semaphore handler]
  [Comparison table: blocking vs spawn_blocking]
## Part 4: Tokio vs. Node.js — A Precise Comparison
  [Code: side-by-side Node.js pbkdf2 vs Rust spawn_blocking]
  [Comparison table across four dimensions]
## Part 5: Benchmark Results
  [Full benchmark results table: all three strategies]
  [Mermaid: Request execution timeline with .await suspension points]
## Part 6: The Production Decision Guide
  [Mermaid: decision flowchart]
## Conclusion: The Corrected Mental Model
```

#### Opening Prose (Hook)

The article opens with the observable contradiction pattern used in the Node.js article: inspecting a running Axum server and showing that under load with `strategy=blocking`, `/health` p99 latency degrades from 2 ms to 300+ ms despite the fact that `/health` itself does no blocking work. This is the "single contradiction within the first two paragraphs" required by Requirement 9.1.

The second paragraph frames the central question the article resolves: *"Why does a pure async Rust server become unresponsive when one endpoint blocks?"*

#### Warning Callout Placement

The warning callout appears at the end of Part 2 (Scheduler Starvation), after the benchmark results have established the problem empirically. Format matches the Node.js article's blockquote-with-bold style:

```markdown
> **⚠ Warning: `spawn_blocking` Is Not Free**
>
> Calling `tokio::task::spawn_blocking` on every incoming request is not safe
> either. Each call consumes a thread from Tokio's blocking thread pool (default
> ceiling: 512 threads). If the pool is exhausted, `spawn_blocking` itself will
> block the calling async task while waiting for a thread to become free.
> The bounded strategy with `tokio::sync::Semaphore` shown in Part 3 is the
> correct production pattern for high-concurrency workloads.
```

#### Diagram Specifications

**Diagram 1 — Tokio Architecture (Mermaid flowchart)**
Placed at the top of "Part 1: Tokio's Internal Architecture". Five labelled elements: async tasks, worker threads, I/O driver, blocking thread pool, OS threads. Rendered using Mermaid `graph TD`.

```
Async Tasks (Futures)
    ↓ tokio::spawn
Worker Thread 1..N (work-stealing scheduler)
    ↓ poll()           ↓ spawn_blocking
I/O Driver (epoll/kqueue)   Blocking Thread Pool (up to 512)
    ↓                            ↓
OS Kernel sockets          OS Threads (CPU/sync I/O work)
```

**Diagram 2 — Request Execution Timeline (Mermaid sequence diagram)**
Placed in Part 5. Shows a single HTTP request from arrival through `.await` suspension, Waker notification, and final response. Labels `.await yield` and `Waker::wake()` as explicit stages.

**Diagram 3 — Blocking vs spawn_blocking Comparison (Markdown table)**
Placed in Part 3. Two rows (direct async handler, spawn_blocking), columns: event-loop blocking behaviour, per-request latency impact, worker threads consumed, recommended use case.

**Diagram 4 — Decision Flowchart (Mermaid flowchart)**
Placed in Part 6. Three branches from "What type of work?": I/O-bound → `async`/`.await`, CPU-bound/blocking >100µs → `spawn_blocking`, sustained parallelism → `std::thread` / `rayon`.

#### Code Snippet Plan

| Snippet | Location | Purpose |
|---|---|---|
| `htop`-style thread listing of a running Tokio server | Opening | Establish contradiction (multiple OS threads visible) |
| Axum handler with direct CPU loop (no spawn_blocking) | Part 2 | Show starvation cause |
| `tokio::task::spawn_blocking` handler | Part 3 | Correct pattern |
| Bounded semaphore with `spawn_blocking` | Part 3 | Production pattern |
| Node.js `crypto.pbkdf2` callback | Part 4 | Comparison left column |
| Rust `spawn_blocking` with equivalent work | Part 4 | Comparison right column |
| Startup log snippet showing worker/blocking thread counts | Part 1 | Ground the architecture discussion |

All Rust snippets must correspond exactly to code in `experiments/rust-tokio-blocking/src/main.rs`.

---

### 2. Experiment MDX Metadata File

**Path:** `src/content/experiments/rust-tokio-blocking.mdx`

#### Frontmatter (all required fields)

```yaml
tagline: >-
  Measuring Tokio scheduler starvation: what happens to /health latency
  when async worker threads are occupied with blocking CPU work.
date: 2025-01-15
status: draft
topic: backend-engineering
hypothesis: >-
  When a CPU-bound synchronous computation runs directly inside an Axum async
  handler, it occupies a Tokio worker thread for the full duration of the
  computation. Because Tokio's default worker thread count equals the number
  of logical CPU cores (typically 8-16), saturating all worker threads with
  100 ms blocking tasks will prevent the scheduler from polling other async
  tasks, causing /health endpoint latency to degrade from ~2 ms to hundreds
  of milliseconds — demonstrating that "async" does not automatically mean
  "non-blocking".
setup: >-
  An Axum server running on a machine with 8 logical CPU cores (Tokio default:
  8 worker threads). Load tests use wrk with 50 concurrent connections for 30
  seconds against the /compute endpoint while simultaneously probing /health
  at 10 req/s to measure latency impact on unrelated async work.
implementation: >-
  Three /compute handler strategies implemented in Rust: (1) blocking — runs a
  100 ms busy-wait loop directly on the async worker thread; (2) spawn_blocking
  — offloads the same loop via tokio::task::spawn_blocking to the blocking
  thread pool; (3) bounded — same as spawn_blocking but with a
  tokio::sync::Semaphore capping concurrency at 4, returning 503 after a 30s
  queue wait. All strategies return JSON with strategy name, duration_ms, and
  thread_id for observability.
keyFindings:
  - >-
    Under 50 concurrent blocking requests, /health p99 latency degrades from
    ~2 ms to >300 ms when strategy=blocking saturates all Tokio worker threads,
    confirming async worker thread starvation.
  - >-
    strategy=spawn_blocking keeps /health p99 latency at or below 5 ms under
    the same load, because blocking work is offloaded to Tokio's separate
    blocking thread pool, leaving worker threads free to poll async tasks.
  - >-
    strategy=bounded with Semaphore(4) limits blocking pool pressure to 4
    concurrent tasks, maintains /health p99 below 5 ms, and returns 503 to
    excess requests rather than allowing unbounded thread pool growth.
limitations:
  - >-
    Benchmark results are machine-specific: thread counts and latency values
    will differ on hardware with fewer than 8 logical CPU cores or on
    Windows/macOS where Tokio's I/O driver differs from Linux epoll.
  - >-
    The 100 ms busy-wait loop is a synthetic workload; real CPU-bound work
    (cryptography, image processing, compression) will show similar patterns
    but with different absolute latency values.
githubRepo: >-
  https://github.com/huyhoang1001/underhood/tree/main/experiments/rust-tokio-blocking
relatedArticleSlug: rust-async-runtime
```

> Note: `interactiveType` is omitted — the enum in the schema only accepts `node-threadpool | queue-backpressure | grpc-multiplex | cache-invalidation`, none of which apply to this Rust experiment. Omitting optional fields is valid per the schema.

---

### 3. Rust Experiment Project

**Path:** `experiments/rust-tokio-blocking/`

#### Directory Structure

```
experiments/rust-tokio-blocking/
├── Cargo.toml
├── Cargo.lock          (committed for reproducibility)
├── README.md
└── src/
    └── main.rs
```

#### `Cargo.toml`

```toml
[package]
name = "rust-tokio-blocking"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "rust-tokio-blocking"
path = "src/main.rs"

[dependencies]
axum = { version = "0.7.9", features = [] }
tokio = { version = "1.42.0", features = ["full"] }
serde = { version = "1.0.217", features = ["derive"] }
serde_json = { version = "1.0.134" }
tower = { version = "0.5.2" }

[profile.release]
opt-level = 3
```

Exact version pins are used throughout. `tokio = { features = ["full"] }` enables `rt-multi-thread`, `sync`, `time`, and `macros` in one declaration, which keeps the Cargo.toml minimal.

#### `src/main.rs` Structure

```rust
// Module-level structure:
// 1. Imports (axum, tokio, serde, std)
// 2. Response type definitions
// 3. main() — runtime init + router setup + startup logging + serve
// 4. health_handler()
// 5. compute_handler()
// 6. run_blocking_work() — shared busy-wait logic

use axum::{extract::Query, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;

// --- Types ---

#[derive(Deserialize)]
struct ComputeParams {
    strategy: Option<String>,
}

#[derive(Serialize)]
struct ComputeResponse {
    strategy: String,
    duration_ms: u64,
    thread_id: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

// Shared state threaded through Axum's State extractor
struct AppState {
    semaphore: Semaphore,
}

// --- main ---

#[tokio::main]
async fn main() {
    // Log worker thread count and blocking thread count before accepting connections
    // Worker thread count: tokio defaults to num_cpus::get()
    // Blocking thread count: reported as max from TOKIO_BLOCKING_THREADS or 512 default
    let worker_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    println!("Tokio worker threads  : {}", worker_threads);
    println!("Tokio blocking threads: up to 512 (Tokio default ceiling)");
    println!("Listening on http://0.0.0.0:3000");

    let state = Arc::new(AppState {
        semaphore: Semaphore::new(4),
    });

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/compute", get(compute_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// --- Handlers ---

async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn compute_handler(
    Query(params): Query<ComputeParams>,
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Result<Json<ComputeResponse>, (axum::http::StatusCode, Json<ErrorResponse>)> {
    let strategy = params.strategy.as_deref().unwrap_or("blocking");

    match strategy {
        "blocking" => {
            // Runs busy-wait directly on the async worker thread — starves the scheduler
            let start = Instant::now();
            let thread_id = format!("{:?}", std::thread::current().id());
            run_blocking_work();
            let duration_ms = start.elapsed().as_millis() as u64;
            println!("blocking,{},{}", current_timestamp_ms(), duration_ms);
            Ok(Json(ComputeResponse {
                strategy: "blocking".into(),
                duration_ms,
                thread_id,
            }))
        }
        "spawn_blocking" => {
            // Offloads to Tokio's blocking thread pool — worker threads stay free
            let start = Instant::now();
            let (duration_ms, thread_id) = tokio::task::spawn_blocking(|| {
                let inner_start = Instant::now();
                let tid = format!("{:?}", std::thread::current().id());
                run_blocking_work();
                (inner_start.elapsed().as_millis() as u64, tid)
            })
            .await
            .unwrap();
            let wall_ms = start.elapsed().as_millis() as u64;
            println!("spawn_blocking,{},{}", current_timestamp_ms(), wall_ms);
            Ok(Json(ComputeResponse {
                strategy: "spawn_blocking".into(),
                duration_ms,
                thread_id,
            }))
        }
        "bounded" => {
            // Like spawn_blocking but gated by a semaphore(4) — returns 503 on timeout
            let permit = tokio::time::timeout(
                Duration::from_secs(30),
                state.semaphore.acquire(),
            )
            .await;

            let permit = match permit {
                Ok(Ok(p)) => p,
                _ => {
                    return Err((
                        axum::http::StatusCode::SERVICE_UNAVAILABLE,
                        Json(ErrorResponse {
                            error: "Server overloaded: semaphore permit not acquired within 30s"
                                .into(),
                        }),
                    ));
                }
            };

            let start = Instant::now();
            let (duration_ms, thread_id) = tokio::task::spawn_blocking(|| {
                let inner_start = Instant::now();
                let tid = format!("{:?}", std::thread::current().id());
                run_blocking_work();
                (inner_start.elapsed().as_millis() as u64, tid)
            })
            .await
            .unwrap();
            drop(permit); // release semaphore after blocking work completes
            let wall_ms = start.elapsed().as_millis() as u64;
            println!("bounded,{},{}", current_timestamp_ms(), wall_ms);
            Ok(Json(ComputeResponse {
                strategy: "bounded".into(),
                duration_ms,
                thread_id,
            }))
        }
        other => Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!(
                    "Unknown strategy '{}'. Valid values: blocking, spawn_blocking, bounded",
                    other
                ),
            }),
        )),
    }
}

// --- Shared busy-wait ---

fn run_blocking_work() {
    // Synthetic CPU-bound work: busy-wait for ~100ms
    // Uses a volatile-read trick to prevent compiler optimisation
    let deadline = Instant::now() + Duration::from_millis(100);
    let mut _x: u64 = 0;
    while Instant::now() < deadline {
        _x = _x.wrapping_add(1);
    }
}

fn current_timestamp_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
```

#### JSON Response Shapes

**Success (`/compute`):**
```json
{
  "strategy": "spawn_blocking",
  "duration_ms": 102,
  "thread_id": "ThreadId(14)"
}
```

**Health (`/health`):**
```json
{ "status": "ok" }
```

**Error — 400:**
```json
{
  "error": "Unknown strategy 'invalid'. Valid values: blocking, spawn_blocking, bounded"
}
```

**Error — 503:**
```json
{
  "error": "Server overloaded: semaphore permit not acquired within 30s"
}
```

#### `README.md` Structure

```markdown
# Rust Tokio Blocking Experiment

Companion to: "Rust Under the Hood: Async Tasks, Worker Threads, and Blocking Work"

## Prerequisites
- Rust 1.75+ (Stable), cargo
- wrk (HTTP benchmarking tool): https://github.com/wg/wrk
- curl

## Build and Run
cargo build --release
cargo run --release

## Endpoints
- GET /health           → 200 {"status":"ok"}
- GET /compute?strategy=blocking
- GET /compute?strategy=spawn_blocking
- GET /compute?strategy=bounded
- GET /compute?strategy=INVALID → 400

## Benchmark Commands (50 concurrent connections, 30 seconds)

### Strategy: blocking (demonstrates starvation)
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=blocking

### Strategy: spawn_blocking (isolates blocking thread pool)
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=spawn_blocking

### Strategy: bounded (enforces max 4 concurrent blocking tasks)
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=bounded

## Measuring /health Impact During Load
# Terminal 1: run the starvation load
wrk -t4 -c50 -d30s http://localhost:3000/compute?strategy=blocking

# Terminal 2: probe health endpoint concurrently
wrk -t1 -c1 -d30s http://localhost:3000/health

## Expected Outcomes
| Strategy        | /health p99 latency | /compute throughput | Error rate |
|---|---|---|---|
| blocking        | > 100 ms             | ~8 req/s            | ~0%        |
| spawn_blocking  | ≤ 5 ms               | ~8 req/s            | ~0%        |
| bounded         | ≤ 5 ms               | ~4 req/s            | ~0% (503s counted separately) |

## Per-request Latency Log
stdout lines follow the format: strategy,timestamp_ms,duration_ms
```

---

### 4. Keystatic and Rendering Integration

#### Decision: Static ASCII/Mermaid vs. Interactive React Component

The requirements (Req 5.5) specify that if a custom MDX component is registered, the article must reference it using the same self-closing JSX pattern as `<NodeProcessDiagram />`. Requirement 7.4 requires that if a new component is added, it must be registered in `keystatic.config.ts` as a `block` entry and an Astro island must exist in `src/components/`.

**Decision:** Implement `TokioArchitectureDiagram` as a static interactive React component (matching the depth of `NodeProcessDiagram`). This provides visual richness, is consistent with the existing component style, and fulfills Req 7.4. The Mermaid diagrams remain in MDX for the timeline and decision flowchart (simpler diagrams that do not need interactivity).

#### `TokioArchitectureDiagram.tsx`

Modelled exactly after `NodeProcessDiagram.tsx`. Five clickable layer cards:

| Layer | Title | Thread Context |
|---|---|---|
| 01 | Async Task (Future) | No thread — polled on demand |
| 02 | Tokio Worker Thread | N threads (default: num_cpus) |
| 03 | I/O Driver (epoll/kqueue) | Worker thread (non-blocking poll) |
| 04 | Blocking Thread Pool | Up to 512 OS threads |
| 05 | Work Stealing Scheduler | All worker threads share |

Each card has: title, subtitle, thread context, list of typical operations, blocking risk label, description prose, and a representative Rust code snippet.

#### `TokioArchitectureDiagramIsland.astro`

```astro
---
import { TokioArchitectureDiagram } from './TokioArchitectureDiagram';
---
<TokioArchitectureDiagram client:load />
```

Pattern is identical to `NodeProcessDiagramIsland.astro`.

#### `keystatic.config.ts` Changes

Add a new block definition alongside the existing three:

```typescript
const TokioArchitectureDiagramBlock = block({
  label: 'Tokio Architecture Diagram',
  schema: {}
});
```

Add it to both the `articles` and `experiments` collection `content` field components maps:

```typescript
content: fields.mdx({
  label: 'Content',
  components: {
    NodeProcessDiagram: NodeProcessDiagramBlock,
    NodeThreadpoolVisualizer: NodeThreadpoolVisualizerBlock,
    ThreadPoolVisualizer: ThreadPoolVisualizerBlock,
    TokioArchitectureDiagram: TokioArchitectureDiagramBlock,  // NEW
  }
})
```

#### `src/pages/writing/[slug].astro` Changes

Add import and pass to `Content`:

```typescript
import TokioArchitectureDiagramIsland from '../../components/TokioArchitectureDiagramIsland.astro';

// In the Content call:
<Content components={{
  NodeProcessDiagram: NodeProcessDiagramIsland,
  NodeThreadpoolVisualizer: NodeThreadpoolVisualizerIsland,
  ThreadPoolVisualizer: NodeThreadpoolVisualizerIsland,
  TokioArchitectureDiagram: TokioArchitectureDiagramIsland,  // NEW
}} />
```

---

## Data Models

### Article Frontmatter — Zod Validation Map

The `articlesCollection` schema in `src/content/config.ts` validates:

| Field | Type | Value |
|---|---|---|
| `description` | `string` | Non-empty, multi-line |
| `date` | `DateSchema` (string \| Date → YYYY-MM-DD) | `2025-01-15` |
| `status` | `'draft' \| 'published'` | `draft` |
| `topic` | `TopicIdSchema` enum | `backend-engineering` |
| `tags` | `string[]` | `[rust, tokio, async, concurrency, performance]` |
| `featured` | `boolean` default `false` | `false` |
| `relatedArticles` | `string[]` default `[]` | `[nodejs-single-threaded]` |
| `relatedExperiments` | `string[]` default `[]` | `[rust-tokio-blocking]` |
| `githubUrl` | `string.url()` optional | Full GitHub tree URL |

### Experiment Frontmatter — Zod Validation Map

The `experimentsCollection` schema validates:

| Field | Type | Required |
|---|---|---|
| `tagline` | `string` | ✓ |
| `date` | `DateSchema` | ✓ |
| `status` | `'draft' \| 'published'` default `draft` | ✓ |
| `topic` | `TopicIdSchema` enum | ✓ |
| `hypothesis` | `string` | ✓ |
| `setup` | `string` | ✓ |
| `implementation` | `string` | ✓ |
| `keyFindings` | `string[]` | ✓ (min 3 entries) |
| `limitations` | `string[]` default `[]` | optional |
| `githubRepo` | `string.url()` | ✓ |
| `relatedArticleSlug` | `string` optional | optional |
| `interactiveType` | enum optional | omitted |

### Rust JSON Response Shapes (TypeScript-equivalent types)

```typescript
// Success
interface ComputeResponse {
  strategy: "blocking" | "spawn_blocking" | "bounded";
  duration_ms: number;    // u64 in Rust, serialised as JSON number
  thread_id: string;      // "ThreadId(N)"
}
// Health
interface HealthResponse { status: "ok" }
// Error
interface ErrorResponse  { error: string }
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid strategy always returns required response shape

*For any* request to `/compute` with a `strategy` query parameter set to one of `"blocking"`, `"spawn_blocking"`, or `"bounded"` (or with `strategy` omitted), the server SHALL return a `200 OK` response whose JSON body contains all three fields: `strategy` (a string equal to the requested strategy), `duration_ms` (a non-negative integer), and `thread_id` (a non-empty string).

**Validates: Requirements 3.5, 3.6, 3.7, 3.8**

---

### Property 2: Invalid strategy always returns 400 with error message

*For any* string value supplied as the `strategy` query parameter that is not one of `"blocking"`, `"spawn_blocking"`, or `"bounded"`, the server SHALL return a `400 Bad Request` response whose JSON body contains an `error` field listing the valid strategy values.

**Validates: Requirements 3.9**

---

### Property 3: Bounded strategy never exceeds 4 concurrent blocking tasks

*For any* number of simultaneous requests sent to `/compute?strategy=bounded`, at no point in time shall more than 4 requests be executing the blocking work concurrently — all excess requests MUST be queued by the semaphore and served in arrival order.

**Validates: Requirements 3.8, 3.11**

---

### Property 4: Article frontmatter survives a YAML round-trip

*For any* valid article frontmatter object satisfying the `articlesCollection` Zod schema, serialising that object to YAML and re-parsing it SHALL produce a deeply equal object, with date fields normalised to `YYYY-MM-DD` string format, booleans preserved as booleans, and arrays preserved as arrays with the same element values and order.

**Validates: Requirements 10.1, 10.3**

---

### Property 5: Experiment frontmatter survives a YAML round-trip

*For any* valid experiment frontmatter object satisfying the `experimentsCollection` Zod schema, serialising that object to YAML and re-parsing it SHALL produce a deeply equal object, with date fields normalised to `YYYY-MM-DD` string format, booleans preserved as booleans, and arrays preserved as arrays with the same element values and order.

**Validates: Requirements 10.2, 10.4**

---

### Property 6: Schema defaults are applied for omitted optional fields

*For any* article or experiment frontmatter object from which one or more optional fields (`featured`, `relatedArticles`, `relatedExperiments`, `limitations`) are omitted, the Zod schema SHALL apply the documented default value for each omitted field — `false` for `featured`, `[]` for `relatedArticles`, `[]` for `relatedExperiments`, and `[]` for `limitations` — without throwing a validation error.

**Validates: Requirements 10.5, 10.6**

---

## Error Handling

### Rust Experiment — Error Conditions

| Condition | HTTP Status | Response Body |
|---|---|---|
| `strategy` param is an unrecognised string | 400 Bad Request | `{"error": "Unknown strategy '...'. Valid values: blocking, spawn_blocking, bounded"}` |
| Semaphore not acquired within 30s (`bounded`) | 503 Service Unavailable | `{"error": "Server overloaded: semaphore permit not acquired within 30s"}` |
| Server fails to bind port 3000 | Process exits with panic + stderr | — |
| `spawn_blocking` task panics | 500 (Axum default InternalServerError) | Axum default error body |

### Axum Error Response Consistency

Both error paths return `(StatusCode, Json<ErrorResponse>)` from the handler, which Axum serialises directly. The `ErrorResponse` struct implements `Serialize` so the JSON shape is guaranteed at compile time.

### Semaphore Acquire Pattern

`tokio::time::timeout(Duration::from_secs(30), semaphore.acquire())` is the correct async pattern. The outer `timeout` future races the acquire future; if acquire wins, the permit is held until `drop(permit)` after the blocking work completes. This ensures the semaphore count is always decremented, even if the `spawn_blocking` task panics (the `drop` runs in the outer async context after the `await`).

### MDX / Astro Error Handling

- If the `TokioArchitectureDiagramIsland` component fails to hydrate, Astro's island architecture degrades gracefully — the SSR-rendered placeholder is served and the client JS error is isolated.
- Frontmatter validation errors from Zod surface at build time via `astro check`, not at runtime.

---

## Testing Strategy

### Unit Tests (Rust)

Located in `src/main.rs` under `#[cfg(test)]`. Use `axum::test` (axum's built-in `TestClient` from `axum-test`) or the standard `tower::ServiceExt::oneshot` pattern.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::{Request, StatusCode}};
    use tower::ServiceExt;

    // Example test: health endpoint
    #[tokio::test]
    async fn health_returns_200() {
        let app = build_router(); // extract router building to a testable function
        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // Example test: unknown strategy returns 400
    #[tokio::test]
    async fn unknown_strategy_returns_400() {
        let app = build_router();
        let response = app
            .oneshot(Request::builder().uri("/compute?strategy=invalid").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
```

### Property-Based Tests (Rust — `proptest`)

Use the [`proptest`](https://crates.io/crates/proptest) crate (version `1.5.0`), the standard choice for property-based testing in Rust. Add to `Cargo.toml`:

```toml
[dev-dependencies]
proptest = { version = "1.5.0" }
```

**Property 1 — Valid strategy always returns 200 with required fields:**

```rust
// Feature: rust-async-runtime-article, Property 1: valid strategy returns required response shape
proptest! {
    #[test]
    fn valid_strategy_returns_200(
        strategy in prop::sample::select(vec!["blocking", "spawn_blocking", "bounded"])
    ) {
        // Using tokio::test with proptest requires the proptest-tokio or manual runtime setup
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let app = build_router();
            let uri = format!("/compute?strategy={}", strategy);
            let response = app
                .oneshot(Request::builder().uri(&uri).body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
            let body = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
            let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
            assert!(json["strategy"].is_string());
            assert!(json["duration_ms"].is_number());
            assert!(json["thread_id"].is_string());
            assert!(!json["thread_id"].as_str().unwrap().is_empty());
        });
    }
}
```

**Property 2 — Invalid strategy always returns 400:**

```rust
// Feature: rust-async-runtime-article, Property 2: invalid strategy returns 400 with error message
proptest! {
    #[test]
    fn invalid_strategy_returns_400(
        strategy in "[a-z]{1,20}".prop_filter("not a valid strategy", |s| {
            s != "blocking" && s != "spawn_blocking" && s != "bounded"
        })
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let app = build_router();
            let uri = format!("/compute?strategy={}", strategy);
            let response = app
                .oneshot(Request::builder().uri(&uri).body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            let body = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
            let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
            assert!(json["error"].is_string());
            let error_msg = json["error"].as_str().unwrap();
            // Error message must name the valid values
            assert!(error_msg.contains("blocking"));
            assert!(error_msg.contains("spawn_blocking"));
            assert!(error_msg.contains("bounded"));
        });
    }
}
```

**Property 4 & 5 — Frontmatter YAML round-trip** (TypeScript/Node.js, using `fast-check`):

These properties operate at the TypeScript level and test the blog's content schema, not the Rust binary. They belong in a separate test file in the blog project:

```typescript
// test/frontmatter-roundtrip.test.ts
// Feature: rust-async-runtime-article, Property 4: article frontmatter survives YAML round-trip
// Feature: rust-async-runtime-article, Property 5: experiment frontmatter survives YAML round-trip
// Feature: rust-async-runtime-article, Property 6: schema defaults applied for omitted optional fields

import * as fc from 'fast-check';
import * as yaml from 'js-yaml';
import { articlesCollection, experimentsCollection } from '../src/content/config';

// Article frontmatter arbitrary
const articleFrontmatterArb = fc.record({
  description: fc.string({ minLength: 1 }),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
         .map(d => d.toISOString().slice(0, 10)),
  status: fc.constantFrom('draft', 'published'),
  topic: fc.constantFrom('distributed-systems', 'backend-engineering', 'performance',
                         'system-design', 'cloud-infrastructure', 'engineering-experiments',
                         'lessons-learned'),
  tags: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
  featured: fc.boolean(),
  relatedArticles: fc.array(fc.string({ minLength: 1 })),
  relatedExperiments: fc.array(fc.string({ minLength: 1 })),
});

test('article frontmatter round-trip', () => {
  fc.assert(
    fc.property(articleFrontmatterArb, (frontmatter) => {
      const yamlStr = yaml.dump(frontmatter);
      const parsed = yaml.load(yamlStr);
      const result = articlesCollection.schema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(frontmatter.description);
        expect(result.data.date).toBe(frontmatter.date);
        expect(result.data.tags).toEqual(frontmatter.tags);
      }
    }),
    { numRuns: 100 }
  );
});

test('schema defaults applied for omitted optional fields', () => {
  fc.assert(
    fc.property(
      fc.record({
        description: fc.string({ minLength: 1 }),
        date: fc.constant('2025-01-15'),
        status: fc.constant('draft' as const),
        topic: fc.constant('backend-engineering' as const),
        tags: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
      }),
      (minimal) => {
        const result = articlesCollection.schema.safeParse(minimal);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.featured).toBe(false);
          expect(result.data.relatedArticles).toEqual([]);
          expect(result.data.relatedExperiments).toEqual([]);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

Property-based testing library choices:
- **Rust:** `proptest` v1.5.0 — idiomatic Rust PBT with composable strategy combinators
- **TypeScript:** `fast-check` — the standard PBT library for the JavaScript ecosystem, consistent with the Astro/TypeScript stack

Each property test runs a minimum of 100 iterations (proptest default is 256; fast-check default is 100).

### Integration Tests

| Test | Mechanism | Trigger |
|---|---|---|
| `astro check` passes on new MDX files | `npx astro check` in CI | On every PR |
| `/health` returns 200 and `{"status":"ok"}` | `curl` in README smoke test | Manual before publish |
| `/compute?strategy=blocking` starvation is observable | `wrk` benchmark | Manual before publish |
| All benchmark commands in README execute without error | Manual run | Manual before publish |

### Property 3 — Bounded semaphore concurrency (integration test)

Property 3 (never >4 concurrent) is a concurrency invariant best verified by an integration test rather than a pure unit property test, because observing concurrent execution requires actual OS thread scheduling. The test approach:

1. Start the server
2. Fire 10 concurrent requests to `/compute?strategy=bounded`
3. Each request returns `thread_id` in its response
4. At any snapshot in time, the number of distinct `thread_id`s actively in the blocking work section must not exceed 4

This can be approximated by verifying that the total wall-clock time for 10 requests of 100 ms each with 4-concurrency ceiling is at least `ceil(10/4) * 100ms = 300ms`, not `10 * 100ms = 1000ms` (purely sequential) and not `100ms` (unlimited concurrent).
