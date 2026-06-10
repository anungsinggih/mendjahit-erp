-- Add account for Uang Muka Pembelian if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE code = '1250') THEN
    INSERT INTO public.accounts (code, name, account_type, is_system_account)
    VALUES ('1250', 'Uang Muka Pembelian', 'ASSET', true);
  END IF;
END $$;

create or replace function public.rpc_create_purchase_down_payment(
  p_purchase_id uuid,
  p_journal_date date,
  p_amount numeric,
  p_payment_account_id uuid,
  p_notes text
) returns uuid language plpgsql security definer as $$
declare
  v_dp_account_id uuid;
  v_purchase record;
  v_journal_id uuid;
begin
  if not (public.is_admin() or public.is_owner()) then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Nominal DP harus lebih besar dari 0';
  end if;

  select * into v_purchase from public.purchases where id = p_purchase_id;
  if not found then
    raise exception 'Purchase tidak ditemukan';
  end if;

  if v_purchase.status != 'DRAFT' then
    raise exception 'Hanya Purchase DRAFT yang bisa di-DP';
  end if;

  select id into v_dp_account_id from public.accounts where code = '1250';
  if not found then
    raise exception 'Akun Uang Muka Pembelian (1250) tidak ditemukan';
  end if;

  -- Create Journal
  insert into public.journals (journal_date, ref_type, ref_id, memo, created_by)
  values (
    p_journal_date,
    'PURCHASE_DP',
    v_purchase.id,
    coalesce(p_notes, 'DP Purchase ' || coalesce(v_purchase.purchase_no, 'PO-' || upper(substring(v_purchase.id::text from 1 for 8)))),
    auth.uid()
  ) returning id into v_journal_id;

  -- Debit DP
  insert into public.journal_lines (journal_id, account_id, debit, credit)
  values (v_journal_id, v_dp_account_id, p_amount, 0, 'Uang Muka Pembelian');

  -- Credit Bank/Cash
  insert into public.journal_lines (journal_id, account_id, debit, credit)
  values (v_journal_id, p_payment_account_id, 0, p_amount, 'Pembayaran DP Purchase');

  return v_journal_id;
end;
$$;
