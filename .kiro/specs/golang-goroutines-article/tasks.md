# Implementation Plan: Go Under the Hood — Goroutines, the Runtime Scheduler, and Concurrency

## Overview

Implement the full deliverable set for the Go goroutines article: a self-contained Go HTTP experiment server, an interactive React diagram component, Keystatic and Astro page wiring, an experiment MDX metadata file, and the long-form article MDX file. Tasks are ordered so each step produces a testable artefact before the next layer depends on it.

## Tasks

- [x] 1. Create the Go experiment project skeleton
  - [x] 1.1 Scaffold `experiments/golang-goroutines/` with `go.mod` and empty `main.go`
    - Run `go mod init golang-goroutines` in `experiments/golang-goroutines/`
    - Create `main.go` with a minimal `package main; func main() {}` placeholder
    - Run `go build ./...` to confirm the scaffold compiles
    - _Requirements: 3.1, 3.2_

- [x] 2. Implement `main.go` — types, router, and all three strategies
  - [x] 2.1 Define response types and `AppState`
    - Add `ComputeResponse`, `HealthResponse`, `ErrorResponse` structs with JSON tags
    - Add `jobRequest` and `jobResult` structs for worker pool communication
    - Add `AppState` struct with `workerJobs` and `boundedJobs` buffered channels
    - Add `goroutineID()` function using `runtime.Stack()` to extract goroutine ID
    - _Requirements: 3.5, 3.7, 3.8, 3.13_

  - [x] 2.2 Implement `main()` with startup logging and router setup
    - Log `GOMAXPROCS` value via `runtime.GOMAXPROCS(0)` and CPU cores via `runtime.NumCPU()`
    - Start 4 worker goroutines draining the `workerJobs` channel and 4 draining the `boundedJobs` channel
    - Build router with `/health` and `/compute` routes using `newRouter(state)`
    - Listen on port 3000
    - _Requirements: 3.3, 3.4_

  - [x] 2.3 Implement `healthHandler()`
    - Return `{"status":"ok"}` with HTTP 200
    - _Requirements: 3.5_

  - [x] 2.4 Implement `computeHandler()` — `goroutine` strategy branch
    - Run `runBlockingWork()` directly in the request goroutine (no offloading)
    - Capture `goroutineID()`, record wall-clock `duration_ms`, print CSV log line
    - Default strategy when `strategy` param is omitted
    - _Requirements: 3.6, 3.7_

  - [x] 2.5 Implement `computeHandler()` — `workerpool` strategy branch
    - Send a `jobRequest` to the `workerJobs` buffered channel
    - Block on the per-request `result` channel receive (not a spin or sleep)
    - Return JSON response with `strategy`, `duration_ms`, `goroutine_id`
    - _Requirements: 3.8, 3.11_

  - [x] 2.6 Implement `computeHandler()` — `bounded` strategy branch
    - Attempt non-blocking send to `boundedJobs` channel (cap 20) using `select` with `default` case
    - Return `503 Service Unavailable` with `{"error":"Server overloaded: job queue full"}` when channel is full
    - On successful dispatch, block on the per-request `result` channel receive
    - _Requirements: 3.9, 3.11_

  - [x] 2.7 Implement `computeHandler()` — unknown strategy branch, `runBlockingWork()`, and helpers
    - Return `400 Bad Request` with `{"error":"Unknown strategy '...'. Valid values: goroutine, workerpool, bounded"}` for unrecognised values
    - Implement `runBlockingWork()` as a 100 ms busy-wait loop using `time.Now()` + `time.Duration`
    - Implement `csvLog()` for stdout CSV output: `strategy,timestamp_ms,duration_ms`
    - Implement `timestampMs()` helper using `time.Now().UnixMilli()`
    - _Requirements: 3.10, 3.12_

  - [x] 2.8 Extract `newRouter()` helper function for testability
    - Refactor `main()` to call `newRouter(state)` which returns an `http.Handler`; this enables `net/http/httptest` calls in tests without binding a real port
    - _Requirements: 3.2 (testability prerequisite)_

