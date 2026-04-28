# QLBH Supabase Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the sales/inventory management system from `SOURCE_SYSTEM_SPEC.md` with React/Vite/TypeScript frontend and Supabase PostgreSQL/Edge Functions backend while preserving source business behavior.

**Architecture:** Supabase PostgreSQL stores the ledger-based business data, constraints, enums, and indexes. Supabase Edge Functions expose Spring-compatible API paths, response wrappers, validation messages, transaction-like orchestration, and side effects for inventory/order flows. React/Vite consumes the Edge Functions through a service layer and renders responsive management pages.

**Tech Stack:** React, Vite, TypeScript strict mode, Supabase PostgreSQL, Supabase Edge Functions on Deno, CSS modules/plain CSS.

---

### Task 1: Project Skeleton

**Files:**
- Create: `README.md`
- Create: `BUILD_AND_DEPLOY.md`
- Create: `.env.example`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `supabase/config.toml`

- [x] **Step 1: Create base folders**

Create the requested frontend, supabase, and docs directories.

- [x] **Step 2: Add package and TypeScript configuration**

Use Vite React TypeScript with strict mode and no hard-coded Supabase secrets.

### Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/202604280001_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/policies/permit_all.sql`

- [ ] **Step 1: Create enums and tables**

Create enums for `order_type`, `order_status`, `inventory_transaction_type`, and `inventory_transaction_source`.

- [ ] **Step 2: Create constraints and indexes**

Preserve unique constraints and FK relationships from the source spec while keeping nullable fields nullable where source allows.

- [ ] **Step 3: Add helper functions/triggers**

Add `updated_at` trigger helpers and optional permit-all policy SQL documenting source-compatible authorization.

### Task 3: Supabase Edge Functions

**Files:**
- Create: `supabase/functions/api/index.ts`
- Create: `supabase/functions/api/deno.json`
- Create: `supabase/functions/api/types.ts`
- Create: `supabase/functions/api/db.ts`
- Create: `supabase/functions/api/http.ts`
- Create: `supabase/functions/api/money.ts`
- Create: `supabase/functions/api/services/*.ts`

- [ ] **Step 1: Implement common response/error helpers**

Return `ApiResponse` and `PagedData` shapes matching the Spring backend.

- [ ] **Step 2: Implement product/category/shipping/legacy services**

Include duplicate checks, delete guards, search, paging, and rename cascade behavior.

- [ ] **Step 3: Implement inventory and order services**

Preserve stock ledger calculations, status transitions, order side effects, restore/delete differences, and validation messages.

- [ ] **Step 4: Implement statistics service**

Compute revenue/profit/cost/order counts and category revenue according to the source service logic.

### Task 4: Frontend

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/routes/*`
- Create: `frontend/src/pages/*`
- Create: `frontend/src/components/*`
- Create: `frontend/src/layouts/*`
- Create: `frontend/src/services/*`
- Create: `frontend/src/hooks/*`
- Create: `frontend/src/types/*`
- Create: `frontend/src/utils/*`
- Create: `frontend/src/styles/*`

- [ ] **Step 1: Add shared API/types/constants**

Mirror backend enums and DTO shapes, unwrap `ApiResponse.data`, and surface backend error messages.

- [ ] **Step 2: Build responsive app shell**

Sidebar/menu modules: Dashboard, Sản phẩm, Kho, Đơn hàng, Đơn vị giao hàng, Legacy Sales.

- [ ] **Step 3: Build module pages**

Add list/create/update/delete/status screens with loading, error, empty states, confirmation for destructive mutations, and source validation.

### Task 5: Documentation And Verification

**Files:**
- Create: `docs/API_MAPPING.md`
- Create: `docs/DATABASE_MAPPING.md`
- Create: `docs/BUSINESS_RULES_MAPPING.md`
- Create: `docs/TODO_UNKNOWNS.md`

- [ ] **Step 1: Write mapping docs**

Map old API/flow/entity/rule to new files.

- [ ] **Step 2: Write build/deploy docs**

Include Supabase project setup, migrations, Edge Function deploy, Vercel env/build/deploy, smoke tests, and troubleshooting.

- [ ] **Step 3: Run verification**

Run available TypeScript/build checks. If dependencies are unavailable locally, report the limitation and the exact command to run.
