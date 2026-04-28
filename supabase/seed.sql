insert into product_categories (name, description)
values
  ('Phụ kiện', 'Danh mục seed cho kiểm thử local'),
  ('Thiết bị', 'Danh mục seed cho kiểm thử local')
on conflict (name) do nothing;

insert into shipping_providers (provider_name)
values ('Giao hàng nội bộ')
on conflict (provider_name) do nothing;

insert into shipping_provider_shippers (provider_id, shipper_name, shipper_phone)
select id, 'Nhân viên giao hàng', '0900000000'
from shipping_providers
where provider_name = 'Giao hàng nội bộ'
  and not exists (
    select 1 from shipping_provider_shippers s
    where s.provider_id = shipping_providers.id
      and s.shipper_phone = '0900000000'
  );
