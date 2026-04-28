# Frontend Refactor Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the scalable frontend architecture and migrate Dashboard as the reference implementation without changing API contracts.

**Architecture:** Add app-level providers for routing/query state, Tailwind for styling, shared UI primitives, and feature-scoped dashboard API/hooks/page files. Keep existing services available so other screens continue to work during incremental migration.

**Tech Stack:** React, TypeScript strict mode, Vite, TailwindCSS, React Router, TanStack Query, Vitest, Testing Library.

---

### Task 1: Tooling

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/test/setup.ts`

- [ ] Add Tailwind, router, query, and test dependencies.
- [ ] Add test script.
- [ ] Configure Vite test environment.

### Task 2: Shared Primitives

**Files:**
- Create: `frontend/src/shared/ui/Button.tsx`
- Create: `frontend/src/shared/ui/DataTable.tsx`
- Create: `frontend/src/shared/ui/EmptyState.tsx`
- Create: `frontend/src/shared/ui/PageHeader.tsx`
- Create: `frontend/src/shared/ui/DataTable.test.tsx`
- Create: `frontend/src/shared/api/http.ts`
- Create: `frontend/src/shared/api/query.ts`

- [ ] Write tests for `DataTable` empty/loading/data behavior.
- [ ] Implement shared components and query client.

### Task 3: App Shell

**Files:**
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/routes.tsx`
- Create: `frontend/src/app/providers.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] Replace hash router with `react-router-dom`.
- [ ] Preserve existing routes and layout behavior.

### Task 4: Dashboard Feature

**Files:**
- Create: `frontend/src/features/dashboard/api.ts`
- Create: `frontend/src/features/dashboard/hooks.ts`
- Create: `frontend/src/features/dashboard/DashboardPage.tsx`
- Create: `frontend/src/features/dashboard/dashboard.test.ts`

- [ ] Write tests for top-products derivation.
- [ ] Move Dashboard data orchestration into feature hooks.
- [ ] Remove inline bar styles from dashboard page.

### Task 5: Compatibility

**Files:**
- Modify: `frontend/src/routes/routes.ts`
- Keep: existing page modules for non-migrated screens.

- [ ] Wire dashboard route to new feature page.
- [ ] Keep Catalog, Inventory, Orders, Shipping, Legacy pages unchanged for now.
- [ ] Run tests and production build.
