# Requirements Document

## Introduction

This feature adds one experiment-driven engineering article to the Underhood blog:
**"Rust Under the Hood: Async Tasks, Worker Threads, and Blocking Work"** (subtitle: *What actually happens when a Rust server handles thousands of concurrent requests?*).

The article uses the same narrative depth, experimental rigour, and visual style as the existing Node.js article (*"Node.js Is Single-Threaded. So Who's Doing the Work?"*). It builds a coherent mental model around a single scenario — an Axum server receiving 1,000 concurrent HTTP requests — and traces that request through Tokio's scheduler, worker threads, blocking thread pool, and back to observable server behaviour.

The deliverable consists of:
1. A draft MDX article at `src/content/articles/rust-async-runtime.mdx`
2. A draft MDX experiment entry at `src/content/experiments/rust-tokio-blocking.mdx`
3. A self-contained Rust experiment project under `experiments/rust-tokio-blocking/`
4. Essential ASCII/SVG diagrams embedded directly in the article
5. New Keystatic content-component blocks (registered but not interactive at this stage) for the Tokio architecture diagram

Nothing is published or pushed to production without explicit author approval.

## Glossary

- **Article**: A long-form MDX file in `src/content/articles/` rendered at `/writing/[slug]`.
- **Experiment**: A companion MDX metadata file in `src/content/experiments/` rendered at `/experiments/[slug]`, paired with runnable source code under `experiments/`.
- **Tokio**: The dominant async runtime for Rust, providing a multi-threaded work-stealing scheduler, an I/O driver, and a blocking thread pool.
- **Axum**: A Rust web framework built on top of Tokio and Tower; the HTTP server used in the experiment.
- **Async Task**: A Rust `Future` submitted to the Tokio runtime via `tokio::spawn`; scheduled cooperatively across worker threads.
- **Worker Thread**: One of Tokio's OS threads that polls and drives async tasks to completion.
- **Blocking Thread Pool**: A dynamically-sized pool of threads managed by Tokio, accessed via `tokio::task::spawn_blocking`, for work that cannot yield (CPU-heavy or synchronous I/O).
- **spawn_blocking**: The Tokio API for offloading a blocking closure onto the blocking thread pool without stalling the async worker threads.
- **Waker**: A Rust async primitive that notifies the Tokio scheduler when a task's `Future` is ready to be polled again.
- **Work Stealing**: The scheduler strategy where idle worker threads steal pending tasks from busy workers' queues to maximise CPU utilisation.
- **MDX**: Markdown with embedded JSX/React components; the content format used throughout Underhood.
- **Keystatic**: The Git-backed CMS that provides the admin panel and defines the content schema for articles and experiments.
- **Slug**: The filename (without `.mdx`) used directly as the URL path segment (e.g. `rust-async-runtime` → `/writing/rust-async-runtime`).
- **Draft Status**: `status: draft` in frontmatter; the content is accessible locally but excluded from production builds, RSS, and sitemaps.
- **Frontend_System**: The Astro + React application that renders the Underhood blog.
- **Content_Schema**: The Zod schema defined in `src/content/config.ts` that validates all article and experiment frontmatter fields.
- **Article_File**: The MDX file at `src/content/articles/rust-async-runtime.mdx`.
- **Experiment_File**: The MDX metadata file at `src/content/experiments/rust-tokio-blocking.mdx`.
- **Rust_Experiment**: The Rust project under `experiments/rust-tokio-blocking/`.

---

## Requirements

### Requirement 1: Draft Article MDX File

**User Story:** As a blog author, I want a draft MDX article file created under the correct content directory, so that I can preview it locally and iterate before publishing.

#### Acceptance Criteria

1. THE Article_File SHALL exist at the path `src/content/articles/rust-async-runtime.mdx`.
2. THE Article_File SHALL contain a frontmatter block with the field `status` set to `draft`.
3. THE Article_File SHALL contain a frontmatter block with the field `topic` set to `backend-engineering`.
4. THE Article_File SHALL contain a frontmatter block with the field `tags` listing at minimum: `rust`, `tokio`, `async`, `concurrency`, `performance`.
5. THE Article_File SHALL contain a frontmatter field `relatedExperiments` referencing the slug `rust-tokio-blocking` as an array entry.
6. THE Article_File SHALL contain a frontmatter field `githubUrl` whose value is a valid URL pointing to the experiment directory within the repository (e.g., `https://github.com/huyhoang1001/underhood/tree/main/experiments/rust-tokio-blocking`).
7. THE Content_Schema SHALL accept the Article_File frontmatter without validation errors when `astro check` is run.
8. THE Article_File frontmatter SHALL contain a `description` field with a non-empty string value.
9. THE Article_File frontmatter SHALL contain a `date` field with a date value in `YYYY-MM-DD` format.

---

### Requirement 2: Article Narrative Structure

