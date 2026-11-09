# Implementation Plan — Fix Keystatic Schema Validation and Content Contract

## Objective
1. Remove redundant `slug` frontmatter property from all article and experiment MDX files in `src/content/articles/` and `src/content/experiments/` so that Keystatic's `slugField: 'title'` (filename-derived slugs) matches the frontmatter without throwing validation errors (`Key on object value "slug" is not allowed`).
2. Update `scripts/validate-content.ts` to scan canonical `src/content/` directories (`src/content/articles/` and `src/content/experiments/`) instead of obsolete `content/` directories, enforcing strict validation against required schema fields.
3. Ensure all Astro Content Collection schemas, Keystatic schemas, and validation checks are perfectly aligned.
4. Run tests, type checks, content validation, and production build.

---

## Step-by-Step Implementation

### Phase 1 — Frontmatter Cleanup (`src/content/`)
- Inspect all `.mdx` files under `src/content/articles/` and `src/content/experiments/`.
- Remove explicit `slug: ...` from frontmatter across all content files.
- Verify Astro routes correctly map filenames (e.g. `nodejs-single-threaded.mdx`) to slugs (`nodejs-single-threaded`).

### Phase 2 — Update Content Validation Script (`scripts/validate-content.ts`)
- Update `scripts/validate-content.ts` to target `src/content/articles` and `src/content/experiments`.
- Implement strict validation checking for all required frontmatter fields (`title`, `description`, `date`, `topic`, `status`, etc. for articles; `title`, `tagline`, `date`, `topic`, `status`, `hypothesis`, `setup`, `implementation`, `keyFindings`, `githubRepo` for experiments).
- Fail with clear errors if any required field is missing or invalid.

### Phase 3 — Validation & Verification
- Run `npm run validate:content`.
- Run `npm run lint` (`tsc --noEmit`).
- Run `npm test` (`vitest run`).
- Run `astro build` (`npm run build`).

---

## Acceptance Criteria
- [ ] No `slug` property in article/experiment frontmatter; slugs correctly derived from filenames.
- [ ] Keystatic opens and saves content without validation errors.
- [ ] `scripts/validate-content.ts` scans `src/content/` strictly and passes successfully.
- [ ] All tests, type checks, and production builds pass.
