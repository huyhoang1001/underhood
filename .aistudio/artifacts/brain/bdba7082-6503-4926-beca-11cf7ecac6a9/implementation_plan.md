# Implementation Plan — Fix Keystatic Admin Integration

This plan details the steps to restore the Keystatic CMS interface, enable hybrid rendering for Astro, and configure GitHub authentication for production.

## Root Cause Analysis (Hypothesis)
1. **Output Mode:** The project is currently set to `output: 'static'`, which prevents Keystatic's dynamic API routes (for local storage and auth) from functioning correctly in a hybrid environment.
2. **Missing Endpoints:** The `@keystatic/astro` integration usually requires manual creation of the admin page and API route in newer versions, or specific configuration in `astro.config.mjs`.
3. **Env Resolution:** The custom `astro:env/server` workaround in `astro.config.mjs` may be causing conflicts with Keystatic's internal dependency on environment variables.

## Step-by-Step Implementation

### Phase 1 — Enable Hybrid Rendering
- Update `astro.config.mjs` to use `output: 'hybrid'`.
- This allows public pages to remain static by default while enabling dynamic server-side rendering for the `/keystatic` routes.

### Phase 2 — Configure Keystatic Integration
- **Admin Page:** Create `src/pages/keystatic/[...conf].astro` using the Keystatic React component to host the admin UI.
- **API Route:** Create `src/pages/api/keystatic/[...params].ts` (or equivalent) to handle CMS backend requests.
- **Auth Config:** Prepare `keystatic.config.ts` for GitHub authentication using environment variables (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`).

### Phase 3 — Resolve Environment Conflicts
- Inspect and potentially simplify the `vite.plugins` workaround for `astro:env/server`.
- Ensure `process.env` is correctly shimmed or accessed in the server-side context to satisfy Keystatic's internal requirements.

### Phase 4 — Verification
- **Local Dev:** Run `npm run dev` and verify `/keystatic` loads the login/dashboard.
- **Round-trip Edit:** 
    - Change an article status from `Draft` to `Published`.
    - Save and verify the MDX file in `src/content/articles/` updates correctly.
    - Revert the change.
- **Type Safety:** Run `npm run lint` and `npm run check` to ensure no regressions.
- **Build Test:** Run `astro build` to verify hybrid output generation.

## Success Criteria
- [ ] `/keystatic` loads a functional CMS interface in local development.
- [ ] Existing content collections (Articles, Experiments) are visible and editable.
- [ ] Saving changes in the CMS persists to the filesystem.
- [ ] Public site remains static-first for performance.
