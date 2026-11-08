# Underhood Content Authoring & Keystatic Workflow Guide

## Overview
Underhood uses a file-based, Git-backed content architecture powered by **Keystatic** and **Astro Content Collections**. GitHub remains the single source of truth for all content.

---

## 1. Editing via Keystatic Admin Panel

1. Start the local server:
   ```bash
   npm run dev
   ```
2. Navigate to:
   ```
   http://localhost:3000/keystatic
   ```
3. Use the visual editor to create, update, or publish:
   - **Articles:** Saved to `src/content/articles/*.mdx`
   - **Experiments:** Saved to `src/content/experiments/*.mdx`

---

## 2. Managing Drafts vs. Published Content

- **Draft Mode:** Set `status: draft` in frontmatter.
  - **Local Development (`npm run dev`):** Previewable at `/writing/[slug]` or `/experiments/[slug]`.
  - **Production Build (`npm run build`):** Excluded from static generation, RSS feeds, sitemaps, and search index. Returns a 404 if accessed directly in production.
- **Published Mode:** Set `status: published` in frontmatter to include the article in production builds and RSS feeds.

---

## 3. Directory Layout

```
src/content/
├── config.ts                    # Zod Content Collections Schemas
├── articles/
│   └── nodejs-single-threaded.mdx # Article MDX files
└── experiments/
    └── nodejs-threadpool.mdx      # Experiment MDX files
```

---

## 4. Custom MDX Components

You can embed interactive React components directly inside MDX content files:

- `<NodeProcessDiagram />` — Interactive 5-layer Node.js runtime process inspector
- `<NodeThreadpoolVisualizer />` or `<ThreadPoolVisualizer />` — Interactive libuv worker thread queue simulator
