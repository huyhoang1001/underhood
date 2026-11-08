# Architectural Migration Plan — Underhood to Astro + Keystatic

Migrate **Underhood** from its existing React + Vite SPA architecture to a static-first **Astro + Keystatic** publication platform. Public pages will be statically generated for maximum performance, security, and SEO, while Keystatic provides a local Git-backed content management experience without a database or third-party CMS backend.

---

## User Review & Confirmed Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed in Phase 1 interactive alignment:

- **Keystatic Admin Route**: Confirmed as `/keystatic` for the local content editing dashboard.
- **Astro Output Strategy**: Confirmed as **Static public pages with hybrid Keystatic admin** (`output: 'hybrid'` / static default with `export const prerender = false` for `/keystatic` admin API endpoints).
- **Migration Execution**: Confirmed as **Direct in-place migration**, replacing Vite entry points with Astro routing while preserving all MDX content, React interactive components, Tailwind styling, and unit test suites.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms Underhood into a Git-native Astro static blog with typed content schemas, server-rendered MDX articles, zero-JS static HTML for prose reading, and hydrated React islands for interactive architecture & threadpool visualizers.
- **Target Audience**: Senior backend, distributed systems, and performance engineers looking for deep, reproducible technical publications.
- **Key Value**: Instant static page loads, full SEO search engine indexability, typed frontmatter validation, and a local visual MDX editor (Keystatic) backed entirely by Git.

---

## 2. User Experience & Visual Design

- **Visual Identity Preservation**: Retain Underhood's deep charcoal dark theme (`#0d1117`), warm paper light theme (`#fbf9f5`), electric blue accent (`#0284c7`), and zero-pill typographic metadata discipline.
- **3-Zone Header Contract**: Maintain clean single-line navigation (`Underhood` wordmark, `Writing`, `Topics`, `Experiments`, `About`, Cmd+K Search modal button, RSS modal button, Light/Dark toggle).
- **Page Layouts & Routing**:
  - `/` → Static Editorial Homepage featuring recent essays, lab spotlights, topic taxonomy, and editorial tenets.
  - `/writing` → Static essay index with search and topic/tag filters.
  - `/writing/[slug]` → Static MDX article reader with reading time, table of contents, and hydrated React diagrams.
  - `/experiments` & `/experiments/[slug]` → Static engineering laboratory reports with interactive React telemetry simulators.
  - `/topics` & `/topics/[slug]` → Static domain taxonomy indexes.
  - `/about` → Static author profile and engineering principles.
  - `/keystatic` → Hybrid local Keystatic CMS dashboard for visual MDX authoring.
- **Draft Isolation**: Drafts (`status: draft`) are rendered in local dev preview, but strictly excluded from production SSG builds, RSS feeds, sitemaps, search indexes, and production route generation (returns 404).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Astro Content Collections over Custom Loader**
  - *Chosen Approach*: Replace custom Vite glob parser (`src/lib/content/index.ts`) with Astro's native `defineCollection` and `zod` schemas (`src/content/config.ts`).
  - *Why*: Provides native build-time type safety, automatic slug handling, and built-in `<Content />` component rendering without custom markdown parsing logic.
- **Decision 2: Hybrid Output Mode (`output: 'hybrid'` / `'static'` with SSR endpoints)**
  - *Chosen Approach*: Build all public content statically at compile time, leaving `/keystatic` admin API routes dynamically served during local development.
  - *Why*: Guarantees zero server overhead, top-tier TTFB, and offline reliability for public visitors while keeping Keystatic local editing functional.
- **Decision 3: React Islands with Selective Hydration**
  - *Chosen Approach*: Wrap interactive components in MDX or Astro pages with targeted directives (`client:visible` for `<NodeProcessDiagram />` and `<NodeThreadpoolVisualizer />`; `client:idle` for search/RSS modals).
  - *Why*: Eliminates client JavaScript bundle overhead for article prose reading while preserving rich interactive canvas simulations.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Astro Static Site & CMS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │   Content Collections     │         │       Keystatic Admin         │   │
