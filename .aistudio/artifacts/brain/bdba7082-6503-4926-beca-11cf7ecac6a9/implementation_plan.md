# Underhood — Independent Personal Engineering Publication

Underhood is an independent, production-grade personal engineering publication for a senior software engineer covering distributed systems, backend engineering, performance, architecture, reproducible experiments, and hard-earned production lessons. The platform prioritizes serious technical long-form reading, interactive architecture diagrams, live experiment telemetry, and lightning-fast instant search.

***

## User Review & Critical Decisions

> [!IMPORTANT]
> The application is engineered as a high-performance web publication optimized for instant navigation, rich MDX technical authoring, zero-latency full-text search, and reproducible engineering experiments. 

- **Confirmed Architectural Posture**: Client-side single-page architecture built with React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, and Motion, with full static-like client routing, zero runtime layout shift, and instant client-side full-text search.
- **Visual Design Identity**: Deep charcoal dark-mode first (`#0e1117`, `#161b22`) with an authentic warm alabaster/paper light-mode (`#fbf9f5`, `#f2ede4`), restrained electric blue accents (`#38bdf8` / `#0284c7`), clean unboxed metadata with typographic separators (strictly obeying zero-pill discipline), and no fake telemetry slop.
- **Reading Engine**: Full typography control, automatic table of contents with active IntersectionObserver scroll tracking, reading progress bar, syntax-highlighted code blocks with language/filename tabs and copy button, inline Mermaid-style architecture diagrams, callouts, and footnote tooltips.
- **Engineering Laboratory (`/experiments`)**: Interactive reproducible technical experiments featuring hypothesis, system topology, test harnesses, live interactive telemetry controls (e.g. queue backpressure simulation, p99 latency curve explorer), and reproducible benchmark manifests.
- **Search System**: Global Command Palette (`Cmd+K` / `Ctrl+K`) and dedicated query filtering with keyword highlighting, topic facets, keyboard navigation, and instant local indexing.

***

## 1. Overview & Core Concept

- **What It Does**: Underhood delivers an editorial publication designed for deep technical reading. It provides five core views:
  1. **Home (`/`)**: Wordmark header, engineering statement, lead featured investigation, recent essays, topic gateways, active experiment spotlights, and author profile.
  2. **Writing (`/writing`)**: Filterable, searchable catalog of deep-dive articles with reading times, topic facets, tags, and publication timestamps.
  3. **Article Detail (`/writing/:slug`)**: High-fidelity long-form reader with dynamic TOC, reading progress, code copy affordances, callout blocks, architecture diagrams, and footnote references.
  4. **Topics (`/topics` & `/topics/:slug`)**: Curated engineering domains (Distributed Systems, Backend Engineering, Performance, System Design, Cloud & Infrastructure, Engineering Experiments, Lessons Learned) with specialized track overviews.
  5. **Engineering Lab (`/experiments` & `/experiments/:slug`)**: Structured technical reports on distributed systems experiments (e.g. "Bounded Queues vs. Drop-Tail Under Sudden Bursts", "gRPC HTTP/2 Stream Multiplexing Saturation") with interactive visualizers.
  6. **About (`/about`)**: Senior engineer background, core architectural principles, open-source projects, and contact channels.
- **Target Audience / Persona**: Staff and Principal engineers, systems architects, backend developers, and performance engineers who appreciate deep, rigorous technical writing over promotional summaries.
- **Key Value**: Explores not only *how* software works, but *why* it works, *what breaks*, and *what happens under pressure*.

***

## 2. User Experience & Visual Design

### Visual Identity & Theme Tokens
- **Dark Mode (Default)**:
  - Surface Canvas: Deep charcoal `#0d1117` / `#161b22` (GitHub / Terminal inspired, not harsh pure `#000000`).
  - Elevated Cards / Containers: `#1c2128` with subtle hairline border `#30363d`.
  - Body Text: `#e6edf3` (high legibility, optical compensation).
  - Muted Text / Metadata: `#8b949e`.
  - Accent / Focus: Electric Cyan/Blue `#38bdf8` (restrained, max 10% budget).