- [x] 3. Checkpoint — Compile, vet, and format the Go project
  - Run `go build ./...`, `go vet ./...`, and `gofmt -l .` in `experiments/golang-goroutines/`; fix any issues before proceeding.

- [x] 4. Write Go unit and property tests in `main_test.go`
  - [x] 4.1 Write unit tests for `healthHandler` and known-good strategies
    - Use `net/http/httptest.NewRecorder()` with direct handler calls via `newRouter()`
    - Test: `GET /health` → 200, body `{"status":"ok"}`
    - Test: `GET /compute?strategy=goroutine` → 200, JSON body has `strategy`, `duration_ms` ≥ 0, non-empty `goroutine_id`
    - Test: `GET /compute?strategy=workerpool` → 200, same shape assertions
    - Test: `GET /compute?strategy=bounded` → 200, same shape assertions
    - Test: `GET /compute` (no param) → 200, `strategy` field equals `"goroutine"` (default)
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 4.2 Write unit test for unknown strategy → 400
    - Test: `GET /compute?strategy=invalid` → 400, JSON body has `error` field listing all three valid strategies
    - _Requirements: 3.10_

  - [ ]* 4.3 Write property test — Property 4: valid strategy always returns 200 with required fields
    - Use `rapid` package to generate strategy values from the valid set
    - Assert: status == 200, `json["strategy"]` is string, `json["duration_ms"]` is non-negative number, `json["goroutine_id"]` is non-empty string
    - **Property 4: Valid /compute strategy responses always contain required fields**
    - **Validates: Requirements 3.7, 3.8**

  - [ ]* 4.4 Write property test — Property 5: invalid strategy always returns 400 with all valid values
    - Use `rapid` to generate arbitrary strings not in the valid set
    - Assert: status == 400, `json["error"]` contains `"goroutine"`, `"workerpool"`, and `"bounded"`
    - **Property 5: Invalid strategy always returns 400 with all valid values listed**
    - **Validates: Requirements 3.10**

  - [ ]* 4.5 Write property test — Property 6: goroutine ID parser round-trips
    - Generate arbitrary non-negative integers, construct fake stack trace header `"goroutine N [running]:"`, parse via `goroutineID()` logic, assert equality
    - **Property 6: Goroutine ID parser round-trips any valid goroutine ID**
    - **Validates: Requirements 3.13**

  - [ ]* 4.6 Write property test — Property 7: CSV log lines are always well-formed
    - Generate random strategy strings and latency values, format via `csvLog()`, assert parseable as 3 comma-separated fields with correct types
    - **Property 7: CSV log lines are always well-formed**
    - **Validates: Requirements 3.12**

- [x] 5. Checkpoint — Run the full Go test suite
  - Run `go test ./...` in `experiments/golang-goroutines/`; all tests must pass. Fix any failures before proceeding.

- [x] 6. Create `experiments/golang-goroutines/README.md`
  - [x] 6.1 Write the README with prerequisites, build/run instructions, endpoint reference, benchmark commands, and expected outcomes table
    - Include `## Prerequisites` section listing: Go 1.22+, wrk, curl
    - Include `## Build and Run` with `go build ./...` and `go run .`
    - Include `## Endpoints` section documenting all endpoint variants
    - Include `## Benchmark Commands` with `wrk -t4 -c50 -d30s` commands for all three strategies under both `GOMAXPROCS=1` and `GOMAXPROCS=N`
    - Include `## Measuring /health Impact During Load` with two-terminal instructions
    - Include `## Expected Outcomes` table with columns: Strategy, GOMAXPROCS, /health p99 latency, /compute throughput, Error rate
    - Include `## Per-request Latency Log` explaining the `strategy,timestamp_ms,duration_ms` stdout format
    - _Requirements: 4.1, 4.2_

