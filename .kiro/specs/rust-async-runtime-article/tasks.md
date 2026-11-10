# Implementation Plan: Rust Under the Hood — Async Tasks, Worker Threads, and Blocking Work

## Overview

Implement the full deliverable set for the Rust async runtime article: a self-contained Rust/Axum experiment project, an interactive React diagram component, Keystatic and Astro page wiring, an experiment MDX metadata file, and the long-form article MDX file. Tasks are ordered so each step produces a testable artefact before the next layer depends on it.

## Tasks

- [x] 1. Create the Rust experiment project skeleton
  - [x] 1.1 Scaffold `experiments/rust-tokio-blocking/` with `Cargo.toml` and empty `src/main.rs`
    - Create `experiments/rust-tokio-blocking/Cargo.toml` using the exact dependency versions from the design: `axum = "0.7.9"`, `tokio = "1.42.0"` (features = ["full"]), `serde = "1.0.217"` (features = ["derive"]), `serde_json = "1.0.134"`, `tower = "0.5.2"`
    - Add `[dev-dependencies]` block: `proptest = "1.5.0"`
    - Add `[profile.release]` with `opt-level = 3`
    - Create `src/main.rs` with a minimal `fn main() {}` placeholder so `cargo build` can confirm the scaffold compiles
    - _Requirements: 3.1, 3.2_

  - [ ]* 1.2 Verify scaffold compiles
    - Run `cargo build --release` in `experiments/rust-tokio-blocking/`; confirm exit code 0
    - _Requirements: 3.2_

- [x] 2. Implement `src/main.rs` — types, router, and all three strategies
  - [x] 2.1 Define response types and `AppState`
    - Add `ComputeParams`, `ComputeResponse`, `HealthResponse`, `ErrorResponse` structs with `Serialize`/`Deserialize` derives
    - Add `AppState { semaphore: Semaphore }` struct
    - _Requirements: 3.5, 3.6, 3.7, 3.8_

  - [x] 2.2 Implement `main()` with startup logging and router setup
    - Use `std::thread::available_parallelism()` to log the worker thread count before `axum::serve`
    - Log `"Tokio blocking threads: up to 512 (Tokio default ceiling)"` to stdout
    - Build the router with `/health` and `/compute` routes; wire in `Arc<AppState>` via `.with_state()`
    - _Requirements: 3.3, 3.10_

  - [x] 2.3 Implement `health_handler()`
    - Return `Json(HealthResponse { status: "ok" })` with implicit 200 status
    - _Requirements: 3.4_

  - [x] 2.4 Implement `compute_handler()` — `blocking` strategy branch
    - Run `run_blocking_work()` directly on the calling async worker thread (no `spawn_blocking`)
    - Capture `thread_id` via `std::thread::current().id()`, record wall-clock `duration_ms`, print CSV log line `blocking,{timestamp_ms},{duration_ms}`
    - Return `Json(ComputeResponse { strategy, duration_ms, thread_id })`
    - _Requirements: 3.5, 3.6, 4.5_

  - [x] 2.5 Implement `compute_handler()` — `spawn_blocking` strategy branch
    - Offload `run_blocking_work()` via `tokio::task::spawn_blocking`; capture `thread_id` and `duration_ms` inside the closure
    - Print CSV log line `spawn_blocking,{timestamp_ms},{wall_ms}` after `.await`
    - Return `Json(ComputeResponse { strategy, duration_ms, thread_id })`
    - _Requirements: 3.5, 3.7, 4.5_

  - [x] 2.6 Implement `compute_handler()` — `bounded` strategy branch
    - Acquire a permit from `Arc<AppState>.semaphore` with `tokio::time::timeout(Duration::from_secs(30), semaphore.acquire())`
    - Return `503 Service Unavailable` with `Json(ErrorResponse { error: ... })` if timeout fires
    - On successful acquire, offload work via `spawn_blocking`; `drop(permit)` after `.await` completes
    - Print CSV log line `bounded,{timestamp_ms},{wall_ms}`
    - _Requirements: 3.5, 3.8, 3.11, 3.12, 4.5_

  - [x] 2.7 Implement `compute_handler()` — unknown strategy branch and `run_blocking_work()`
    - Return `400 Bad Request` with `Json(ErrorResponse { error: "Unknown strategy '...'. Valid values: blocking, spawn_blocking, bounded" })` for unrecognised `strategy` values
    - Implement `run_blocking_work()` as a 100 ms busy-wait loop using `Instant::now() + Duration::from_millis(100)` with a `wrapping_add` counter to prevent compiler optimisation
    - Implement `current_timestamp_ms()` helper using `SystemTime::now()`
    - _Requirements: 3.9_

  - [x] 2.8 Extract `build_router()` helper function for testability
    - Refactor `main()` to call `build_router()` which returns a `Router`; this enables `tower::ServiceExt::oneshot` calls in tests without binding a real port
    - _Requirements: 3.1 (testability prerequisite)_

