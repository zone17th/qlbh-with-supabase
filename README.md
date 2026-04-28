# QLBH Supabase Rebuild

Rebuild hệ thống quản lý bán hàng/kho từ `SOURCE_SYSTEM_SPEC.md` bằng React/Vite/TypeScript và Supabase PostgreSQL/Edge Functions.

Mục tiêu chính là giữ nguyên hành vi nghiệp vụ đã đặc tả: API shape, validation, state machine, tồn kho theo ledger, side effect đơn hàng/kho, error wrapper và các phần chưa xác định từ source.

## Tech Stack

- Frontend: React, Vite, TypeScript strict mode, CSS responsive.
- Backend: Supabase Edge Functions chạy Deno.
- Database: Supabase PostgreSQL, SQL migrations, enum, FK, index.
- Authorization: giữ đúng source gốc `permitAll`; không tự thêm user/role/branch scope.

## Cấu Trúc

```text
/
├── README.md
├── BUILD_AND_DEPLOY.md
├── .env.example
├── frontend/
│   ├── package.json
│   └── src/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql
│   ├── functions/api/
│   └── policies/
└── docs/
    ├── API_MAPPING.md
    ├── DATABASE_MAPPING.md
    ├── BUSINESS_RULES_MAPPING.md
    └── TODO_UNKNOWNS.md
```

## Module Chính

- Dashboard thống kê doanh thu, vốn nhập, lợi nhuận, trạng thái đơn.
- Danh mục, sản phẩm, phân loại sản phẩm.
- Kho: nhập batch, xuất thủ công theo lô, summary, import options.
- Đơn hàng: `ONLINE`, `IN_STORE`, state machine, xuất kho, hủy, hoàn kho.
- Đơn vị giao hàng và shipper.
- Legacy `sale_records`.

## Quick Start

```bash
supabase start
supabase db reset
supabase functions serve api --no-verify-jwt

cd frontend
npm install
npm run dev
```

Frontend dùng `VITE_API_BASE_URL`, ví dụ local:

```text
VITE_API_BASE_URL=http://127.0.0.1:54321/functions/v1/api/api/v1
```

## Tài Liệu

- [BUILD_AND_DEPLOY.md](BUILD_AND_DEPLOY.md)
- [docs/API_MAPPING.md](docs/API_MAPPING.md)
- [docs/DATABASE_MAPPING.md](docs/DATABASE_MAPPING.md)
- [docs/BUSINESS_RULES_MAPPING.md](docs/BUSINESS_RULES_MAPPING.md)
- [docs/TODO_UNKNOWNS.md](docs/TODO_UNKNOWNS.md)