- [x] 7. Create the `GoSchedulerDiagram` React component
  - [x] 7.1 Create `src/components/GoSchedulerDiagram.tsx` modelled after `TokioArchitectureDiagram.tsx`
    - Reuse the same `RuntimeLayer` interface (renamed `SchedulerLayer`) and component structure (useState for selected layer, grid of 5 clickable cards, inspector drawer)
    - Define five layers matching the design spec:
      - Layer 01: `Goroutine (G)` — subtitle `Lightweight Execution Unit`, threadModel `Goroutine stack: starts at 2–8 KB, grows on demand`, operations: `go func(){}()`, `runtime.Gosched()`, goroutine park/unpark, channel block/unblock, `sync.WaitGroup`, blockingRisk `ZERO — goroutines waiting on I/O or channels consume no M thread while parked.`
      - Layer 02: `Logical Processor (P)` — subtitle `Goroutine Run Queue Holder`, threadModel `GOMAXPROCS Ps (default: runtime.NumCPU())`, operations: local run queue, `GOMAXPROCS`, goroutine scheduling, work-stealing victim, `runtime.GOMAXPROCS(n)`, blockingRisk `CRITICAL — A CPU-bound goroutine with no yield points holds the P it runs on, preventing all other goroutines in its local queue from progressing.`
      - Layer 03: `OS Thread (M)` — subtitle `Machine Thread Executor`, threadModel `One OS thread per active goroutine; count varies`, operations: OS thread creation/parking, syscall hand-off, `runtime.LockOSThread()`, P hand-off on syscall, blockingRisk `HIGH when blocked on syscall — the Go runtime spins up a new M to keep the P running, but thread proliferation has OS-level costs.`
      - Layer 04: `Network Poller` — subtitle `Non-blocking I/O Watcher`, threadModel `Zero M threads held while waiting (epoll/kqueue)`, operations: `net.Conn.Read()`, `http.Get()`, goroutine park on I/O, kernel event arrival, goroutine unpark, blockingRisk `ZERO — network I/O goroutines are parked and do not hold an M or a P while waiting for data.`
      - Layer 05: `Work Stealing Scheduler` — subtitle `Cross-P Task Balancing`, threadModel `All Ps share; idle P steals from busy P's queue`, operations: local queue push/pop, global run queue poll, `go` keyword task placement, idle P steal, 61-tick global poll, blockingRisk `LOW — the scheduler is lock-free; risk only arises when all Ps are saturated by CPU-bound goroutines with no yield points.`
    - Each layer must include a Go `codeSnippet` string demonstrating the representative execution pattern for that layer
    - Use `import { Cpu } from 'lucide-react'` for the header icon
    - Header title: `Interactive Architectural Map: Who Does the Work in Go?`
    - Default selected layer: `logical-processor` (P)
    - _Requirements: 5.1, 7.4_

- [x] 8. Create the `GoSchedulerDiagramIsland` Astro island
  - [x] 8.1 Create `src/components/GoSchedulerDiagramIsland.astro`
    - Import `{ GoSchedulerDiagram }` from `'./GoSchedulerDiagram'`
    - Render `<GoSchedulerDiagram client:load />`
    - Pattern is identical to `TokioArchitectureDiagramIsland.astro`
    - _Requirements: 7.4_

- [x] 9. Register `GoSchedulerDiagramBlock` in Keystatic and wire the island into `[slug].astro`
  - [x] 9.1 Update `keystatic.config.ts` to register `GoSchedulerDiagramBlock`
    - Add `const GoSchedulerDiagramBlock = block({ label: 'Go Scheduler Diagram', schema: {} })` alongside the existing block definitions
    - Add `GoSchedulerDiagram: GoSchedulerDiagramBlock` to the `components` map in both the `articles` collection `content` field and the `experiments` collection `content` field
    - _Requirements: 7.3, 7.4_

  - [x] 9.2 Update `src/pages/writing/[slug].astro` to import and pass `GoSchedulerDiagramIsland`
    - Add `import GoSchedulerDiagramIsland from '../../components/GoSchedulerDiagramIsland.astro'` alongside the existing island imports
    - Add `GoSchedulerDiagram: GoSchedulerDiagramIsland` to the `components` object passed to `<Content components={{ ... }} />`
    - _Requirements: 7.4_