- [x] 3. Checkpoint — Compile, lint, and format the Rust project
  - Run `cargo build --release`, `cargo clippy -- -D warnings`, and `cargo fmt --check` in `experiments/rust-tokio-blocking/`; fix any issues before proceeding.

- [x] 4. Write Rust unit and property tests in `src/main.rs`
  - [x] 4.1 Write unit tests for `health_handler` and known-good strategies
    - Add `#[cfg(test)] mod tests` block; use `tower::ServiceExt::oneshot` with `axum::body::Body` and `axum::http::Request`
    - Test: `GET /health` → 200, body `{"status":"ok"}`
    - Test: `GET /compute?strategy=blocking` → 200, JSON body has `strategy`, `duration_ms` ≥ 0, non-empty `thread_id`
    - Test: `GET /compute?strategy=spawn_blocking` → 200, same shape assertions
    - Test: `GET /compute?strategy=bounded` → 200, same shape assertions
    - Test: `GET /compute` (no param) → 200, `strategy` field equals `"blocking"` (default)
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 4.2 Write unit test for unknown strategy → 400
    - Test: `GET /compute?strategy=invalid` → 400, JSON body has `error` field listing all three valid strategies
    - _Requirements: 3.9_

  - [ ]* 4.3 Write property test — Property 1: valid strategy always returns 200 with required fields
    - Use `proptest::prop::sample::select(vec!["blocking", "spawn_blocking", "bounded"])` strategy
    - Create a fresh `tokio::runtime::Runtime` per test iteration; call `build_router().oneshot(...)` inside `rt.block_on`
    - Assert: status == 200, `json["strategy"]` is string, `json["duration_ms"]` is non-negative number, `json["thread_id"]` is non-empty string
    - **Property 1: Valid strategy always returns required response shape**
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.8**

  - [ ]* 4.4 Write property test — Property 2: invalid strategy always returns 400 with error message
    - Use `proptest` strategy `"[a-z]{1,20}".prop_filter(...)` to exclude the three valid values
    - Assert: status == 400, `json["error"]` is a string containing `"blocking"`, `"spawn_blocking"`, and `"bounded"`
    - **Property 2: Invalid strategy always returns 400 with error message**
    - **Validates: Requirements 3.9**

- [x] 5. Checkpoint — Run the full Rust test suite
  - Run `cargo test` in `experiments/rust-tokio-blocking/`; all tests must pass. Fix any failures before proceeding.

- [x] 6. Create `experiments/rust-tokio-blocking/README.md`
  - [x] 6.1 Write the README with prerequisites, build/run instructions, endpoint reference, benchmark commands, and expected outcomes table
    - Include `## Prerequisites` section listing: Rust 1.75+ stable, cargo, wrk, curl
    - Include `## Build and Run` with `cargo build --release` and `cargo run --release`
    - Include `## Endpoints` section documenting all four endpoint variants
    - Include `## Benchmark Commands` with `wrk -t4 -c50 -d30s` commands for all three strategies
    - Include `## Measuring /health Impact During Load` with two-terminal instructions
    - Include `## Expected Outcomes` table with columns: Strategy, /health p99 latency, /compute throughput, Error rate — populated with values from the design document
    - Include `## Per-request Latency Log` explaining the `strategy,timestamp_ms,duration_ms` stdout format
    - _Requirements: 4.1, 4.2_

