-- Supabase dashboard > SQL Editor me poora paste karke Run karo.
-- Pehle neeche 'you@example.com' ko apni admin email se badal do (config.js wali email jaisi hi).

create table public.withdrawals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 60),
  upi        text not null check (upi ~ '^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$'),
  amount     integer not null check (amount between 1 and 100000),
  status     text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.withdrawals enable row level security;

-- Admin pehchaan: login email se (Supabase me "Confirm email" ON rakho, taaki koi aur ye email na le sake)
create or replace function public.is_admin()
returns boolean
language sql stable
as $$ select coalesce(auth.jwt() ->> 'email', '') = 'you@example.com' $$;

-- User sirf apni request bana sakta hai, aur wo hamesha 'pending' se shuru hogi
create policy "user inserts own pending"
  on public.withdrawals for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- User sirf apni requests dekhta hai, admin sabki
create policy "user reads own, admin reads all"
  on public.withdrawals for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Status sirf admin badal sakta hai (approve / reject / paid)
create policy "admin updates"
  on public.withdrawals for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Delete kisi ko nahi (koi policy nahi = band)
