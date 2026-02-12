-- =========================
-- TEST DATA: 50 items SALES + 50 items PURCHASE
-- =========================

-- 1) Buat 50 item test dan simpan id-nya sementara
create temp table tmp_test_items on commit drop as
with ins as (
  insert into public.items (
    sku, name, type, uom,
    price_default, price_khusus, default_price_buy, min_stock, is_active
  )
  select
    'TESTSKU-' || lpad(i::text,3,'0') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
    'Test Item ' || lpad(i::text,3,'0'),
    'FINISHED_GOOD'::item_type,
    'PCS',
    10000, 9500, 7000, 0, true
  from generate_series(1,50) as s(i)
  returning id
)
select id from ins;

-- 2) SALES: header + 50 line items
with c as (
  insert into public.customers (name, phone, address, is_active)
  values ('TEST CUSTOMER 50', '000000', 'Test Address', true)
  returning id
),
s as (
  insert into public.sales (
    customer_id, terms, status, payment_method_code,
    sales_date, shipping_fee, discount_amount, total_amount, notes
  )
  select id, 'CASH', 'DRAFT', 'CASH',
         current_date, 0, 0, 0, 'TEST SALES 50 ITEMS'
  from c
  returning id
)
insert into public.sales_items (
  sales_id, item_id, uom_snapshot, qty, unit_price, subtotal
)
select
  s.id, t.id, 'PCS', 1, 10000, 10000
from s
cross join tmp_test_items t;

-- 3) PURCHASE: header + 50 line items
with v as (
  insert into public.vendors (name, phone, address, is_active)
  values ('TEST VENDOR 50', '000000', 'Test Address', true)
  returning id
),
p as (
  insert into public.purchases (
    vendor_id, terms, status, payment_method_code,
    purchase_date, discount_amount, total_amount, notes
  )
  select id, 'CASH', 'DRAFT', 'CASH',
         current_date, 0, 0, 'TEST PURCHASE 50 ITEMS'
  from v
  returning id
)
insert into public.purchase_items (
  purchase_id, item_id, uom_snapshot, qty, unit_cost, subtotal
)
select
  p.id, t.id, 'PCS', 1, 8000, 8000
from p
cross join tmp_test_items t;

-- 4) Lihat dokumen yang baru dibuat
select id, sales_no, sales_date from public.sales order by created_at desc limit 1;
select id, purchase_no, purchase_date from public.purchases order by created_at desc limit 1;