**User Story:** As a backend engineer reading the article, I want the content to follow a progressive narrative from first principles to practical conclusions, so that I build an accurate mental model of Rust's async execution by the end.

#### Acceptance Criteria

1. THE Article_File SHALL open with a concrete engineering scenario in which an Axum server receives 1,000 concurrent HTTP requests, stating the reader's expectation (all requests handled without blocking) alongside the observed failure mode (starvation or latency degradation) to establish the central question the article resolves.
2. THE Article_File SHALL contain a section titled "Does Rust Have an Event Loop?" that defines both `async`/`.await` as a language-level zero-cost abstraction and Tokio as a user-space runtime, explicitly stating that the language provides the syntax and the runtime provides the executor.
3. THE Article_File SHALL contain a section explaining Tokio's internal architecture that individually names and describes the role of each of the following components: worker threads, the I/O driver, per-thread task queues, the Poll model, Wakers, and work stealing, with each component's description relating it to at least one other component in the same section.
4. THE Article_File SHALL contain a section demonstrating scheduler starvation by showing a CPU-heavy synchronous computation running directly inside an async handler, and SHALL include measured output showing that p99 latency of concurrent async tasks degrades by at least 2× relative to the baseline while the blocking task occupies the thread.
5. THE Article_File SHALL contain a section that names `spawn_blocking`, describes the blocking thread pool it dispatches to, and specifies a concrete decision signal for when to use it: any synchronous operation expected to occupy a thread for more than 100 µs of CPU-bound work.
6. THE Article_File SHALL contain a section that compares Tokio's model with the Node.js Event Loop and libuv architecture across at least the following dimensions: thread model (single-threaded vs. multi-threaded scheduler), I/O driver mechanism, task scheduling strategy, and the consequence of blocking the execution thread.
7. THE Article_File SHALL conclude with a section that provides decision criteria in the form of observable conditions mapped to recommended actions: (a) I/O-bound async work → use `async`/`.await` directly, (b) CPU-bound or blocking work expected to exceed 100 µs → use `spawn_blocking`, (c) thread count guidance stating the default Tokio worker thread count equals the number of logical CPU cores.
8. WHEN the article references a code path that is verified by the accompanying experiment, THE Article_File SHALL include the measured output for that code path — expressed as latency values in milliseconds, thread counts as integers, or error rates as percentages — in a labeled code block or table that identifies which experiment scenario produced the values.

---

### Requirement 3: Experiment Code Project

**User Story:** As an engineer wanting to reproduce the results, I want a minimal, runnable Rust project, so that I can verify the article's claims on my own machine.

#### Acceptance Criteria

1. THE Rust_Experiment SHALL exist as a Cargo project at `experiments/rust-tokio-blocking/` with a `Cargo.toml` and a `src/main.rs`.
2. THE Rust_Experiment SHALL compile with `cargo build --release` without errors.
3. WHEN executed with `cargo run --release`, THE Rust_Experiment SHALL start an Axum HTTP server listening on port 3000.
4. WHEN the `/health` endpoint receives a request, THE Rust_Experiment SHALL return a `200 OK` response with a JSON body containing a `status` field set to `"ok"` within 5 ms, measured with no concurrent requests in flight.
5. WHEN the `/compute` endpoint receives a request, THE Rust_Experiment SHALL accept an optional query parameter `strategy` with valid values `blocking`, `spawn_blocking`, and `bounded`; if `strategy` is omitted, THE Rust_Experiment SHALL default to `blocking`.
6. WHEN the `/compute` endpoint is called with `strategy=blocking`, THE Rust_Experiment SHALL execute a CPU-bound computation consisting of a 100 ms busy-wait loop on the calling async worker thread and return a JSON response containing the fields `strategy`, `duration_ms`, and `thread_id`.
7. WHEN the `/compute` endpoint is called with `strategy=spawn_blocking`, THE Rust_Experiment SHALL offload the same 100 ms busy-wait loop using `tokio::task::spawn_blocking` and return a JSON response containing the fields `strategy`, `duration_ms`, and `thread_id`.
8. WHEN the `/compute` endpoint is called with `strategy=bounded`, THE Rust_Experiment SHALL offload the same 100 ms busy-wait loop using `spawn_blocking` while enforcing a maximum concurrency limit of 4 simultaneous blocking tasks via a `tokio::sync::Semaphore`, and return a JSON response containing the fields `strategy`, `duration_ms`, and `thread_id`.
9. IF the `/compute` endpoint receives a request with an unrecognised `strategy` value, THEN THE Rust_Experiment SHALL return a `400 Bad Request` response with a JSON body containing an error message indicating the valid values.
10. WHEN the server starts, THE Rust_Experiment SHALL log the Tokio worker thread count and blocking thread count to standard output before accepting connections.
11. WHILE the bounded semaphore limit of 4 concurrent blocking tasks is reached, THE Rust_Experiment SHALL queue additional `/compute?strategy=bounded` requests and serve them in arrival order once a semaphore permit becomes available.
12. IF a queued `/compute?strategy=bounded` request waits more than 30 seconds for a semaphore permit, THEN THE Rust_Experiment SHALL return a `503 Service Unavailable` response with a JSON body containing an error message indicating that the server is overloaded.