- [x] 10. Create the experiment MDX metadata file
  - [x] 10.1 Create `src/content/experiments/golang-goroutines.mdx` with all required frontmatter fields
    - Include all fields required by `experimentsCollection` Zod schema: `tagline`, `date`, `status: draft`, `topic: backend-engineering`, `hypothesis`, `setup`, `implementation`, `keyFindings` (minimum four entries), `limitations`, `githubRepo`
    - Include optional field `relatedArticleSlug: golang-goroutines`
    - Omit `interactiveType` (no matching enum value for Go; the GoSchedulerDiagram is an MDX component, not an ExperimentVisualizer)
    - Leave the MDX body empty or with a placeholder comment
    - Exact frontmatter values are specified in the design document
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 10.2, 10.4, 10.6_

- [x] 11. Create the article MDX file with full body content
  - [x] 11.1 Write the article frontmatter
    - Include all required fields: `description`, `date`, `status: draft`, `topic: backend-engineering`, `tags: [go, goroutines, concurrency, scheduler, performance]`, `featured: false`, `githubUrl`, `relatedArticles: [nodejs-single-threaded, rust-async-runtime]`, `relatedExperiments: [golang-goroutines]`
    - Omit `title` from frontmatter (Keystatic uses `slugField`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10, 8.6_

  - [x] 11.2 Write the article opening and `<GoSchedulerDiagram />` placement
    - Opening: present the concrete contradiction — a Go HTTP server with `GOMAXPROCS=1` where `/health` latency degrades from ~2 ms to >100 ms while concurrent goroutines run a CPU-bound loop
    - Frame the central question: why does a language built for concurrency starve under CPU load?
    - Place `<GoSchedulerDiagram />` self-closing JSX tag immediately after the opening prose
    - _Requirements: 2.1, 5.5, 9.1_

  - [x] 11.3 Write "First, what is a goroutine?" section
    - Explain what an OS thread is (where code runs, 8 MB stack, OS-scheduled)
    - Explain what a goroutine is (2–8 KB stack, runtime-scheduled, `go` keyword)
    - Compare creation cost, stack size, and scheduling control
    - No Go runtime scheduler terminology yet — just goroutine as a concept
    - _Requirements: 2.2_

  - [x] 11.4 Write "The Go scheduler: G, M, and P" section with Mermaid diagram
    - Introduce the M:N model: G (goroutine), M (OS thread), P (logical processor)
    - Explain `GOMAXPROCS` controls the number of Ps and therefore true parallelism
    - Include Mermaid `graph TD` diagram showing: Goroutines → P (local run queue) → M (OS thread); global run queue; Network Poller; work stealing arrows
    - Include startup log snippet from `main.go` showing GOMAXPROCS and NumCPU
    - _Requirements: 2.3, 5.1_

  - [x] 11.5 Write "What goes wrong when a goroutine won't yield" section
    - Explain cooperative preemption at function call boundaries and `runtime.Gosched()`
    - Show the `goroutine` strategy handler code from `main.go` (direct busy-wait)
    - Walk through GOMAXPROCS=1 starvation: all goroutines share one P, CPU-bound goroutine holds it
    - Include benchmark table: GOMAXPROCS=1 vs GOMAXPROCS=N, `/health` p99 degradation
    - Add the `> **⚠ Warning: Goroutine Leaks Are Silent**` callout about goroutines blocked forever on channels
    - _Requirements: 2.4, 2.5, 9.1, 9.2_

  - [x] 11.6 Write "Channels and the worker pool pattern" section
    - Explain channels: buffered vs unbuffered, goroutine blocks on receive without holding M
    - Show the `workerpool` strategy code (dispatch to buffered channel, block on result receive)
    - Show the `bounded` strategy code (capped channel, non-blocking send, 503 on full)
    - Include comparison table: direct goroutine vs worker pool (CPU concurrency, /health impact, backpressure)
    - _Requirements: 2.6, 5.3_

  - [x] 11.7 Write "Go vs. Node.js and Rust — a quick comparison" section
    - Section heading includes at least two of: "Node.js", "Rust", "Go"
    - Convey that goroutines ↔ Tokio async tasks (both lightweight, runtime-scheduled; goroutines have growable stacks, Tokio tasks are stackless state machines)
    - Convey that Go worker pool pattern ↔ Tokio's spawn_blocking + Semaphore
    - Convey that GOMAXPROCS controls parallelism not thread pool size (no UV_THREADPOOL_SIZE equivalent)
    - Include two consecutive code blocks: Go worker pool pattern (tagged `go`, with comment on channel-send line) and Rust spawn_blocking+Semaphore (tagged `rust`, with comment on offload line)
    - Include comparison table across four dimensions: scheduler thread model, consequence of CPU-bound handler with no yield, idiomatic fix for CPU-heavy work, default parallelism unit
    - Include inline hyperlinks to `/writing/nodejs-single-threaded` and `/writing/rust-async-runtime`
    - _Requirements: 2.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 11.8 Write "Benchmark Results" section
    - Include benchmark results table: three strategies as rows, columns for `/health` p50, `/health` p99, `/compute` throughput, error rate — under both `GOMAXPROCS=1` and `GOMAXPROCS=num_cores`
    - Annotate table as "expected outcomes; replace with measured values after running benchmarks"
    - Include Mermaid sequence diagram showing goroutine I/O lifecycle: goroutine parks on network read → M released → network poller fires → goroutine rescheduled; label each step
    - _Requirements: 2.4 (output), 4.2, 5.2, 5.4_

  - [x] 11.9 Write "The production decision guide" section and conclusion
    - Include Mermaid flowchart with three branches: I/O-bound → plain goroutines, CPU-bound with bounded concurrency → worker pool + job channel, CPU-bound with true parallelism → ensure GOMAXPROCS=num_cores
    - Write conclusion: one or two sentences restating the mental model (goroutines are cheap but a P is not; CPU-bound work without yield holds a P and starves everything queued on it)
    - _Requirements: 2.8, 9.3, 9.4_

- [x] 12. Checkpoint — Validate content schema and confirm pages render
  - Run `npx astro check` in the workspace root; confirm zero errors from `golang-goroutines.mdx` and `golang-goroutines.mdx` frontmatter
  - Run `npm run build` (or `npx astro build`) to confirm both pages are included in the static output without errors
  - Fix any Zod validation errors, MDX parse errors, or missing import errors before marking complete

- [x] 13. Write TypeScript property tests for frontmatter round-trip
  - [x] 13.1 Add Go article/experiment frontmatter property tests to `test/frontmatter-roundtrip.test.ts`
    - Reuse the existing `fast-check` arbitraries and Zod schemas already in the test file
    - **Property 1: Article and experiment frontmatter round-trip** — generate arbitrary valid Go article/experiment frontmatter, serialise to YAML, re-parse, assert deep equality with date normalisation
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
    - **Property 2: Optional frontmatter fields default correctly** — parse minimal objects with optional fields omitted, assert defaults applied
    - **Validates: Requirements 10.5, 10.6**
    - Each property runs minimum 100 iterations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 14. Final checkpoint — All tests pass end to end
  - Run `go test ./...` in `experiments/golang-goroutines/` — all Go tests pass
  - Run `npm test` in workspace root — all TypeScript tests pass
  - Run `npm run build` — site builds without errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests 4.3–4.6 require the `rapid` Go package: `go get github.com/flyingmutant/rapid@latest`
- Property tests 13.1 reuse the existing `fast-check` and `js-yaml` packages already installed
- The `newRouter()` refactor in task 2.8 is a non-optional prerequisite for tasks 4.1–4.6; it must be implemented before the test tasks
- Benchmark result tables in task 11.8 should be populated with the design document's expected outcomes initially, with a note to replace them with measured values after running the `wrk` benchmarks described in the README
- The article is created in `draft` status and will not appear in production builds until `status` is changed to `published`
- `astro check` in task 12 is the definitive validator for frontmatter correctness; run it after every MDX file change
- The Go experiment uses only the standard library — no external Go dependencies are needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 3, "tasks": ["2.8"] },
    { "id": 4, "tasks": ["3"] },
    { "id": 5, "tasks": ["4.1", "4.2", "6.1", "7.1"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5", "4.6", "8.1"] },
    { "id": 7, "tasks": ["5"] },
    { "id": 8, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "11.9"] },
    { "id": 11, "tasks": ["12"] },
    { "id": 12, "tasks": ["13.1"] },
    { "id": 13, "tasks": ["14"] }
  ]
}
```
