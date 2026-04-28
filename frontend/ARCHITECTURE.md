# Frontend Architecture

## Goal

The frontend is being migrated from page-heavy components to feature-scoped modules with shared UI, shared API infrastructure, and reusable state hooks. API contracts stay unchanged.

## Folder Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx
│   └── routes.tsx
├── features/
│   └── dashboard/
│       ├── api.ts
│       ├── DashboardPage.tsx
│       ├── hooks.ts
│       ├── model.ts
│       └── dashboard.test.ts
├── shared/
│   ├── api/
│   └── ui/
├── pages/
├── services/
├── types/
└── utils/
```

## Decisions

- Routing uses `react-router-dom`; legacy hash routing has been removed from the active app entry.
- Server data orchestration uses TanStack Query.
- Shared components live under `shared/ui`.
- Domain-specific data shaping lives inside `features/<module>/model.ts`.
- API contract wrappers remain in `services/*Service.ts` until each feature is migrated.
- TailwindCSS is available for new and migrated UI. Existing global CSS remains during migration so older pages keep working.

## Phase 1 Scope

- Dashboard was migrated first as the reference feature.
- `DataTable`, `Button`, `PageHeader`, and `EmptyState` were introduced as reusable primitives.
- Tests cover `DataTable` states and dashboard top-product derivation.

## Migration Strategy

1. Keep old pages mounted until their replacement feature is ready.
2. For each module, first move derived data and validation into `features/<module>/model.ts`.
3. Add tests for model logic and shared components.
4. Move API orchestration into `features/<module>/hooks.ts`.
5. Replace page-local tables/forms with shared UI components.
6. Delete the old page only after the route points to the feature page and build passes.
