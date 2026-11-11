# Requirements Document

## Introduction

This feature adds one experiment-driven engineering article to the Underhood blog:
**"Go Under the Hood: Goroutines, the Runtime Scheduler, and Concurrency That Actually Works"** (subtitle: *What happens inside the Go runtime when your server handles ten thousand concurrent requests?*).

The article is the third entry in the backend concurrency series, following the Node.js Event Loop article and the Rust/Tokio async runtime article. It uses the same narrative depth, experimental rigour, and visual style. It builds a coherent mental model around a single scenario — a Go HTTP server receiving concurrent requests under CPU load — and traces that path through goroutines, the M:N scheduler, GOMAXPROCS, channels, and worker pools, connecting each concept back to observable server behaviour.

The deliverable consists of:
1. A draft MDX article at `src/content/articles/golang-goroutines.mdx`
2. A draft MDX experiment entry at `src/content/experiments/golang-goroutines.mdx`
3. A self-contained Go experiment server under `experiments/golang-goroutines/`
4. Mermaid and ASCII diagrams embedded directly in the article
5. A new Keystatic content-component block (`GoSchedulerDiagram`) registered in `keystatic.config.ts`

Nothing is published or pushed to production without explicit author approval.

## Glossary

- **Article**: A long-form MDX file in `src/content/articles/` rendered at `/writing/[slug]`.
- **Experiment**: A companion MDX metadata file in `src/content/experiments/` rendered at `/experiments/[slug]`, paired with runnable source code under `experiments/`.
- **Goroutine**: A lightweight concurrent unit of execution managed by the Go runtime; not an OS thread. Created with the `go` keyword.
- **Go_Runtime**: The Go standard library component that manages goroutine scheduling, garbage collection, stack growth, and the network poller.
- **M_Thread**: An OS thread managed by the Go runtime scheduler; also called an "M" (machine thread) in Go runtime terminology.
- **P_Processor**: A logical processor in the Go runtime scheduler; holds a run queue of goroutines and must be acquired by an M before it can run goroutines. The count of Ps is set by `GOMAXPROCS`.
- **GOMAXPROCS**: A runtime setting (default: number of logical CPU cores) controlling how many P_Processors exist, and therefore how many goroutines can run in true parallel.
- **Work_Stealing**: The Go scheduler strategy where an idle P_Processor steals goroutines from another P_Processor's run queue to keep all processors busy.
- **Network_Poller**: A component of the Go runtime that monitors I/O readiness using epoll (Linux) or kqueue (macOS) and unparks goroutines when their I/O completes, without occupying an M_Thread while waiting.
- **Channel**: A typed, goroutine-safe conduit for passing values between goroutines; can be buffered or unbuffered.
- **Worker_Pool**: A fixed set of goroutines draining a shared job channel, used to cap concurrency and apply backpressure.
- **MDX**: Markdown with embedded JSX/React components; the content format used throughout Underhood.
- **Keystatic**: The Git-backed CMS that provides the admin panel and defines the content schema for articles and experiments.
- **Slug**: The filename (without `.mdx`) used directly as the URL path segment.
- **Draft_Status**: `status: draft` in frontmatter; the content is accessible locally but excluded from production builds, RSS, and sitemaps.
- **Frontend_System**: The Astro + React application that renders the Underhood blog.
- **Content_Schema**: The Zod schema defined in `src/content/config.ts` that validates all article and experiment frontmatter fields.
- **Article_File**: The MDX file at `src/content/articles/golang-goroutines.mdx`.
- **Experiment_File**: The MDX metadata file at `src/content/experiments/golang-goroutines.mdx`.
- **Go_Experiment**: The Go project under `experiments/golang-goroutines/`.
- **GoSchedulerDiagram**: A new MDX component that renders an interactive diagram of Go's M:N scheduler; registered as a Keystatic block.

---

## Requirements

### Requirement 1: Draft Article MDX File

