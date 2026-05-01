-- ============================================================
-- 0116_fix_reporting_gl_and_cashflow.sql
-- Harden finance reporting RPCs for GL ordering and cashflow sources
-- ============================================================

create or replace function public.rpc_get_gl(p_account_id uuid, p_start_date date, p_end_date date)
returns table (journal_date date, ref_type text, ref_no text, memo text, debit numeric, credit numeric, trx_id uuid)
language plpgsql security definer as $$
begin
  if not public.is_owner() then
    raise exception 'Owner only';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'Start and end date are required';
  end if;

  if p_start_date > p_end_date then
    raise exception 'Start date must be on or before end date';
  end if;

  return query
  select q.journal_date, q.ref_type, q.ref_no, q.memo, q.debit, q.credit, q.trx_id
  from (
    select
      j.journal_date,
      j.ref_type,
      j.memo as ref_no,
      jl.line_memo as memo,
      jl.debit,
      jl.credit,
      j.id as trx_id,
      1 as sort_order
    from public.journal_lines jl
    join public.journals j on j.id = jl.journal_id
    where jl.account_id = p_account_id
      and j.journal_date between p_start_date and p_end_date

    union all

    select
      ob.as_of_date,
      'OPENING_BALANCE'::text,
      'Opening Balance'::text,
      'Initial Balance'::text,
      ob.debit,
      ob.credit,
      null::uuid,
      0 as sort_order
    from public.opening_balances ob
    where ob.account_id = p_account_id
      and ob.as_of_date between p_start_date and p_end_date
  ) q
  order by q.journal_date, q.sort_order, q.trx_id nulls last;
end $$;

create or replace function public.rpc_get_cashflow(p_start_date date, p_end_date date)
returns table (category text, description text, amount numeric(14,2))
language plpgsql security definer as $$
declare
  v_account_ids uuid[];
  v_opening_ob numeric(14,2);
  v_opening_jr numeric(14,2);
  v_receipts_total numeric(14,2);
  v_payments_total numeric(14,2);
  v_closing_cash numeric(14,2);
begin
  if not public.is_owner() then
    raise exception 'Owner only';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'Start and end date are required';
  end if;

  if p_start_date > p_end_date then
    raise exception 'Start date must be on or before end date';
  end if;

  select array_agg(distinct a.id)
    into v_account_ids
  from public.accounts a
  where a.account_type = 'ASSET'
    and (
      a.code = '1100'
      or exists (
        select 1
        from public.payment_methods pm
        where pm.account_id = a.id
      )
    );

  if v_account_ids is null or array_length(v_account_ids, 1) is null then
    raise exception 'Cash/Bank accounts missing';
  end if;

  select coalesce(sum(debit - credit), 0)
    into v_opening_ob
  from public.opening_balances
  where account_id = any(v_account_ids) and as_of_date <= p_start_date;

  select coalesce(sum(case when jl.debit > 0 then jl.debit else -jl.credit end), 0)
    into v_opening_jr
  from public.journal_lines jl
  join public.journals j on j.id = jl.journal_id
  where jl.account_id = any(v_account_ids) and j.journal_date < p_start_date;

  with internal_journals as (
    select journal_id
    from public.journal_lines
    group by journal_id
    having bool_and(account_id = any(v_account_ids))
  )
  select coalesce(sum(jl.debit), 0)
    into v_receipts_total
  from public.journal_lines jl
  join public.journals j on j.id = jl.journal_id
  where jl.account_id = any(v_account_ids)
    and j.journal_date between p_start_date and p_end_date
    and jl.debit > 0
    and jl.journal_id not in (select journal_id from internal_journals);

  with internal_journals as (
    select journal_id
    from public.journal_lines
    group by journal_id
    having bool_and(account_id = any(v_account_ids))
  )
  select coalesce(sum(jl.credit), 0)
    into v_payments_total
  from public.journal_lines jl
  join public.journals j on j.id = jl.journal_id
  where jl.account_id = any(v_account_ids)
    and j.journal_date between p_start_date and p_end_date
    and jl.credit > 0
    and jl.journal_id not in (select journal_id from internal_journals);

  v_closing_cash := (v_opening_ob + v_opening_jr) + v_receipts_total - v_payments_total;

  return query
  select 'Opening'::text, 'Cash & Bank at beginning'::text, (v_opening_ob + v_opening_jr)
  union all
  select 'Inflow'::text, 'Total cash/bank receipts'::text, v_receipts_total
  union all
  select 'Outflow'::text, 'Total cash/bank payments'::text, -v_payments_total
  union all
  select 'Closing'::text, 'Cash & Bank at end'::text, v_closing_cash;
end $$;