- **Light Mode (Warm Archival Paper)**:
  - Surface Canvas: Archival warm paper `#fbf9f5`.
  - Elevated Cards / Containers: `#ffffff` with hairline `#e7e3da`.
  - Body Text: Ink charcoal `#1c1917`.
  - Muted Text / Metadata: `#78716c`.
  - Accent: Royal Slate Blue `#0284c7`.
- **Typography**:
  - Headings & Wordmark: Plus Jakarta Sans / Inter Display with tight letter-spacing (`tracking-tight font-semibold`).
  - Long-Form Reading Body: High-readability serif / clean sans prose (`leading-relaxed`, line length constrained to `65–75ch`).
  - Code & Data Numerals: JetBrains Mono / monospace with tabular numbers (`tabular-nums font-mono`).
- **Anti-Slop Discipline**:
  - No static pills or badges for tags/categories (clean unboxed text with `·` separators).
  - No code comments in titles (`// 01 ARCHITECTURE` is banned).
  - No thick left accent borders (`border-l-4`).
  - No decorative status dots or fake uptime tickers.

### Key User Flows
```
┌──────────────┐     Cmd+K / Search      ┌─────────────────────────┐
│  Homepage    │ ──────────────────────> │  Command Palette Modal  │
└──────┬───────┘                         └───────────┬─────────────┘
       │                                             │
       │ Click article / topic                       │ Select result
       ▼                                             ▼
┌──────────────┐     Select Article      ┌─────────────────────────┐
│ Writing Hub  │ ──────────────────────> │ Long-Form Article View  │
│  & Filters   │                         │ (TOC, Code, Progress)   │
└──────────────┘                         └─────────────────────────┘
       │
       │ Navigate to Experiments
       ▼
┌───────────────────────────────┐        ┌─────────────────────────┐
│ Engineering Laboratory Hub    │ ─────> │ Interactive Experiment  │
│ (/experiments)                │        │ (Live telemetry & math) │
└───────────────────────────────┘        └─────────────────────────┘
```

***

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Content Engine & MDX Architecture**
  - *Chosen Approach*: Curated typed content models with MDX-compatible AST parsing and rich interactive React components (`<Callout>`, `<CodeBlock>`, `<ArchitectureDiagram>`, `<ExperimentVisualizer>`, `<ComparisonTable>`).
  - *Why*: Allows seamless authoring of real markdown/frontmatter while rendering live, interactive diagramming and simulation widgets directly inline without fragile external iframe dependencies.
  - *Alternatives Considered*: Pure static markdown string replacement (too limited for diagrams) vs. heavy external CMS (unnecessary complexity, violates requirement to avoid databases/CMS).
- **Decision 2: Instant Search Architecture**
  - *Chosen Approach*: Client-side inverted index generator with fuzzy substring matching and instantaneous `Cmd+K` keyboard palette.
  - *Why*: Zero network latency, instant feedback, supports keyboard arrow navigation, matches title, excerpt, tags, and full body content with highlighted excerpts.