---

### Requirement 4: Experiment Benchmarking and Observability

**User Story:** As a backend engineer, I want reproducible benchmark commands and observable metrics, so that the article's performance claims can be independently verified.

#### Acceptance Criteria

1. THE Rust_Experiment README SHALL provide `wrk` or `curl`-based load-test commands for each of the three `/compute` strategies (`blocking`, `spawn_blocking`, and `bounded`), including the target URL, concurrency level, and duration used in the benchmark.
2. THE Rust_Experiment README SHALL document the expected observable outcome for each strategy, specifying: `/health` p99 latency in milliseconds, `/compute` throughput in requests per second, and error rate as a percentage of total requests, all measured under a load of 50 concurrent connections sustained for 30 seconds.
3. WHEN the `/compute` endpoint receives 50 concurrent requests using `strategy=blocking` for 30 seconds, THE Rust_Experiment SHALL produce `/health` p99 latency above 100 ms, demonstrating async worker thread starvation.
4. WHEN the `/compute` endpoint receives 50 concurrent requests using `strategy=spawn_blocking` for 30 seconds, THE Rust_Experiment SHALL produce `/health` p99 latency at or below 5 ms, demonstrating that async worker threads remain free.
5. THE Rust_Experiment SHALL output per-request latency to stdout with each line containing the strategy name, request completion timestamp in milliseconds since epoch, and observed latency in milliseconds, enabling construction of the benchmark result tables in the article.
6. IF the `/compute` endpoint returns an error response during a load test run, THEN THE Rust_Experiment SHALL count and output the total error count alongside throughput results, so that error rate can be calculated and reported in the article.

---

### Requirement 5: Article Visualizations

**User Story:** As a reader, I want clear diagrams embedded in the article, so that I can visualise the architecture and execution flow without leaving the page.

#### Acceptance Criteria

1. THE Article_File SHALL contain an ASCII or Mermaid diagram showing Tokio's execution architecture, with each of the following five elements present and individually labelled: async tasks, worker threads, the I/O driver, the blocking thread pool, and OS threads.
2. THE Article_File SHALL contain an ASCII or Mermaid diagram showing the request execution timeline, with `.await` suspension points and Waker notifications each explicitly labelled as distinct stages in the flow of a single HTTP request.
3. THE Article_File SHALL contain a comparison table or diagram illustrating the difference between executing CPU work directly in an async handler versus offloading it with `spawn_blocking`, covering at least two dimensions: event-loop blocking behaviour and per-request latency impact.
4. THE Article_File SHALL contain a benchmark results table comparing three experiment strategies — direct async execution (`blocking`), `spawn_blocking` offload, and bounded `spawn_blocking` — with at least two columns of measured metrics: p50 latency (in milliseconds) and throughput (in requests per second), for both the `/health` and `/compute` endpoints.
5. WHERE a custom MDX component for the Tokio architecture diagram is registered in `keystatic.config.ts`, THE Article_File SHALL reference it using a self-closing JSX tag with a PascalCase component name, in the same syntactic form used for `<NodeProcessDiagram />` in the Node.js article.

---

### Requirement 6: Draft Experiment MDX Metadata File

**User Story:** As a blog author, I want a companion experiment metadata file, so that the experiment appears at `/experiments/rust-tokio-blocking` during local development and can be linked from the article.

#### Acceptance Criteria

1. THE Experiment_File SHALL exist at `src/content/experiments/rust-tokio-blocking.mdx`.
2. THE Experiment_File SHALL contain a frontmatter field `status` set to `draft`.
3. THE Experiment_File SHALL contain a frontmatter field `hypothesis` describing the expected scheduler starvation behaviour when blocking work is executed on async worker threads.
4. THE Experiment_File SHALL contain a frontmatter field `keyFindings` listing at minimum three findings derived from the benchmark results (health latency impact, spawn_blocking isolation, bounded concurrency behaviour).
5. THE Experiment_File SHALL contain a frontmatter field `relatedArticleSlug` set to `rust-async-runtime`.
6. THE Experiment_File SHALL contain a frontmatter field `githubRepo` whose value is a valid URL pointing to the repository path of the Rust experiment (e.g., `https://github.com/huyhoang1001/underhood/tree/main/experiments/rust-tokio-blocking`).
7. WHEN `astro check` is run, THE Content_Schema SHALL accept the Experiment_File frontmatter without validation errors.
8. THE Experiment_File frontmatter SHALL include all fields required by the `experimentsCollection` Zod schema defined in `src/content/config.ts`, including `tagline`, `date`, `topic`, `setup`, and `implementation`.

