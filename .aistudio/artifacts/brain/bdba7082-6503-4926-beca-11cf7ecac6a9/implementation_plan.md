# Implementation Plan — Restore Styling & Stabilize Astro + Keystatic Architecture

## Executive Summary
This plan details the step-by-step restoration of Underhood's visual design system, Tailwind v4 CSS pipeline, React component hydration, content directory consolidation, Keystatic MDX component block configuration, and Astro architecture stabilization.

---

## User-Confirmed Architectural Decisions
1. **Tailwind CSS Pipeline:** Use Tailwind v4 via `@tailwindcss/vite` in `astro.config.mjs`.
2. **Canonical Content Directory:** `src/content/` as the single source of truth for articles and experiments.
3. **Keystatic MDX Components:** Register custom `componentBlocks` in `keystatic.config.ts` for interactive React islands (`NodeProcessDiagram`, `NodeThreadpoolVisualizer`) so Keystatic edits are 100% round-trip safe.

---

## Step-by-Step Implementation Strategy

### Phase 1 — Diagnose and Fix Missing CSS (High Priority)
- **CSS Import:** Verify `BaseLayout.astro` imports `import '../index.css';`.
- **Tailwind v4 Integration:**
  - In `astro.config.mjs`, mount `tailwindcss()` from `@tailwindcss/vite` inside the `vite.plugins` array.
  - In `src/index.css`, maintain `@import "tailwindcss";` and `@custom-variant dark (&:where(.dark, .dark *));`.
  - Ensure dark/light mode CSS classes (`dark`, `light`) on `<html>` apply proper background (`#0d1117` dark / `#fbf9f5` light) and typography colors (`#f0f6fc` dark / `#1c1917` light).
- **Typography & Fonts:**
  - Verify Google Fonts loading ('Plus Jakarta Sans', 'JetBrains Mono') in `BaseLayout.astro`.
  - Ensure zero-pill metadata, card borders (`#30363d` dark / `#e7e3da` light), code blocks, callouts, and responsive headers match the original visual design system.

### Phase 2 — Restore React Interactivity & Hydration
- **Layout Islands:**
  - Ensure `<HeaderNav client:load currentPath={Astro.url.pathname} />` and `<FooterNav client:load />` hydrate cleanly without hydration mismatches.
- **MDX Interactive Components:**
  - Ensure MDX pages (`/writing/[slug]` and `/experiments/[slug]`) pass `<NodeProcessDiagram client:visible />`, `<NodeThreadpoolVisualizer client:visible />`, and `<ExperimentVisualizer client:visible />` through Astro's MDX `<Content components={{ ... }} />`.
  - Verify interactive controls (5-layer process inspector tab switching, thread pool worker queue simulation slider, command palette `Cmd+K`, theme toggle) work smoothly in the browser.

### Phase 3 — Content Directory Consolidation
- **Audit & Compare:**
  - Inspect `/content/` vs `/src/content/`.
  - Ensure `src/content/articles/nodejs-single-threaded.mdx` and `src/content/experiments/nodejs-threadpool.mdx` are the complete, authoritative drafts with updated frontmatter and tags.
- **Cleanup:**
  - Remove duplicate legacy `/content/` root directory to ensure `src/content/` is the single canonical source of truth for Astro Content Collections and Keystatic.

### Phase 4 — Align Astro and Keystatic Schemas (MDX Round-Trip Safety)
- **Keystatic Custom Component Blocks:**
  - In `keystatic.config.ts`, define `componentBlocks` for:
    - `NodeProcessDiagram`: Renders `<NodeProcessDiagram />` in MDX.
    - `NodeThreadpoolVisualizer`: Renders `<NodeThreadpoolVisualizer />` in MDX.
- **Schema Field Alignment:**
  - Sync `src/content/config.ts` and `keystatic.config.ts` for all schema fields: `title`, `slug`, `description`, `date`, `status`, `topic`, `tags`, `featured`, `githubUrl`, `hypothesis`, `setup`, `implementation`, `keyFindings`, `limitations`, `githubRepo`, `relatedArticleSlug`, `interactiveType`.
- **Round-Trip Validation:**
  - Verify editing an article in `/keystatic` preserves all frontmatter, MDX tags, and custom components cleanly.

### Phase 5 — Simplify Astro & Keystatic Configuration
- **Configuration Optimization:**
  - Clean up `astro.config.mjs` to keep integrations (`react()`, `mdx()`, `keystatic()`, `@tailwindcss/vite`, `@astrojs/node` adapter) minimal, stable, and production-ready.

### Phase 6 — Draft & Publishing Behavior Verification
- **Draft Isolation:**
  - Ensure `status: draft` items are accessible in local dev mode (`npm run dev`), but excluded from static production builds (`npm run build`), RSS feeds (`/rss.xml`), search index, and return 404 on unreleased production routes.

### Phase 7 — Cleanup Obsolete Files & Dependencies
- **Codebase Cleanliness:**
  - Remove obsolete Vite-only SPA entry points (`src/main.tsx`, `index.html`, obsolete Vite wrappers) that are no longer needed in Astro.
  - Keep `package.json` scripts minimal: `"dev": "astro dev"`, `"build": "astro build"`, `"check": "astro check"`, `"lint": "tsc --noEmit"`, `"test": "vitest run"`.

### Phase 8 — Comprehensive Verification
- Run `npm test` (`vitest run`).
- Run `npm run lint` (`tsc --noEmit`).
- Run `compile_applet` (`astro build`).
- Verify visual styling, responsive design, dark/light theme, and interactive simulations.

---

## Acceptance Criteria
- [x] Global Tailwind v4 CSS styles apply correctly; website renders with high-fidelity visual identity.
- [x] Dark/light theme toggling works cleanly across all pages without FOUC or hydration errors.
- [x] Interactive React islands (`NodeProcessDiagram`, `NodeThreadpoolVisualizer`, `CommandPalette`, `RssModal`) hydrate and function properly in browser.
- [x] `src/content/` is the sole canonical content directory.
- [x] Keystatic admin (`/keystatic`) edits MDX articles safely with custom component blocks.
- [x] Draft isolation is strictly enforced for production builds.
- [x] `vitest`, `tsc`, and `astro build` pass with zero errors.
