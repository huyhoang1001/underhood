# Underhood

**Engineering beyond the surface.**

An independent technical publication exploring distributed systems, runtime internals, tail latency, and what happens when software meets sudden pressure. Built with reproducible experiments and verifiable data.

🌐 **Live:** [underhood-navy.vercel.app](https://underhood-navy.vercel.app)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro 5](https://astro.build) (SSR + static prerendering) |
| UI | [React 19](https://react.dev) + [Tailwind CSS v4](https://tailwindcss.com) |
| Content | MDX + [Keystatic](https://keystatic.com) (Git-backed CMS) |
| Package Manager | [Bun](https://bun.sh) |
| Deployment | [Vercel](https://vercel.com) |
| CI | GitHub Actions |

---

## Getting Started

**Prerequisites:** [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)

```bash
# Install dependencies
bun install

# Copy env file and fill in values
cp .env.example .env

# Start dev server
bun run dev
# → http://localhost:4321
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `KEYSTATIC_GITHUB_CLIENT_ID` | GitHub App client ID for Keystatic CMS |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | GitHub App client secret |
| `KEYSTATIC_SECRET` | Random secret for Keystatic session signing |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | GitHub App slug (e.g. `underhood-keystatic`) |

---

## Commands

```bash
bun run dev              # Start dev server
bun run build            # Production build
bun run preview          # Preview production build
bun run test             # Run unit tests (Vitest)
bun run lint             # TypeScript type check
bun run validate:content # Validate MDX frontmatter schemas
```

---

## Project Structure

```
src/
├── components/          # React + Astro UI components
│   ├── NodeProcessDiagram.tsx        # Interactive Node.js runtime map
│   ├── NodeThreadpoolVisualizer.tsx  # libuv thread pool simulator
│   ├── CommandPalette.tsx            # ⌘K search
│   └── ...
├── content/
│   ├── config.ts        # Astro content collection schemas
│   ├── articles/        # MDX article files
│   └── experiments/     # MDX experiment files
├── data/                # Static data (topics, author profile)
├── layouts/             # Astro page layouts
├── lib/content/         # Content loading, parsing, schema validation
├── pages/               # Astro file-based routes
├── types/               # Shared TypeScript types
├── utils/               # Utilities (reading time, etc.)
└── middleware.ts        # Request URL rewriting for Vercel
experiments/
└── node-concurrency/    # Standalone Node.js experiment scripts
keystatic.config.ts      # Keystatic CMS configuration
```

---

## Content Authoring

Content is stored as MDX files in `src/content/` and managed via Keystatic.

### Using the CMS locally

```bash
bun run dev
# Navigate to http://localhost:4321/keystatic
```

### Using the CMS in production

Visit `https://underhood-navy.vercel.app/keystatic` and sign in with GitHub (requires write access to this repo).

### Draft vs Published

Set `status` in the frontmatter:

- `draft` — visible locally, excluded from production builds and RSS
- `published` — included in all builds

### Custom MDX Components

Embed interactive visualizers directly in article content:

```mdx
<NodeProcessDiagram />
<NodeThreadpoolVisualizer />
<ThreadPoolVisualizer />
```

### Article Frontmatter

```yaml
---
title: Your Article Title
description: One or two sentences describing the article.
date: '2026-11-08'
status: draft           # or 'published'
topic: backend-engineering
tags:
  - nodejs
  - performance
featured: false
githubUrl: https://github.com/huyhoang1001/underhood/tree/main/experiments/...
---
```

---

## Experiments

Standalone Node.js scripts in `experiments/` are reproducible benchmarks you can run locally:

```bash
# Thread pool saturation
node experiments/node-concurrency/experiment-a-threadpool.mjs 8

# Event loop blocking
node experiments/node-concurrency/experiment-b-eventloop-blocking.mjs

# Promise.all concurrency
node experiments/node-concurrency/experiment-c-promise-all.mjs

# Worker threads
node experiments/node-concurrency/experiment-d-worker-threads.mjs
```

---

## Deployment

Vercel auto-deploys on every push to `main`. GitHub Actions runs the full verification pipeline first:

1. `bun install --frozen-lockfile`
2. `bun run validate:content`
3. `bun run lint`
4. `bun run test`
5. `bun run build`

---

## License

© 2026 Huy Hoang. All rights reserved.
