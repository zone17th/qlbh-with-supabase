# API Mapping

Tất cả API nghiệp vụ cũ dùng `ApiResponse`; rebuild giữ wrapper này trong `supabase/functions/api/http.ts`.

| API/flow cũ | Implementation mới | File liên quan |
|---|---|---|
| `GET /health` trả plain text `OK` | Edge Function trả `OK`, không bọc `ApiResponse` | `supabase/functions/api/index.ts` |
| `GET/POST/PUT/DELETE /api/v1/product-categories` | CRUD category, duplicate ignore case, delete guard | `services/catalog.ts` |
| `GET/POST/PUT/DELETE /api/v1/products` | CRUD product/variants, delete guard, rename cascade snapshot | `services/catalog.ts` |
| `GET /api/v1/inventory/transactions` | In-memory-compatible filter/paging | `services/inventory.ts` |
| `GET /api/v1/inventory/summary` | Ledger summary, pending order quantity, available stock | `services/inventory.ts` |
| `POST /api/v1/inventory/imports` | Batch import, `IMP-XXXXXXXX`, `IMPORT/MANUAL` | `services/inventory.ts` |
| `POST /api/v1/inventory/exports` | Manual export by lot, list response | `services/inventory.ts` |
| `GET /api/v1/inventory/import-options` | Sellable import lots | `services/inventory.ts` |
| `DELETE /api/v1/inventory/transactions/{id}` | Blocks `source=ORDER`, protects used import lots | `services/inventory.ts` |
| `GET/POST/PUT/DELETE /api/v1/orders` | Order list/create/update/delete with child rows | `services/orders.ts` |
| `PATCH /api/v1/orders/{id}/status` | Source state machine and shipping/payment side effects | `services/orders.ts` |
| `POST /api/v1/orders/{id}/restore-stock` | Restore cancelled `IN_STORE` stock via `ORDER_CANCEL` | `services/orders.ts`, `services/inventory.ts` |
| `GET/POST/PUT/DELETE /api/v1/shipping-providers` | Provider + shipper CRUD, duplicate/delete guard | `services/shipping.ts` |
| `GET /api/v1/statistics/business-summary` | Business summary, daily stats, category revenue | `services/statistics.ts` |
| `GET/POST/PUT/DELETE /api/v1/sales` | Legacy sale record CRUD and estimated revenue | `services/sales.ts` |

## Response Format

Success:

```json
{ "success": true, "message": "OK", "data": {}, "timestamp": "..." }
```

Error:

```json
{ "success": false, "message": "business message", "data": null, "timestamp": "..." }
```
