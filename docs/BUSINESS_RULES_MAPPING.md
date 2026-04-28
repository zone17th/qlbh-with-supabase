# Business Rules Mapping

| Rule gốc | Nơi implement mới |
|---|---|
| Category `name` required, duplicate ignore case | `services/catalog.ts` |
| Product requires `name`, `categoryId`, `variants`, warranty > 0 | `services/catalog.ts`, frontend `CatalogPage.tsx` |
| Product delete blocked if used in inventory/order | `services/catalog.ts` |
| Product/variant rename cascades snapshot names in inventory/order items | `services/catalog.ts` |
| Inventory import creates `IMPORT/MANUAL`, one row per item, batch `IMP-XXXXXXXX` | `services/inventory.ts` |
| Manual export requires selected import lot and enough sellable quantity | `services/inventory.ts`, frontend `InventoryPage.tsx` |
| Inventory summary = imports - exports; available = current - pending online orders | `services/inventory.ts` |
| `source=ORDER` inventory transactions cannot be deleted via inventory API | `services/inventory.ts` |
| Order create validates customer/items/money/stock/lot | `services/orders.ts`, frontend `OrdersPage.tsx` |
| `ONLINE` stock is deducted only at `SHIPPING -> SHIPPED` | `services/orders.ts` |
| `IN_STORE` stock is deducted immediately after create and status becomes `PAYMENT_PENDING` | `services/orders.ts` |
| `ONLINE SHIPPED` is terminal; no `SHIPPED -> COMPLETED` | `services/orders.ts`, frontend `availableTransitions` |
| Shipping transition requires provider, shipper phone/name, non-negative actual costs | `services/orders.ts`, frontend `OrdersPage.tsx` |
| `PAYMENT_PENDING -> COMPLETED` for `IN_STORE` sets actual shipping/additional cost 0 and actual profit projected profit | `services/orders.ts` |
| Cancelled `IN_STORE` restore creates `IMPORT/ORDER_CANCEL` and keeps original export | `services/inventory.ts`, `services/orders.ts` |
| Order delete reversal creates `IMPORT/MANUAL` and deletes original `EXPORT/ORDER` | `services/inventory.ts`, `services/orders.ts` |
| Shipping provider requires provider name and at least one valid shipper | `services/shipping.ts`, frontend `ShippingProvidersPage.tsx` |
| Statistics count revenue/profit only from `SHIPPED` or `COMPLETED` | `services/statistics.ts` |
| Statistics cost is import capital by transaction date, excluding `ORDER_CANCEL` | `services/statistics.ts` |
| Legacy sale estimated revenue = sale - import - shipping | `services/sales.ts` |
| No real authorization, all endpoints effectively public | `supabase/config.toml`, `supabase/policies/permit_all.sql`, docs |

## Notes

The original `OrderServiceImpl.update` is documented as incomplete/buggy. This rebuild keeps the source guard "only update CREATED" and preserves order code, but uses the same complete item/totals mapper as create so database constraints are satisfied.
