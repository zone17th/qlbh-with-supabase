# Build And Deploy

## Prerequisites

- Node.js 20+ và npm.
- Supabase CLI.
- Tài khoản Supabase.
- Tài khoản Vercel.

## Tạo Supabase Project

1. Tạo project mới trên Supabase.
2. Lấy `Project URL`, `anon key`, `service_role key`.
3. Không đưa `service_role key` vào frontend hoặc Vercel client env.

## Setup Biến Môi Trường

Supabase Edge Functions tự inject các biến reserved sau khi deploy:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Không chạy `supabase secrets set` cho các tên bắt đầu bằng `SUPABASE_`; Supabase CLI sẽ skip các tên này. Với local development, `supabase functions serve` cũng cung cấp các biến này khi chạy trong project đã `supabase start`.

Tạo `frontend/.env.local`:

```text
VITE_API_BASE_URL=http://127.0.0.1:54321/functions/v1/api/api/v1
```

Production Vercel:

```text
VITE_API_BASE_URL=https://<project-ref>.functions.supabase.co/api/api/v1
```

## Chạy Migration

Local:

```bash
supabase start
supabase db reset
```

Remote:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Nếu muốn bật policy permit-all cho direct Supabase client:

```bash
supabase db push
psql "<database-url>" -f supabase/policies/permit_all.sql
```

Edge Functions hiện dùng service role server-side, nên RLS không phải cơ chế permission nghiệp vụ trong rebuild này.

## Seed Data

Local `supabase db reset` tự chạy `supabase/seed.sql`.

Remote:

```bash
psql "<database-url>" -f supabase/seed.sql
```

## Deploy Edge Functions

```bash
npx supabase functions deploy api --no-verify-jwt
```

Smoke test:

```bash
curl https://<project-ref>.functions.supabase.co/api/health
curl https://<project-ref>.functions.supabase.co/api/api/v1/product-categories
```

## Chạy Frontend Local

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Build Frontend

```bash
cd frontend
npm run build
```

Output nằm ở `frontend/dist`.

## Deploy Frontend Lên Vercel

1. Import repository vào Vercel.
2. Root Directory: `frontend`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Thêm env `VITE_API_BASE_URL`.

## Test Sau Deploy

1. Mở `/dashboard`, kiểm tra API summary không lỗi.
2. Tạo danh mục.
3. Tạo sản phẩm có ít nhất một phân loại.
4. Nhập kho.
5. Tạo đơn `ONLINE`, chuyển `PACKAGED -> SHIPPING -> SHIPPED`.
6. Tạo đơn `IN_STORE`, kiểm tra status `PAYMENT_PENDING`, sau đó `COMPLETED`.
7. Hủy đơn `IN_STORE` và chọn hoàn kho.

## Troubleshooting

- `Missing SUPABASE_SERVICE_ROLE_KEY`: kiểm tra function có chạy qua Supabase Edge Runtime không; đây là reserved variable do Supabase tự inject, không set bằng `supabase secrets set`.
- Frontend báo `Failed to fetch`: kiểm tra `VITE_API_BASE_URL` và CORS.
- `relation does not exist`: chưa chạy migration hoặc chưa link đúng project.
- `permission denied`: nếu bật RLS, chạy `supabase/policies/permit_all.sql` hoặc gọi qua Edge Function.
- `ONLINE SHIPPED -> COMPLETED` bị từ chối: đây là behavior đúng theo backend source, `SHIPPED` là terminal cho `ONLINE`.
