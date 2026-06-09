insert into public.signup_whitelist (email, invited_role)
values
  ('admin1@Mendjahit.com', 'ADMIN'),
  ('admin2@Mendjahit.com', 'ADMIN'),
  ('admin3@Mendjahit.com', 'ADMIN')
on conflict (email) do update
set invited_role = excluded.invited_role,
    invited_at = now();