│   │                           │         │       (Local Node/SSR)        │   │
│   │  content/articles/*.mdx   │         │          /keystatic           │   │
│   │  content/experiments/*.mdx│         └───────────────┬───────────────┘   │
│   └─────────────┬─────────────┘                         │                   │
│                 │ (Build-time validation & SSG)         │ (Local Git edit)  │
│                 ▼                                       ▼                   │
│   ┌───────────────────────────┐         ┌───────────────────────────────┐   │
│   │    Astro Static Pages     │         │      Local Git Repository     │   │
│   │  /writing, /experiments,  │         │   (No external DB/CMS)        │   │
│   │  /topics, /about, /404    │         └───────────────────────────────┘   │
│   └─────────────┬─────────────┘                                             │
│                 │ (Hydrates only visualizers)                               │
│                 ▼                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  React Islands: NodeProcessDiagram, NodeThreadpoolVisualizer        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Content Collections Schema (`src/content/config.ts`)

```typescript
import { defineCollection, z } from 'astro:content';

const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    description: z.string(),
    date: z.string(),
    status: z.enum(['draft', 'published']).default('draft'),
    topic: z.enum([
      'distributed-systems',
      'backend-engineering',
      'performance',
      'system-design',
      'cloud-infrastructure',
      'engineering-experiments',
      'lessons-learned'
    ]),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    relatedArticles: z.array(z.string()).default([]),
    relatedExperiments: z.array(z.string()).default([]),
    githubUrl: z.string().url().optional()
  })
});

const experimentsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    tagline: z.string(),
    date: z.string(),
    status: z.enum(['draft', 'published']).default('draft'),
    topic: z.enum([
      'distributed-systems',
      'backend-engineering',
      'performance',
      'system-design',
      'cloud-infrastructure',
      'engineering-experiments',
      'lessons-learned'
    ]),
    hypothesis: z.string(),
    setup: z.string(),
    implementation: z.string(),
    keyFindings: z.array(z.string()),
    limitations: z.array(z.string()).default([]),
    githubRepo: z.string().url(),
    relatedArticleSlug: z.string().optional(),
    interactiveType: z.enum(['node-threadpool', 'queue-backpressure', 'grpc-multiplex', 'cache-invalidation']).optional()
  })
});

export const collections = {
  articles: articlesCollection,
  experiments: experimentsCollection
};
```

---

## 5. Migration Execution Strategy & Phasing

### Phase 1 — Astro Migration
1. **Dependencies**: Install `astro`, `@astrojs/mdx`, `@astrojs/react`, `@astrojs/tailwind`, `@astrojs/sitemap`, `rss`.
2. **Astro Config**: Create `astro.config.mjs` with React, MDX, Tailwind, and Node/static adapters.
3. **Content Collections**: Define `src/content/config.ts` and move/verify files under `src/content/articles/` and `src/content/experiments/`.
4. **Astro Layouts & Pages**: Create `BaseLayout.astro`, `ArticleLayout.astro`, `ExperimentLayout.astro`, and Astro routes (`src/pages/index.astro`, `src/pages/writing/index.astro`, `src/pages/writing/[slug].astro`, `src/pages/experiments/index.astro`, `src/pages/experiments/[slug].astro`, `src/pages/topics/index.astro`, `src/pages/topics/[slug].astro`, `src/pages/about.astro`, `src/pages/rss.xml.ts`, `src/pages/404.astro`).
5. **React Islands**: Mount interactive diagrams (`NodeProcessDiagram`, `NodeThreadpoolVisualizer`, `CommandPalette`, `RssModal`) with `client:visible` or `client:idle`.
6. **Phase 1 Verification Gate**: Run `astro check`, `npm run build`, and Vitest test suite.

### Phase 2 — Keystatic Integration
1. **Dependencies**: Install `@keystatic/core` and `@keystatic/astro`.
2. **Config**: Create `keystatic.config.ts` configured for local storage, mapping `articles` and `experiments` collections with frontmatter fields and MDX document editor.
3. **Keystatic Admin Page**: Create `src/pages/keystatic/[...params].astro`.
4. **Verification**: Verify local editing at `/keystatic`, frontmatter saving, and MDX round-tripping.
5. **Cleanup**: Remove obsolete Vite SPA entry points (`src/main.tsx`, Vite-only index parsing) and update `package.json` scripts (`"dev": "astro dev"`, `"build": "astro build"`).
