-- Run once in Supabase Dashboard -> SQL Editor.
-- This is intentionally a public demo data model: visitors do not need accounts.

create table if not exists public.demo_orders (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_menu_items (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.system_heartbeats (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('up', 'down')),
  checks jsonb not null default '{}'::jsonb,
  message text not null
);

alter table public.demo_orders enable row level security;
alter table public.demo_menu_items enable row level security;
alter table public.system_heartbeats enable row level security;

grant select, insert, update on table public.demo_orders to anon, authenticated;
grant select, insert, update on table public.demo_menu_items to anon, authenticated;

drop policy if exists "demo orders are publicly readable" on public.demo_orders;
create policy "demo orders are publicly readable"
  on public.demo_orders for select to anon, authenticated using (true);

drop policy if exists "demo orders are publicly writable" on public.demo_orders;
create policy "demo orders are publicly writable"
  on public.demo_orders for insert to anon, authenticated with check (true);

drop policy if exists "demo orders are publicly updateable" on public.demo_orders;
create policy "demo orders are publicly updateable"
  on public.demo_orders for update to anon, authenticated using (true) with check (true);

drop policy if exists "demo menu is publicly readable" on public.demo_menu_items;
create policy "demo menu is publicly readable"
  on public.demo_menu_items for select to anon, authenticated using (true);

drop policy if exists "demo menu is publicly writable" on public.demo_menu_items;
create policy "demo menu is publicly writable"
  on public.demo_menu_items for insert to anon, authenticated with check (true);

drop policy if exists "demo menu is publicly updateable" on public.demo_menu_items;
create policy "demo menu is publicly updateable"
  on public.demo_menu_items for update to anon, authenticated using (true) with check (true);

-- Realtime publication is idempotent only through this guarded block.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'demo_orders'
  ) then
    alter publication supabase_realtime add table public.demo_orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'demo_menu_items'
  ) then
    alter publication supabase_realtime add table public.demo_menu_items;
  end if;
end $$;

-- There is intentionally no anon policy for system_heartbeats. Only the Vercel Function's
-- server-side secret key can read/write health history.
