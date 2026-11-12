# Underhood Article Writing Style

This steering file applies to all article writing in `src/content/articles/`. Follow these guidelines whenever writing or editing MDX articles for this blog.

## Voice and tone

Write like a senior engineer explaining something to a curious colleague — not like documentation, not like a research paper. The reader is technically capable but may not be familiar with the specific system being explained.

- Use plain, direct English. Avoid unnecessarily sophisticated vocabulary.
- Short sentences over dense paragraphs.
- Friendly, curious, technically confident. Never condescending or performative.
- No marketing language. No dramatic claims. No "blazing fast" or "revolutionary".
- Technical accuracy is non-negotiable. Simplicity and accuracy are not in conflict.

**Replace this:**
> "Tokio employs a cooperative, work-stealing scheduler to multiplex futures across a bounded pool of worker threads."

**With this:**
> "Tokio has a set of worker threads. Each worker runs async tasks. When a task needs to wait — for a database response, a network read — it pauses and lets the worker handle something else."

Then introduce the precise term ("work-stealing scheduler") only when the reader already understands the behaviour it describes.

## Teaching order

Always build understanding from the ground up. Never introduce a term before the reader has an intuition for what it does.

For any new concept, follow this sequence:
1. **Familiar anchor** — start with something the reader already knows (Node.js, OS threads, HTTP requests)
2. **Observable behaviour** — describe what actually happens, in plain words
3. **Why it matters** — connect it to the problem or question being explored
4. **Precise term** — now introduce the technical name

Example order for a Tokio article:
1. What is an OS thread? (where code runs)
2. What is a Tokio worker thread? (an OS thread that runs async tasks)
3. What is an async task? (work that can pause and let the thread do something else)
4. What is spawn_blocking? (send synchronous work to a separate thread so the worker stays free)
5. What is scheduler starvation? (all workers occupied, nothing else can run)

## Structural patterns

### Opening
Every article opens with a concrete, observable contradiction — something the reader can run and measure. The contradiction should be resolvable only by understanding the system being explained. State it clearly in the first three paragraphs. Avoid abstract scene-setting.

### Sections
Use natural questions as section bridges, not just headings. For example:
- "So why can't Tokio just use the same threads for everything?"
- "What does this mean for a server under load?"
- "How does Node.js handle this differently?"

Questions tell the reader where the article is going and why they should keep reading.

### Code examples
Every code example should demonstrate a specific, narrow point. Add a comment on the line that matters:

```rust
run_blocking_work(); // 100ms busy-wait — HOLDS THE WORKER THREAD
```

Don't show more code than the concept requires.

### Diagrams
Use diagrams to show relationships and timelines, not to repeat what the text already says. The sequence diagram showing `.await yield — worker thread released` is a good example: it shows the timing that prose can't convey clearly.

Mermaid diagrams are supported in MDX via the remark plugin. Use ` ```mermaid ` fenced blocks.

### Conclusion
The conclusion should restate the core mental model in one or two sentences. No new information. No list of bullet points repeating everything. Just the thing the reader should remember.

## What to avoid

- Avoid introducing multiple new terms in the same sentence.
- Avoid paragraphs that explain something abstract before making it concrete.
- Avoid repeating the same explanation in multiple sections — say it once, clearly.
- Avoid the word "simply" — if something is simple, demonstrate it; don't claim it.
- Avoid passive voice when active voice is available.
- Avoid "note that", "it is worth mentioning", "as we can see".

## Article structure

Every article should follow this skeleton:

1. **Opening contradiction** — a concrete, measurable thing that shouldn't happen but does
2. **Question** — what is the system doing that causes this?
3. **Ground-up explanation** — build the mental model from first principles
4. **Experiment** — show the behaviour empirically with real code and benchmarks
5. **Fix** — explain the correct pattern and why it works
6. **Production guidance** — decision flowchart or rules of thumb
7. **Conclusion** — one-sentence corrected mental model

## Component usage

### Architecture diagrams (article body)

These components belong in the article MDX body. Place them immediately after the opening section, before the first `##` heading — same position each time.

- `<TokioArchitectureDiagram />` — interactive 5-layer Tokio architecture map
- `<NodeProcessDiagram />` — interactive Node.js process layer map
- `<GoSchedulerDiagram />` — interactive 5-layer Go M:N scheduler map

### Interactive simulators (experiment page only)

Simulators and visualizers that let the reader play with parameters belong on the **experiment page**, not in the article body. They are registered as `interactiveType` values in the experiment MDX frontmatter and rendered by `ExperimentVisualizer` on `src/pages/experiments/[slug].astro`.

**Rule: never embed a simulator component directly in an article MDX file.**

| Component | interactiveType value | Experiment page |
|---|---|---|
| `<NodeThreadpoolVisualizer />` | `node-threadpool` | `/experiments/nodejs-libuv-threadpool` |
| `<TokioSchedulerVisualizer />` | `tokio-scheduler` | `/experiments/rust-tokio-blocking` |
| `<GoSchedulerSimulator />` | `go-scheduler` | `/experiments/golang-goroutines` |

To add a new simulator:
1. Build the React component in `src/components/`
2. Add a new `interactiveType` enum value to `src/content/config.ts`, `src/lib/content/schema.ts`, `src/types/index.ts`, `src/layouts/ExperimentLayout.astro`, and `keystatic.config.ts`
3. Add the case to `src/components/ExperimentVisualizer.tsx`
4. Set `interactiveType: <value>` in the experiment MDX frontmatter

The article body links to the experiment page automatically via the `relatedExperiments` frontmatter array — no manual linking needed.

### Mermaid diagrams

` ```mermaid ` fenced blocks are rendered via the Mermaid JS remark plugin. Place them inline where they clarify the surrounding text — typically inside a section, not at the top level. Use for flowcharts, sequence diagrams, and relationship graphs that prose cannot convey clearly.

## Technical accuracy requirements

- Benchmark tables must be labelled as "expected outcomes" until real measurements are run.
- Code snippets must match the actual experiment server code in `experiments/`.
- When quoting latency numbers, specify the percentile (p50, p99) and the conditions (concurrency, machine).
- Node.js comparisons must reflect the libuv architecture accurately — `UV_THREADPOOL_SIZE=4` by default, fixed (not dynamic).
- Tokio blocking pool ceiling is 512 threads by default and is configurable via `Builder::max_blocking_threads`.

## Example of the target tone

This is from the Rust async runtime article — use it as a reference:

> There's no `.await` inside `run_blocking_work()`. That means the worker thread running this handler is occupied for the full 100ms and can't do anything else. It can't run `/health`. It can't process other requests. It just sits there spinning.
>
> With 8 worker threads and 50 concurrent requests, all 8 threads get tied up almost immediately. Every thread is running a 100ms busy-wait. The `/health` handler is waiting in the queue with no thread available to run it.
>
> That's **scheduler starvation**. No bug. No race condition. Just a worker pool with no capacity left.

Notice: concrete numbers, plain English, no jargon introduced before the behaviour, the term defined after the behaviour is already clear.