**User Story:** As a blog author, I want a draft MDX article file created under the correct content directory, so that I can preview it locally and iterate before publishing.

#### Acceptance Criteria

1. THE Article_File SHALL exist at the path `src/content/articles/golang-goroutines.mdx`.
2. THE Article_File SHALL contain a frontmatter block with the field `status` set to `draft`.
3. THE Article_File SHALL contain a frontmatter block with the field `topic` set to `backend-engineering`.
4. THE Article_File SHALL contain a frontmatter block with the field `tags` listing at minimum: `go`, `goroutines`, `concurrency`, `scheduler`, `performance`.
5. THE Article_File SHALL contain a frontmatter field `relatedExperiments` referencing the slug `golang-goroutines` as an array entry.
6. THE Article_File SHALL contain a frontmatter field `githubUrl` set to the exact value `https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines`.
7. WHEN `astro check` is run, THE Content_Schema SHALL accept the Article_File frontmatter without validation errors.
8. THE Article_File frontmatter SHALL contain a `description` field whose value contains at least 1 non-whitespace character.
9. THE Article_File frontmatter SHALL contain a `date` field with a date value in `YYYY-MM-DD` format.
10. THE Article_File frontmatter SHALL contain a `relatedArticles` field listing at minimum the slugs `nodejs-single-threaded` and `rust-async-runtime`.

---

### Requirement 2: Article Narrative Structure

**User Story:** As a backend engineer reading the article, I want the content to follow a progressive narrative from first principles to practical conclusions, so that I build an accurate mental model of Go's concurrency by the end.

#### Acceptance Criteria

1. THE Article_File SHALL open with a concrete, measurable contradiction: a Go HTTP server whose `/health` endpoint latency degrades from under 2 ms to over 100 ms while concurrent goroutines execute a CPU-bound loop on a server with `GOMAXPROCS=1`, establishing the question the article resolves.
2. THE Article_File SHALL contain a section explaining what an OS thread is, what a goroutine is, and how they differ in terms of stack size, creation cost, and scheduling control, before introducing any Go runtime-specific terminology.
3. THE Article_File SHALL contain a section explaining the Go runtime scheduler using the M:N threading model, individually naming and describing the role of each of the following components: goroutines (G), OS threads (M), and logical processors (P), and explaining how `GOMAXPROCS` controls the number of P_Processors and therefore the degree of true parallelism.
4. THE Article_File SHALL contain a section demonstrating that goroutines are cooperatively preempted at function call boundaries and at explicit yield points (`runtime.Gosched()`), and that a CPU-bound goroutine with no yield points can hold a P_Processor and prevent other goroutines from running on it.
5. THE Article_File SHALL contain a section demonstrating the difference between `GOMAXPROCS=1` and `GOMAXPROCS=N` using the companion experiment results, showing that CPU-heavy goroutines starve the `/health` endpoint only when `GOMAXPROCS` is set lower than the number of concurrent CPU-bound goroutines.
6. THE Article_File SHALL contain a section explaining channels: what they are, the difference between buffered and unbuffered channels, how a goroutine blocks on a channel receive without occupying an M_Thread, and how a fixed-size worker pool using channels provides backpressure for CPU-heavy work.
7. THE Article_File SHALL contain a section comparing Go's concurrency model to the Node.js and Rust models already covered in the series, across at least the following dimensions: thread model, I/O handling mechanism, the consequence of running CPU-heavy work without offloading, and the idiomatic backpressure mechanism.
8. THE Article_File SHALL conclude with a decision guide mapping observable conditions to recommended actions: (a) I/O-bound work → plain goroutines, the Network_Poller handles blocking without occupying M_Threads; (b) CPU-bound work with bounded concurrency needs → a fixed-size worker pool draining a job channel; (c) CPU-bound work with true parallelism needs → ensure `GOMAXPROCS` equals the number of available CPU cores (the default).
9. WHEN the article references a code path verified by the companion experiment, THE Article_File SHALL include measured output for that code path — expressed as latency in milliseconds, goroutine counts as integers, or error rates as percentages — in a labelled code block or table that identifies which experiment scenario produced the values.

