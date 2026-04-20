-- ========================================
-- 1. EXTENSIONS
-- ========================================
create extension if not exists pgcrypto;

-- ========================================
-- 2. ORDERS (статус)
-- ========================================
alter table public.orders
add column if not exists status text default 'in_progress';

-- ========================================
-- 3. CASES (кейсы исполнителя)
-- ========================================
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  executor_id uuid not null,
  title text,
  description text,
  photo_url text,
  created_at timestamptz default now()
);

create index if not exists idx_cases_executor
on public.cases(executor_id);

-- ========================================
-- 4. REVIEWS (оценки)
-- ========================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  executor_id uuid not null,
  client_id uuid not null,
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_executor
on public.reviews(executor_id);

-- ========================================
-- 5. NOTIFICATIONS
-- ========================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user
on public.notifications(user_id);

-- ========================================
-- 6. ЗАЩИТА ОТ ДУБЛЕЙ
-- ========================================

-- один отзыв на заказ
create unique index if not exists uniq_review_per_order
on public.reviews(order_id, client_id);

-- один кейс на заказ (опционально)
create unique index if not exists uniq_case_per_order
on public.cases(order_id);

-- ========================================
-- 7. ФУНКЦИЯ: ЗАВЕРШЕНИЕ ЗАКАЗА
-- ========================================
create or replace function complete_order_and_create_case(
  p_order_id uuid,
  p_executor_id uuid,
  p_title text,
  p_description text,
  p_photo_url text,
  p_client_id uuid
)
returns void
language plpgsql
as $$
begin

  -- 1. Обновляем заказ
  update public.orders
  set status = 'completed'
  where id = p_order_id
  and status != 'completed';

  -- 2. Создаем кейс
  insert into public.cases (
    order_id,
    executor_id,
    title,
    description,
    photo_url
  )
  values (
    p_order_id,
    p_executor_id,
    p_title,
    p_description,
    p_photo_url
  )
  on conflict (order_id) do nothing;

  -- 3. Добавляем в портфолио исполнителя (автоматически)
  insert into public.executor_portfolio (
    executor_id,
    title,
    description,
    photo
  )
  values (
    p_executor_id,
    p_title,
    p_description,
    p_photo_url
  );

  -- 4. Уведомление заказчику
  insert into public.notifications (
    user_id,
    type,
    data
  )
  values (
    p_client_id,
    'order_completed',
    jsonb_build_object('order_id', p_order_id)
  );

end;
$$;

-- ========================================
-- 8. ФУНКЦИЯ: СОЗДАНИЕ ОТЗЫВА
-- ========================================
create or replace function create_review(
  p_order_id uuid,
  p_executor_id uuid,
  p_client_id uuid,
  p_rating int,
  p_comment text
)
returns void
language plpgsql
as $$
begin

  -- проверка: заказ завершен (completed или closed)
  if not exists (
    select 1 from public.orders
    where id = p_order_id
    and status in ('completed', 'closed')
  ) then
    raise exception 'Order is not completed';
  end if;

  -- вставка отзыва
  insert into public.reviews (
    order_id,
    executor_id,
    client_id,
    rating,
    comment
  )
  values (
    p_order_id,
    p_executor_id,
    p_client_id,
    p_rating,
    p_comment
  )
  on conflict (order_id, client_id) do nothing;

end;
$$;

-- ========================================
-- 9. VIEW: РЕЙТИНГ ИСПОЛНИТЕЛЯ
-- ========================================
create or replace view executor_rating as
select
  executor_id,
  round(avg(rating), 2) as rating,
  count(*) as reviews_count
from public.reviews
group by executor_id;

-- ========================================
-- 10. RLS (MVP ОТКРЫТЫЙ)
-- ========================================
alter table public.cases enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

create policy "cases_all"
on public.cases for all using (true) with check (true);

create policy "reviews_all"
on public.reviews for all using (true) with check (true);

create policy "notifications_all"
on public.notifications for all using (true) with check (true);
