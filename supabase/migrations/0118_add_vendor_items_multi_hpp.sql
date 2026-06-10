-- Multi vendor + multi HPP (vendor-specific current buy cost)
create table if not exists public.vendor_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  unit_cost numeric(14,2) not null default 0,
  currency_code text not null default 'IDR',
  is_active boolean not null default true,
  is_preferred boolean not null default false,
  last_purchase_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_vendor_items_vendor_item unique (vendor_id, item_id),
  constraint ck_vendor_items_unit_cost_nonneg check (unit_cost >= 0)
);

create index if not exists idx_vendor_items_vendor on public.vendor_items(vendor_id);
create index if not exists idx_vendor_items_item on public.vendor_items(item_id);
create index if not exists idx_vendor_items_active on public.vendor_items(is_active);
create trigger trg_vendor_items_updated_at before update on public.vendor_items for each row execute function set_updated_at();

alter table public.vendor_items enable row level security;

drop policy if exists "vendor_items_rw" on public.vendor_items;
create policy "vendor_items_rw" on public.vendor_items
for all to authenticated
using (public.is_admin() or public.is_owner())
with check (public.is_admin() or public.is_owner());

-- Safe backfill from latest purchase per vendor-item.
insert into public.vendor_items (vendor_id, item_id, unit_cost, last_purchase_at, is_preferred, notes)
select distinct on (p.vendor_id, pi.item_id)
  p.vendor_id,
  pi.item_id,
  coalesce(pi.unit_cost, 0)::numeric(14,2),
  p.purchase_date,
  false,
  'Backfilled from latest purchase history'
from public.purchases p
join public.purchase_items pi on pi.purchase_id = p.id
where p.vendor_id is not null
order by p.vendor_id, pi.item_id, p.purchase_date desc, p.created_at desc
on conflict (vendor_id, item_id) do update
set unit_cost = excluded.unit_cost,
    last_purchase_at = excluded.last_purchase_at,
    updated_at = now();