- [x] 7. Create the `TokioArchitectureDiagram` React component
  - [x] 7.1 Create `src/components/TokioArchitectureDiagram.tsx` modelled after `NodeProcessDiagram.tsx`
    - Reuse the same `RuntimeLayer` interface and component structure (useState for selected layer, grid of 5 clickable cards, inspector drawer)
    - Define five layers matching the design spec:
      - Layer 01: `Async Task (Future)` — subtitle `Cooperative Execution Unit`, threadModel `No thread — polled on demand`, operations: `tokio::spawn`, `async fn`, `.await`, `Future::poll`, `Waker::wake`, blockingRisk `ZERO — A Future holds no thread while suspended; it only occupies a worker thread during active polling.`
      - Layer 02: `Tokio Worker Thread` — subtitle `Multi-threaded Async Executor`, threadModel `N threads (default: num_cpus)`, operations: `poll()` calls on tasks, work-stealing from sibling queues, `tokio::spawn` task pickup, blockingRisk `CRITICAL — Any synchronous blocking call (sleep, mutex, CPU loop) occupies a worker thread for its full duration, preventing other tasks from being polled.`
      - Layer 03: `I/O Driver (epoll/kqueue)` — subtitle `Non-blocking Kernel Event Poller`, threadModel `Worker thread (non-blocking poll)`, operations: `TcpStream::read`, `TcpStream::write`, `UdpSocket`, `TcpListener::accept`, kernel event demultiplexing, blockingRisk `ZERO — The I/O driver registers interest with the OS kernel and returns immediately; it never blocks waiting for data.`
      - Layer 04: `Blocking Thread Pool` — subtitle `Synchronous Work Offload Pool`, threadModel `Up to 512 OS threads`, operations: `tokio::task::spawn_blocking`, CPU-bound closures, synchronous file I/O, bcrypt/argon2, blockingRisk `HIGH — Each spawn_blocking call consumes one thread from the pool. Pool exhaustion (512 threads) causes spawn_blocking itself to queue, stalling the calling async task.`
      - Layer 05: `Work Stealing Scheduler` — subtitle `Cross-thread Task Balancing`, threadModel `All worker threads share`, operations: Local task queue push, idle worker steals from busy queue, `tokio::spawn` scheduling, lockless deque operations, blockingRisk `LOW — The scheduler itself is lock-free and fast; risk arises only when all worker queues are saturated by blocking tasks.`
    - Each layer must include a Rust `codeSnippet` string demonstrating the representative execution pattern for that layer
    - Use `import { Cpu } from 'lucide-react'` for the header icon (instead of `Layers`)
    - Header title: `Interactive Architectural Map: Who Does the Work in Tokio?`
    - _Requirements: 5.1, 7.4_

- [x] 8. Create the `TokioArchitectureDiagramIsland` Astro island
  - [x] 8.1 Create `src/components/TokioArchitectureDiagramIsland.astro`
    - Import `{ TokioArchitectureDiagram }` from `'./TokioArchitectureDiagram'`
    - Render `<TokioArchitectureDiagram client:load />`
    - Pattern is identical to `NodeProcessDiagramIsland.astro`
    - _Requirements: 7.4_

- [x] 9. Register `TokioArchitectureDiagramBlock` in Keystatic and wire the island into `[slug].astro`
  - [x] 9.1 Update `keystatic.config.ts` to register `TokioArchitectureDiagramBlock`
    - Add `const TokioArchitectureDiagramBlock = block({ label: 'Tokio Architecture Diagram', schema: {} })` alongside the existing three block definitions
    - Add `TokioArchitectureDiagram: TokioArchitectureDiagramBlock` to the `components` map in both the `articles` collection `content` field and the `experiments` collection `content` field
    - _Requirements: 7.3, 7.4_

  - [x] 9.2 Update `src/pages/writing/[slug].astro` to import and pass `TokioArchitectureDiagramIsland`
    - Add `import TokioArchitectureDiagramIsland from '../../components/TokioArchitectureDiagramIsland.astro'` alongside the existing island imports
    - Add `TokioArchitectureDiagram: TokioArchitectureDiagramIsland` to the `components` object passed to `<Content components={{ ... }} />`
    - _Requirements: 7.4_

- [x] 10. Create the experiment MDX metadata file
  - [x] 10.1 Create `src/content/experiments/rust-tokio-blocking.mdx` with all required frontmatter fields
    - Include all fields required by `experimentsCollection` Zod schema: `tagline`, `date`, `status: draft`, `topic: backend-engineering`, `hypothesis`, `setup`, `implementation`, `keyFindings` (minimum three entries), `limitations`, `githubRepo`
    - Include optional field `relatedArticleSlug: rust-async-runtime`
    - Omit `interactiveType` (no matching enum value exists for this experiment)
    - Leave the MDX body empty or with a placeholder comment — full prose is not required at this stage
    - Exact frontmatter values are specified in the design document's Section 2
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 10.2, 10.4, 10.6_

