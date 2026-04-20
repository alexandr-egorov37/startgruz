-- ========================================
-- CONTACTS TABLE (не зависит от статуса заказа)
-- ========================================
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  executor_id uuid not null,
  order_id uuid,
  created_at timestamptz default now()
);

create unique index if not exists uniq_contact_pair
on public.contacts(client_id, executor_id);

create index if not exists idx_contacts_client on public.contacts(client_id);
create index if not exists idx_contacts_executor on public.contacts(executor_id);

-- RLS (MVP open)
alter table public.contacts enable row level security;

create policy "contacts_select" on public.contacts for select using (true);
create policy "contacts_insert" on public.contacts for insert with check (true);
create policy "contacts_update" on public.contacts for update using (true) with check (true);

-- ========================================
-- MIGRATE EXISTING DATA: create contacts from existing contact_purchased orders
-- ========================================
insert into public.contacts (client_id, executor_id, order_id, created_at)
select 
  o.user_id as client_id,
  o.accepted_by as executor_id,
  o.id as order_id,
  o.updated_at as created_at
from public.orders o
where o.status in ('contact_purchased', 'completed', 'closed')
  and o.accepted_by is not null
  and o.user_id is not null
on conflict (client_id, executor_id) do nothing;

-- ========================================
-- Realtime for contacts
-- ========================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