- **Decision 3: Interactive Engineering Laboratory**
  - *Chosen Approach*: Built-in interactive simulations modeling queuing theory (Little's Law, token bucket rate limiter, drop-tail vs bufferbloat queue dynamics) with live sliders, latency percentiles (p50, p95, p99), and SVG dynamic distribution graphs.
  - *Why*: Delivers an unforgettable, hands-on demonstration of engineering principles under pressure.

***

## 4. Technical Architecture & Data Strategy

### System & Component Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Underhood Web Client                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Navigation Header: Wordmark | Writing | Topics | Lab | About     │  │
│  │                    [Cmd+K Search] [Theme Toggle]                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Reading Progress Rail (Active during article reading)            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Active Route View:                                               │  │
│  │  ├─ HomeView (Hero, Lead Story, Grid, Topics, Lab Highlights)    │  │
│  │  ├─ WritingView (Topic filters, search bar, article cards)       │  │
│  │  ├─ ArticleView (Header, Sidebar TOC, MDX Prose, Visualizer)     │  │
│  │  ├─ TopicsView / TopicDetailView (Domain taxonomy & essays)      │  │
│  │  ├─ ExperimentsView / ExperimentDetailView (Live Lab Visualizers)│  │
│  │  └─ AboutView (Author philosophy, principles, selected work)     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Footer: RSS feed, GitHub, Newsletter, Copyright, Back to top     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Global Modals: CommandPalette (Full-Text Search), ShareDialog    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Content Schema

```typescript
export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  topic: TopicId;
  tags: string[];
  featured: boolean;
  draft: boolean;
  githubUrl?: string;
  content: string; // Markdown / MDX body
  toc: { id: string; title: string; level: number }[];
  relatedSlugs: string[];
}

export interface Experiment {
  slug: string;
  title: string;
  tagline: string;
  date: string;
  topic: TopicId;
  hypothesis: string;
  setup: string;
  implementation: string;
  keyFindings: string[];
  limitations: string[];
  githubRepo: string;
  relatedArticleSlug?: string;
  interactiveType: 'queue-backpressure' | 'grpc-multiplex' | 'cache-invalidation';
}
```

### Step-by-Step Implementation Strategy

1. **Step 1: Theme & Styling Foundation**
   - Configure Tailwind CSS v4 dual-theme variables (`@custom-variant dark (&:where(.dark, .dark *));`) in `src/index.css`.
   - Update `metadata.json` and `index.html` with production title, descriptions, open graph tags, and favicon.
   - Establish design tokens (surface canvas, text contrast, code colors).

2. **Step 2: Core Components & Layout Shell**
   - Create TopBar navigation following the strict 3-zone contract (Wordmark, Nav links, Action buttons).
   - Implement ThemeProvider and ThemeToggle (Dark/Light with localStorage persistence).
   - Implement ReadingProgressBar with smooth compositor scroll binding.
   - Implement CommandPalette (`Cmd+K` / `Ctrl+K`) with instant keyboard navigation.

3. **Step 3: Content Repository & Pipeline**
   - Populate production-grade sample articles:
     1. *"Backpressure Is Not an Overload Policy"* (Deep dive into TCP flow control vs application backpressure vs shed policies).
     2. *"Understanding gRPC Flow Control"* (HTTP/2 stream windows, client buffers, and head-of-line blocking).
     3. *"What Happens When a Queue Grows Without Bounds?"* (Bufferbloat, memory leaks, latency tail explosions).
     4. *"Inside a Distributed System Failure"* (Cascading retries, thundering herds, and circuit breaker geometry).
   - Populate engineering experiments with reproducible lab simulations:
     1. *"Bounded Queues vs Drop-Tail Under Sudden Traffic Spikes"* (Interactive queue simulator with arrival rates, service rates, and drop policies).
     2. *"gRPC HTTP/2 Stream Multiplexing Saturation"* (Interactive stream window visualizer).

4. **Step 4: Long-Form Reader Experience**
   - Markdown/MDX component renderer supporting:
     - Interactive CodeBlock with syntax highlighting, language label, filename header, copy button with check feedback.
     - ArchitectureDiagram (interactive SVG/Mermaid flowcharts with node inspectability).
     - Callout blocks (Note, Warning, Insight, Principle).
     - ComparisonTable with tabular numbers and highlighted metrics.
     - Footnotes with anchor jump and hover previews.
     - Auto-generated Table of Contents with active heading spy.
     - Social share and link-copy controls.

5. **Step 5: Discovery, Topics, Experiments & About**
   - Build `/writing` index with topic filters, search filter, and tag chips.
   - Build `/topics` and topic landing views.
   - Build `/experiments` interactive lab workspace.
   - Build `/about` with engineering philosophy, core tenets, and links.
   - Implement RSS feed modal / exporter and site map representation.

6. **Step 6: Quality, Verification & Packaging**
   - Run compilation and linting checks.
   - Validate responsive design across mobile (375px), tablet (768px), and desktop (1440px).
   - Verify zero-pill metadata compliance, zero broken buttons, and keyboard accessibility.