---

### Requirement 3: Experiment Code Project

**User Story:** As an engineer wanting to reproduce the results, I want a minimal, runnable Go project, so that I can verify the article's claims on my own machine.

#### Acceptance Criteria

1. THE Go_Experiment SHALL exist as a Go module at `experiments/golang-goroutines/` with a `go.mod`, a `go.sum`, and a `main.go`.
2. THE Go_Experiment SHALL compile with `go build ./...` without errors.
3. WHEN executed with `go run .`, THE Go_Experiment SHALL start an HTTP server listening on port 3000.
4. WHEN the server starts, THE Go_Experiment SHALL log the current `GOMAXPROCS` value and the number of logical CPU cores to standard output before accepting connections.
5. WHEN the `/health` endpoint receives a request, THE Go_Experiment SHALL return a `200 OK` response with a JSON body containing a `status` field set to `"ok"`, within 5 ms wall-clock time measured from the moment the server receives the request to the moment the response body is fully written, with no other requests in flight concurrently.
6. WHEN the `/compute` endpoint receives a request, THE Go_Experiment SHALL accept an optional query parameter `strategy` with valid values `goroutine`, `workerpool`, and `bounded`; if `strategy` is omitted, THE Go_Experiment SHALL default to `goroutine`.
7. WHEN the `/compute` endpoint is called with `strategy=goroutine`, THE Go_Experiment SHALL execute a CPU-bound computation consisting of a 100 ms busy-wait loop — a tight loop incrementing a counter until 100 ms of wall-clock time has elapsed — directly in the request's goroutine and return a JSON response containing the fields `strategy`, `duration_ms`, and `goroutine_id`.
8. WHEN the `/compute` endpoint is called with `strategy=workerpool`, THE Go_Experiment SHALL dispatch the same 100 ms busy-wait loop to a pre-started fixed-size worker pool of 4 goroutines draining a buffered job channel, and return a JSON response containing the fields `strategy`, `duration_ms`, and `goroutine_id`.
9. WHEN the `/compute` endpoint is called with `strategy=bounded`, THE Go_Experiment SHALL dispatch the same 100 ms busy-wait loop to a pre-started fixed-size worker pool of 4 goroutines, enforce a maximum queue depth of 20 pending jobs via a buffered channel, and return a `503 Service Unavailable` JSON response with an `error` field when the job channel is full.
10. IF the `/compute` endpoint receives a request with an unrecognised `strategy` value, THEN THE Go_Experiment SHALL return a `400 Bad Request` response with a JSON body containing an `error` field listing the valid strategy values.
11. WHILE a `/compute?strategy=workerpool` or `/compute?strategy=bounded` request is queued waiting for a worker goroutine, THE Go_Experiment SHALL block the handler goroutine on a channel receive rather than spinning or sleeping.
12. THE Go_Experiment SHALL output per-request latency to stdout in CSV format with no header row; each line SHALL contain exactly three comma-separated fields in this order: the strategy name as a string, the request completion timestamp as an integer number of milliseconds since the Unix epoch, and the observed request latency as an integer number of milliseconds.
13. THE Go_Experiment SHALL obtain the `goroutine_id` value returned in `/compute` responses by parsing the goroutine ID from the current goroutine's runtime stack trace and returning it as a decimal string.

---

### Requirement 4: Experiment Benchmarking and Observability

**User Story:** As a backend engineer, I want reproducible benchmark commands and observable metrics, so that the article's performance claims can be independently verified.

#### Acceptance Criteria

