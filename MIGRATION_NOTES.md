# Underhood — React/Vite to Astro + Keystatic Architecture Migration Notes

## Executive Summary
Underhood has been migrated from a single-page React + Vite SPA to an **Astro 5 + Keystatic Git-backed architecture**.

- **Routing & Rendering:** Native Astro static page generation (`output: 'static'`) for public pages, providing optimal SEO, sub-100ms first contentful paint, and zero client-side routing bundle overhead.
- **Content Platform:** Astro Content Collections (`src/content/config.ts`) with typed schemas for `articles` and `experiments`.
- **Git CMS:** Keystatic local filesystem mode (`keystatic.config.ts`) exposed at `/keystatic` for editing content directly against Git.
- **React Islands:** Interactive diagrams (`NodeProcessDiagram`, `NodeThreadpoolVisualizer`, `ExperimentVisualizer`, `CommandPalette`, `RssModal`) hydrated using Astro directives (`client:load`, `client:visible`).
- **Draft Isolation:** Articles and experiments with `status: draft` are visible in `npm run dev` local review mode, but strictly omitted from production static builds, search indexes, and RSS feeds.

---

## Architecture Comparison

| Component / Feature | Previous Architecture (React + Vite SPA) | Migrated Architecture (Astro + Keystatic) |
| :--- | :--- | :--- |
| **Routing** | Client-side state routing (`currentRoute`) | Native Astro file-based routes (`/`, `/writing`, `/experiments`, `/topics`, `/about`) |
| **Content Discovery** | `src/lib/content/index.ts` frontmatter scanning | Astro Content Collections (`getCollection('articles')`, `getCollection('experiments')`) |
| **Content Format** | `.mdx` files parsed via frontmatter regex | Standard Astro MDX integration (`@astrojs/mdx`) with typed Zod schemas |
| **CMS / Editor** | None (manual file editing only) | Keystatic local CMS (`/keystatic`) |
| **Interactive UI** | Full React client bundle | React Islands (`@astrojs/react`) with granular hydration (`client:visible`, `client:load`) |
| **RSS & Robots** | Dynamically rendered React views | Native Astro API endpoints (`/rss.xml`, `/robots.txt`) |
| **Draft Isolation** | In-memory flag in `getArticles()` | Build-time collection filtering (`import.meta.env.DEV || data.status !== 'draft'`) |

---

## Verified Commands

- **Local Dev Server:** `npm run dev` (runs `astro dev --port 3000 --host 0.0.0.0`)
- **Production Build:** `npm run build` (runs `astro build`)
- **Type Checking:** `npm run check` (runs `astro check`)
- **Unit Tests:** `npm test` (runs `vitest run`)
