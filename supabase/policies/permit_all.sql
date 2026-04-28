-- SOURCE_SYSTEM_SPEC.md states the original backend permits all endpoints and
-- has no real user/role/company/branch data scope. These policies preserve that
-- behavior if you choose to enable RLS for direct Supabase client reads.
--
-- Edge Functions use the service role key server-side and enforce the original
-- business validation instead of user authorization.

alter table product_categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table inventory_transactions enable row level security;
alter table sales_orders enable row level security;
alter table sales_order_items enable row level security;
alter table sales_order_extra_costs enable row level security;
alter table sales_order_shipping_history enable row level security;
alter table shipping_providers enable row level security;
alter table shipping_provider_shippers enable row level security;
alter table sale_records enable row level security;

create policy product_categories_permit_all on product_categories for all using (true) with check (true);
create policy products_permit_all on products for all using (true) with check (true);
create policy product_variants_permit_all on product_variants for all using (true) with check (true);
create policy inventory_transactions_permit_all on inventory_transactions for all using (true) with check (true);
create policy sales_orders_permit_all on sales_orders for all using (true) with check (true);
create policy sales_order_items_permit_all on sales_order_items for all using (true) with check (true);
create policy sales_order_extra_costs_permit_all on sales_order_extra_costs for all using (true) with check (true);
create policy sales_order_shipping_history_permit_all on sales_order_shipping_history for all using (true) with check (true);
create policy shipping_providers_permit_all on shipping_providers for all using (true) with check (true);
create policy shipping_provider_shippers_permit_all on shipping_provider_shippers for all using (true) with check (true);
create policy sale_records_permit_all on sale_records for all using (true) with check (true);