1. THE Go_Experiment README SHALL provide `wrk` or `curl`-based load-test commands for each of the three `/compute` strategies (`goroutine`, `workerpool`, and `bounded`), including the target URL, concurrency level, and duration used in the benchmark.
2. THE Go_Experiment README SHALL document the expected observable outcome for each strategy under two `GOMAXPROCS` conditions (`GOMAXPROCS=1` and `GOMAXPROCS=<num_cores>`), specifying `/health` p99 latency in milliseconds, `/compute` throughput in requests per second, and error rate as a percentage.
3. WHEN the `/compute` endpoint receives 50 concurrent requests using `strategy=goroutine` for 30 seconds with `GOMAXPROCS=1`, THE Go_Experiment SHALL produce `/health` p99 latency above 100 ms, demonstrating Go scheduler starvation under single-processor configuration.
4. WHEN the `/compute` endpoint receives 50 concurrent requests using `strategy=goroutine` for 30 seconds with `GOMAXPROCS` equal to the number of available logical cores, THE Go_Experiment SHALL produce `/health` p99 latency at or below 10 ms, demonstrating that true parallelism prevents starvation.
5. WHEN the `/compute` endpoint receives 50 concurrent requests using `strategy=workerpool` for 30 seconds, THE Go_Experiment SHALL produce `/health` p99 latency at or below 5 ms regardless of the `GOMAXPROCS` setting, demonstrating that the worker pool bounds CPU concurrency and keeps the scheduler free.
6. IF the `/compute` endpoint returns an error response during a load test run, THEN THE Go_Experiment SHALL count and output the total error count alongside throughput results, so that error rate can be calculated and reported in the article.

---

### Requirement 5: Article Visualizations

**User Story:** As a reader, I want clear diagrams embedded in the article, so that I can visualise the Go scheduler architecture and execution flow without leaving the page.

#### Acceptance Criteria

1. THE Article_File SHALL contain a Mermaid or ASCII diagram showing Go's M:N scheduler architecture, with each of the following elements present and individually labelled: goroutines (G), M_Threads (M), P_Processors (P), the global run queue, the per-P local run queue, and the Network_Poller.
2. THE Article_File SHALL contain a Mermaid sequence diagram showing the lifecycle of a goroutine handling an I/O-bound request: goroutine parks on network read, M_Thread is released to run another goroutine, the Network_Poller fires when data arrives, and the goroutine is rescheduled, with each of these four events explicitly labelled as distinct steps.
3. THE Article_File SHALL contain a comparison table covering Go, Node.js, and Rust/Tokio across at least the following four dimensions: scheduler thread model, consequence of a CPU-bound handler with no yield, the idiomatic fix for CPU-heavy work, and default parallelism unit.
4. THE Article_File SHALL contain a benchmark results table comparing the three experiment strategies — `goroutine`, `workerpool`, and `bounded` — showing `/health` p99 latency and `/compute` throughput under at least two conditions: `GOMAXPROCS=1` and `GOMAXPROCS=<num_cores>`.
5. WHERE a custom MDX component for the Go scheduler diagram is registered in `keystatic.config.ts`, THE Article_File SHALL reference it using a self-closing JSX tag `<GoSchedulerDiagram />`, placed immediately after the opening section and before the first named section heading, in the same position used by `<TokioArchitectureDiagram />` in the Rust article.

---

### Requirement 6: Draft Experiment MDX Metadata File

**User Story:** As a blog author, I want a companion experiment metadata file, so that the experiment appears at `/experiments/golang-goroutines` during local development and can be linked from the article.

#### Acceptance Criteria

