-- ========================================
-- ВЕРИФИКАЦИЯ ИСПОЛНИТЕЛЕЙ
-- ========================================

-- 1. Таблица verification_documents
create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.executors(id) on delete cascade,
  passport_url text,
  selfie_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

create index if not exists idx_verification_user on public.verification_documents(user_id);

-- 2. Колонка verification_status в executors
alter table public.executors
add column if not exists verification_status text default 'unverified'
check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

-- 3. RLS для verification_documents
alter table public.verification_documents enable row level security;

-- Исполнитель видит только свои документы
create policy "Executors can view own docs"
  on public.verification_documents for select
  using (user_id = (select id from public.executors where id = user_id limit 1));

-- Исполнитель может создавать свои документы
create policy "Executors can insert own docs"
  on public.verification_documents for insert
  with check (true);

-- Исполнитель может обновлять свои документы
create policy "Executors can update own docs"
  on public.verification_documents for update
  using (true);

-- 4. Функция для расчёта trust_score
create or replace function get_trust_score(p_executor_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_rating numeric;
  v_reviews_count int;
  v_is_verified boolean;
  v_has_portfolio boolean;
  v_trust_score int;
  v_verification_status text;
begin
  -- Rating
  select coalesce(avg(rating), 0), count(*)
  into v_rating, v_reviews_count
  from public.reviews
  where executor_id = p_executor_id;

  -- Verification
  select verification_status
  into v_verification_status
  from public.executors
  where id = p_executor_id;
  
  v_is_verified := (v_verification_status = 'verified');

  -- Portfolio
  select exists(
    select 1 from public.executor_portfolio
    where executor_id = p_executor_id
    limit 1
  ) into v_has_portfolio;

  -- Trust score formula:
  -- rating (0-5 → 0-40) * 0.4 = max 40
  -- verification (0 or 1) * 0.3 = 0 or 30
  -- reviews (capped at 10) * 0.2 = max 20
  -- activity (portfolio) * 0.1 = 0 or 10
  v_trust_score := (
    (least(v_rating, 5) / 5.0 * 40)::int +
    (case when v_is_verified then 30 else 0 end) +
    (least(v_reviews_count, 10) / 10.0 * 20)::int +
    (case when v_has_portfolio then 10 else 0 end)
  );

  return jsonb_build_object(
    'trust_score', v_trust_score,
    'verification_status', coalesce(v_verification_status, 'unverified'),
    'rating', round(v_rating::numeric, 1),
    'reviews_count', v_reviews_count,
    'has_portfolio', v_has_portfolio,
    'is_verified', v_is_verified
  );
end;
$$;

-- 5. Защита бонуса
alter table public.executors
add column if not exists verification_bonus_given boolean default false;

-- 6. Функция одобрения верификации (для админа)
create or replace function approve_verification(p_executor_id uuid)
returns void
language plpgsql
as $$
begin
  -- Обновить статус в executors
  update public.executors
  set verification_status = 'verified'
  where id = p_executor_id;

  -- Обновить документ
  update public.verification_documents
  set status = 'approved', reviewed_at = now()
  where user_id = p_executor_id and status = 'pending';

  -- Начислить бонус только если ещё не начислялся
  update public.executors
  set balance = balance + 500, verification_bonus_given = true
  where id = p_executor_id and verification_bonus_given = false;
end;
$$;