- [x] 11. Create the article MDX file with full body content
  - [x] 11.1 Write the article frontmatter
    - Include all required fields: `description`, `date: 2025-01-15`, `status: draft`, `topic: backend-engineering`, `tags: [rust, tokio, async, concurrency, performance]`, `featured: false`, `githubUrl`, `relatedArticles: [nodejs-single-threaded]`, `relatedExperiments: [rust-tokio-blocking]`
    - Omit `title` from frontmatter (Keystatic uses `slugField`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 8.6_

  - [x] 11.2 Write the article opening and `<TokioArchitectureDiagram />` placement
    - Opening two paragraphs: present the concrete contradiction — an Axum server under load with `strategy=blocking` shows `/health` p99 latency degrading from ~2 ms to >300 ms despite `/health` doing no blocking work
    - Frame the central question: *"Why does a pure async Rust server become unresponsive when one endpoint blocks?"*
    - Place `<TokioArchitectureDiagram />` self-closing JSX tag immediately after the opening prose
    - _Requirements: 2.1, 5.5, 9.1_

  - [x] 11.3 Write "Does Rust Have an Event Loop?" section
    - Subsection: *The Language Layer: async/await as Zero-Cost Syntax* — explain that `async fn` desugars to a state machine implementing `Future`; the language provides syntax, not execution
    - Subsection: *The Runtime Layer: Tokio as the Executor* — explain that Tokio is a user-space library that provides the multi-threaded work-stealing scheduler, I/O driver, and blocking thread pool
    - _Requirements: 2.2_

  - [x] 11.4 Write "Part 1: Tokio's Internal Architecture" section with Mermaid diagram
    - Name and describe each component: worker threads, I/O driver, per-thread task queues, Poll model, Wakers, work stealing — each description must relate it to at least one other component
    - Include Mermaid `graph TD` diagram with five labelled elements: Async Tasks → Worker Threads → I/O Driver → OS Kernel; Worker Threads → Blocking Thread Pool → OS Threads; label arrows with `tokio::spawn`, `poll()`, `spawn_blocking`
    - Include a startup log snippet (from `main.rs`) showing worker thread count and blocking thread ceiling
    - _Requirements: 2.3, 5.1_

  - [x] 11.5 Write "Part 2: Scheduler Starvation Under Load" section
    - Include the Axum handler code snippet for `strategy=blocking` (direct CPU loop on the async worker thread)
    - Include benchmark results showing /health p99 degradation ≥ 2× under 50 concurrent blocking requests (populate with design document expected values: >100 ms vs ~2 ms baseline; annotate as "pending actual run" if not yet measured)
    - Add the `> **⚠ Warning: spawn_blocking Is Not Free**` callout at the end of this section, using the exact text from the design document
    - _Requirements: 2.4, 5.2 (partial), 9.1, 9.2_

  - [x] 11.6 Write "Part 3: spawn_blocking and the Blocking Thread Pool" section
    - Include code snippet for `strategy=spawn_blocking` and `strategy=bounded` handlers
    - Include comparison table: two rows (direct async handler vs spawn_blocking), columns: event-loop blocking behaviour, per-request latency impact, worker threads consumed, recommended use case
    - State the 100 µs decision signal for when to use `spawn_blocking`
    - _Requirements: 2.5, 5.3_

  - [x] 11.7 Write "Part 4: Tokio vs. Node.js — A Precise Comparison" section
    - Section heading must include the word "Node.js"
    - State that Tokio worker threads correspond to Node.js's single-threaded Event Loop poller concept and that Tokio runs multiple pollers concurrently
    - State that `spawn_blocking` corresponds to libuv's worker thread pool
    - State that Rust has no `UV_THREADPOOL_SIZE` equivalent; Tokio's blocking pool grows dynamically up to 512 threads by default
    - Include side-by-side code comparison: Node.js `crypto.pbkdf2` callback pattern vs Rust `spawn_blocking` closure pattern
    - Include comparison table across four dimensions: thread model, I/O driver mechanism, task scheduling strategy, consequence of blocking the execution thread
    - Include inline hyperlink to the companion Node.js article
    - _Requirements: 2.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 11.8 Write "Part 5: Benchmark Results" section
    - Include full benchmark results table: three strategies as rows, columns for /health p50 latency, /health p99 latency, /compute throughput, error rate — populate with design document expected values and annotate table as "expected outcomes; replace with measured values after running benchmarks"
    - Include Mermaid sequence diagram showing: single HTTP request arrival → task submitted to worker thread → `.await` suspension point → Waker notification → task resumed → response returned; label `.await yield` and `Waker::wake()` as explicit stages
    - _Requirements: 2.4 (output), 4.2, 5.2, 5.4_

  - [x] 11.9 Write "Part 6: The Production Decision Guide" section and conclusion
    - Include Mermaid flowchart with three branches from "What type of work?": I/O-bound → `async`/`.await`, CPU-bound/blocking >100µs → `spawn_blocking`, sustained parallelism → `std::thread` / `rayon`; each branch terminates in a concrete recommendation
    - Include thread count guidance: Tokio default worker thread count equals `num_cpus::get()` (number of logical CPU cores)
    - Write conclusion section: "The Corrected Mental Model" — resolve the opening contradiction with the accurate mental model
    - Confirm `relatedArticles: [nodejs-single-threaded]` frontmatter is present (required for the inline link in 11.7 to resolve)
    - _Requirements: 2.7, 9.3, 9.4_

- [x] 12. Checkpoint — Validate content schema and confirm pages render
  - Run `npx astro check` in the workspace root; confirm zero errors from `rust-async-runtime.mdx` and `rust-tokio-blocking.mdx` frontmatter
  - Run `npm run build` (or `npx astro build`) to confirm both pages are included in the static output without errors
  - Fix any Zod validation errors, MDX parse errors, or missing import errors before marking complete

- [x] 13. Write TypeScript property tests for frontmatter round-trip
  - [x] 13.1 Create `test/frontmatter-roundtrip.test.ts` with `fast-check` property tests
    - Import `* as fc from 'fast-check'`, `* as yaml from 'js-yaml'`, and the collection schemas from `src/content/config.ts`
    - Write `articleFrontmatterArb` arbitrary covering all scalar fields: `description` (non-empty string), `date` (YYYY-MM-DD string), `status` (constantFrom draft/published), `topic` (constantFrom valid enum values), `tags` (non-empty array of non-empty strings), `featured` (boolean), `relatedArticles`/`relatedExperiments` (string arrays)
    - **Property 4: Article frontmatter round-trip** — YAML serialise → re-parse → Zod validate → assert deeply equal; verify date normalisation, boolean preservation, array element order
    - **Validates: Requirements 10.1, 10.3**
    - **Property 5: Experiment frontmatter round-trip** — same pattern for `experimentsCollection` schema fields
    - **Validates: Requirements 10.2, 10.4**
    - **Property 6: Schema defaults applied for omitted optional fields** — parse minimal object (required fields only); assert `featured === false`, `relatedArticles` equals `[]`, `relatedExperiments` equals `[]`, `limitations` equals `[]`
    - **Validates: Requirements 10.5, 10.6**
    - Each property runs minimum 100 iterations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 14. Final checkpoint — All tests pass end to end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests 4.3 and 4.4 require `proptest = "1.5.0"` in `[dev-dependencies]` — already specified in task 1.1
- Property tests 13.1 require `fast-check` and `js-yaml`; install with `npm install --save-dev fast-check js-yaml @types/js-yaml` if not already present
- The Rust `build_router()` refactor in task 2.8 is a non-optional prerequisite for tasks 4.1–4.4; it must be implemented before the test tasks
- Benchmark result tables in task 11.8 should be populated with the design document's expected outcomes initially, with a note to replace them with measured values after running the `wrk` benchmarks described in the README
- The article is created in `draft` status and will not appear in production builds until `status` is changed to `published`
- `astro check` in task 12 is the definitive validator for frontmatter correctness; run it after every MDX file change

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 3, "tasks": ["2.8"] },
    { "id": 4, "tasks": ["4.1", "4.2", "6.1", "7.1"] },
    { "id": 5, "tasks": ["4.3", "4.4", "8.1"] },
    { "id": 6, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 7, "tasks": ["11.1"] },
    { "id": 8, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "11.9"] },
    { "id": 9, "tasks": ["13.1"] }
  ]
}
```