1. THE Experiment_File SHALL exist at `src/content/experiments/golang-goroutines.mdx`.
2. THE Experiment_File SHALL contain a frontmatter field `status` set to `draft`.
3. THE Experiment_File SHALL contain a frontmatter field `hypothesis` describing the expected scheduler behaviour: that goroutines executing CPU-bound loops with `GOMAXPROCS=1` will starve the `/health` handler, and that a worker pool with bounded concurrency will keep `/health` latency below 5 ms regardless of `GOMAXPROCS`.
4. THE Experiment_File SHALL contain a frontmatter field `keyFindings` listing at minimum four findings: the `GOMAXPROCS=1` starvation result, the multi-core goroutine result, the worker pool isolation result, and the bounded strategy backpressure behaviour.
5. THE Experiment_File SHALL contain a frontmatter field `relatedArticleSlug` set to `golang-goroutines`.
6. THE Experiment_File SHALL contain a frontmatter field `githubRepo` whose value is a valid URL pointing to the repository path of the Go experiment (e.g., `https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines`).
7. WHEN `astro check` is run, THE Content_Schema SHALL accept the Experiment_File frontmatter without validation errors.
8. THE Experiment_File frontmatter SHALL include all fields required by the `experimentsCollection` Zod schema defined in `src/content/config.ts`, including `tagline`, `date`, `topic`, `setup`, and `implementation`.

---

### Requirement 7: Keystatic and Schema Compatibility

**User Story:** As a blog author using the Keystatic admin panel, I want the new article and experiment to be manageable through the existing CMS interface, so that I can edit and update content without touching raw files.

#### Acceptance Criteria

1. WHEN a request is made to `/writing/golang-goroutines` in local development, THE Frontend_System SHALL respond with an HTTP 200 status and render the Article_File content as HTML without throwing runtime errors.
2. WHEN a request is made to `/experiments/golang-goroutines` in local development, THE Frontend_System SHALL respond with an HTTP 200 status and render the Experiment_File content as HTML without throwing runtime errors.
3. THE Article_File frontmatter fields and THE Experiment_File frontmatter fields SHALL each conform to their respective Keystatic collection schemas, such that both entries are listed and editable in the Keystatic admin panel without validation errors.
4. WHERE the `GoSchedulerDiagram` MDX component is added for the article, THE `keystatic.config.ts` SHALL register it as a `block` entry in the `articles` collection's `content` field components map, and THE corresponding `.astro` island file SHALL exist in `src/components/` and be passed to the `Content` renderer in `src/pages/writing/[slug].astro`.
5. THE Article_File frontmatter field `relatedExperiments` SHALL contain exactly one entry with the value `golang-goroutines`.
6. WHEN the article page at `/writing/golang-goroutines` is rendered, THE Frontend_System SHALL display a navigable link to `/experiments/golang-goroutines` that returns an HTTP 200 response when followed.

---

### Requirement 8: Series Cross-Reference Accuracy

**User Story:** As a backend engineer reading the full series, I want the Go article's comparisons to Node.js and Rust to use precise, verifiable terminology consistent with what those articles already established, so that I can accurately connect my mental models across all three runtimes.

#### Acceptance Criteria

1. THE Article_File SHALL contain a dedicated comparison section introduced by an `##`-level heading whose visible text includes at least two of the three runtime names: "Node.js", "Rust", or "Go".
2. THE Article_File comparison section SHALL convey that Go goroutines and Tokio's async tasks are both lightweight units scheduled by a user-space runtime onto a fixed pool of OS threads, and SHALL convey that the key difference is that goroutines have their own growable stack while Tokio tasks are stackless state machines.
3. THE Article_File comparison section SHALL convey that Go's worker pool pattern — goroutines consuming jobs from a buffered channel — is the idiomatic equivalent of Tokio's `spawn_blocking` with a `Semaphore`, and that both mechanisms exist to bound concurrent CPU-heavy work and prevent scheduler starvation.
4. THE Article_File comparison section SHALL convey that Go has no equivalent of `UV_THREADPOOL_SIZE` because goroutines are not OS threads, and SHALL convey that `GOMAXPROCS` controls the maximum number of OS threads running goroutines simultaneously, not the size of a thread pool.
5. THE Article_File comparison section SHALL include two consecutive fenced code blocks, the first tagged `go` showing the idiomatic Go worker pool pattern with an inline comment identifying the channel-send line, and the second tagged `rust` showing the equivalent `spawn_blocking` with `Semaphore` pattern with an inline comment identifying the offload line.
6. THE Article_File SHALL include an inline hyperlink to the Node.js article (`/writing/nodejs-single-threaded`) and an inline hyperlink to the Rust article (`/writing/rust-async-runtime`) within the comparison section body, and SHALL list both slugs in the `relatedArticles` frontmatter field.

