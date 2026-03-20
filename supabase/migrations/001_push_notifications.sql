-- Push notification storage + delivery log
-- Run via Supabase migration tooling or SQL editor.

-- 1) Stores the browser push subscription per user
create table if not exists public.push_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

-- 2) Stores which notifications were already sent (prevents duplicates)
create table if not exists public.notification_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_date date not null,
  sent_at timestamptz not null default now(),
  -- Optional metadata to help debugging / future UX
  payload jsonb,
  unique (user_id, sent_date)
);

create index if not exists notification_logs_user_date_idx on public.notification_logs (user_id, sent_date desc);

-- Enable Row Level Security
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;

-- RLS Policies: users can only access their own rows
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
using (user_id = auth.uid());

drop policy if exists "notification_logs_select_own" on public.notification_logs;
create policy "notification_logs_select_own"
on public.notification_logs
for select
using (user_id = auth.uid());

drop policy if exists "notification_logs_insert_own" on public.notification_logs;
create policy "notification_logs_insert_own"
on public.notification_logs
for insert
with check (user_id = auth.uid());

drop policy if exists "notification_logs_update_own" on public.notification_logs;
create policy "notification_logs_update_own"
on public.notification_logs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notification_logs_delete_own" on public.notification_logs;
create policy "notification_logs_delete_own"
on public.notification_logs
for delete
using (user_id = auth.uid());

