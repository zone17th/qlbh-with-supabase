# Database Mapping

| Source entity/table | Supabase table | Notes |
|---|---|---|
| `ProductCategory` / `product_categories` | `product_categories` | `name` unique, service duplicate ignore case |
| `Product` / `products` | `products` | `warranty_months` default `24`, FK category |
| `ProductVariant` / `product_variants` | `product_variants` | No unique constraint on product/variant |
| `InventoryTransaction` / `inventory_transactions` | `inventory_transactions` | Ledger stock model; `source` enum includes `ORDER_CANCEL` |
| `SalesOrder` / `sales_orders` | `sales_orders` | `order_code` unique, status/type enums |
| `SalesOrderItem` / `sales_order_items` | `sales_order_items` | Snapshot product/variant plus optional lot |
| `SalesOrderExtraCost` / `sales_order_extra_costs` | `sales_order_extra_costs` | Child rows cascade on order delete |
| `SalesOrderShippingHistory` / `sales_order_shipping_history` | `sales_order_shipping_history` | Status audit-like history |
| `ShippingProvider` / `shipping_providers` | `shipping_providers` | `provider_name` unique |
| `ShippingProviderShipper` / `shipping_provider_shippers` | `shipping_provider_shippers` | Child rows recreated on update |
| `SaleRecord` / `sale_records` | `sale_records` | Legacy CRUD |

## Enum Mapping

- `OrderType`: `ONLINE`, `IN_STORE` -> PostgreSQL enum `order_type`.
- `OrderStatus`: `CREATED`, `PACKAGED`, `SHIPPING`, `SHIPPED`, `PAYMENT_PENDING`, `COMPLETED`, `CANCELLED` -> `order_status`.
- `InventoryTransactionType`: `IMPORT`, `EXPORT` -> `inventory_transaction_type`.
- `InventoryTransactionSource`: `MANUAL`, `ORDER`, `ORDER_CANCEL` -> `inventory_transaction_source`.

## Files

- Schema: `supabase/migrations/202604280001_initial_schema.sql`.
- Seed: `supabase/seed.sql`.
- Optional permit-all RLS: `supabase/policies/permit_all.sql`.