---

### Requirement 9: Content Quality and Style Consistency

**User Story:** As the blog editor, I want the new article to match the technical depth, prose style, and structural conventions of the existing Node.js and Rust articles, so that the blog feels like a coherent series.

#### Acceptance Criteria

1. THE Article_File SHALL open its first section with a statement that presents a measurable contradiction about Go's concurrency behaviour — such as `/health` latency spiking despite goroutines being advertised as lightweight — placed within the first two paragraphs, before any background explanation.
2. THE Article_File SHALL include at least one warning callout that is visually or structurally distinct from body prose — marked with a blockquote, bold heading, or admonition prefix (e.g., "⚠ Warning:") — identifying a specific, non-obvious misuse pattern involving goroutines, channels, or `GOMAXPROCS` that can cause correctness or performance problems in production.
3. THE Article_File SHALL include a dedicated section containing a decision diagram — rendered as ASCII art or a Mermaid diagram — covering at least three branches: when to use plain goroutines with no offloading, when to use a worker pool with a job channel, and when to increase `GOMAXPROCS` or use `runtime.NumCPU()` explicitly.
4. IF the Article_File contains a performance claim, THEN THE Article_File SHALL express that claim with a numeric value and unit (e.g., latency in milliseconds, throughput in requests per second, or goroutine count as an integer) sourced from either the article's own experiment results or a cited Go runtime documentation page.
5. THE Article_File SHALL assume reader familiarity with at least one of the other two runtimes already covered in the series (Node.js or Rust/Tokio), and SHALL anchor each new Go concept to the equivalent concept in Node.js or Rust before introducing Go-specific terminology.

---

### Requirement 10: Parser and Serializer Round-Trip for Frontmatter

**User Story:** As a developer maintaining the blog, I want the MDX frontmatter for both new files to survive a parse-serialize-parse cycle without data loss, so that Keystatic and Astro never produce inconsistent content states.

#### Acceptance Criteria

1. THE Article_File frontmatter SHALL be valid YAML that parses into a JavaScript object satisfying the `articlesCollection` Zod schema defined in `src/content/config.ts`.
2. THE Experiment_File frontmatter SHALL be valid YAML that parses into a JavaScript object satisfying the `experimentsCollection` Zod schema defined in `src/content/config.ts`.
3. FOR ALL scalar fields in the Article_File frontmatter, serializing the parsed object back to YAML and re-parsing it SHALL produce a deeply equal object, with date fields normalized to `YYYY-MM-DD` string format, booleans preserved as booleans, and arrays preserved as arrays.
4. FOR ALL scalar fields in the Experiment_File frontmatter, serializing the parsed object back to YAML and re-parsing it SHALL produce a deeply equal object, with date fields normalized to `YYYY-MM-DD` string format, booleans preserved as booleans, and arrays preserved as arrays.
5. IF the Article_File frontmatter omits any optional field, THEN THE Content_Schema SHALL apply the documented default value for each of the following: `featured` defaults to `false`, `relatedArticles` defaults to `[]`, `relatedExperiments` defaults to `[]`, and `status` defaults to `draft`.
6. IF the Experiment_File frontmatter omits any optional field, THEN THE Content_Schema SHALL apply the documented default value for each of the following: `limitations` defaults to `[]` and `status` defaults to `draft`.
7. IF the Article_File or Experiment_File contains structurally invalid YAML in its frontmatter block, THEN `astro check` SHALL report a parse error and SHALL NOT silently produce an empty or partial content object.