---

### Requirement 7: Keystatic and Schema Compatibility

**User Story:** As a blog author using the Keystatic admin panel, I want the new article and experiment to be manageable through the existing CMS interface, so that I can edit and update content without touching raw files.

#### Acceptance Criteria

1. WHEN a request is made to `/writing/rust-async-runtime` in local development, THE Frontend_System SHALL respond with an HTTP 200 status and render the Article_File content as HTML without throwing runtime errors.
2. WHEN a request is made to `/experiments/rust-tokio-blocking` in local development, THE Frontend_System SHALL respond with an HTTP 200 status and render the Experiment_File content as HTML without throwing runtime errors.
3. THE Article_File frontmatter fields and THE Experiment_File frontmatter fields SHALL each conform to their respective Keystatic collection schemas, such that both entries are listed and editable in the Keystatic admin panel without validation errors.
4. WHERE a new MDX component is added for the article, THE `keystatic.config.ts` SHALL register that component as a `block` entry in the `articles` collection's `content` field components map, and THE corresponding `.astro` island file SHALL exist in `src/components/` and be passed to the `Content` renderer in `src/pages/writing/[slug].astro`.
5. THE Article_File frontmatter field `relatedExperiments` SHALL contain exactly one entry with the value `rust-tokio-blocking`.
6. WHEN the article page at `/writing/rust-async-runtime` is rendered, THE Frontend_System SHALL display a navigable link to `/experiments/rust-tokio-blocking` that returns an HTTP 200 response when followed.

---

### Requirement 8: Node.js Comparison Accuracy

**User Story:** As a backend engineer familiar with Node.js, I want the comparison section to use precise, verifiable terminology, so that I can correctly map my existing mental model to Rust's async model.

#### Acceptance Criteria

1. THE Article_File SHALL contain a dedicated comparison section introduced by a heading whose visible text includes the word "Node.js".
2. THE Article_File comparison section SHALL state that Tokio worker threads correspond to Node.js's single-threaded Event Loop polling concept and that, unlike Node.js, Tokio runs multiple such pollers concurrently.
3. THE Article_File comparison section SHALL state that `spawn_blocking` corresponds to Node.js's `libuv` worker thread pool, and that both mechanisms exist to handle work that blocks without yielding cooperatively.
4. THE Article_File comparison section SHALL state that Rust has no equivalent of `UV_THREADPOOL_SIZE` as a fixed pool limit, because Tokio's blocking thread pool grows dynamically up to a configurable ceiling whose default value is 512 threads.
5. THE Article_File comparison section SHALL include a code example contrasting the Node.js pattern for offloading CPU-bound blocking work (using `crypto.pbkdf2` with a callback) with the Rust pattern for the same use-case (using `tokio::task::spawn_blocking` with a closure), presented in a side-by-side code block or two-column table.
6. THE Article_File SHALL list the companion Node.js article's title in the `relatedArticles` frontmatter field and SHALL include an inline hyperlink to that article within the comparison section body.

---

### Requirement 9: Content Quality and Style Consistency

**User Story:** As the blog editor, I want the new article to match the technical depth, prose style, and structural conventions of the existing Node.js article, so that the blog feels like a coherent series.

#### Acceptance Criteria

1. THE Article_File SHALL open its first section with a statement that presents a measurable or documented contradiction about Tokio's or Rust's async runtime behavior (such as an unexpected benchmark result, a counterintuitive default, or a documented limitation), placed within the first two paragraphs, before any background explanation is provided.
2. THE Article_File SHALL include at least one warning callout that is visually or structurally distinct from body prose — marked with a blockquote, bold heading, or admonition prefix (e.g., "⚠ Warning:" or "> **Warning:**") — and that identifies a specific, non-obvious misuse pattern of `spawn_blocking` or Tokio async primitives that can cause correctness or performance problems in production.
3. THE Article_File SHALL include a dedicated section containing a decision diagram — rendered as ASCII art or a Mermaid diagram — that covers all three branches of the question: when to use async, when to use `spawn_blocking`, and when to use OS threads, with each branch terminating in a concrete recommendation.
4. IF the Article_File contains a performance claim, THEN THE Article_File SHALL express that claim with a numeric value and unit (e.g., latency in milliseconds, throughput in requests per second, or thread count) sourced from either the article's own experiment results or a cited Tokio documentation page.
5. THE Article_File SHALL assume reader familiarity with at least one compiled or systems language (such as C, C++, Go, or Rust) and with concurrent programming concepts (such as threads, locks, and async I/O), and SHALL NOT define or explain these foundational concepts beyond a single disambiguating sentence where terminology differences exist between languages.

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
