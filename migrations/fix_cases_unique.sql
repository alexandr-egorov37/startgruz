-- FIX: ON CONFLICT error in complete_order_and_create_case
-- Добавляем UNIQUE constraint на cases.order_id

create unique index if not exists uniq_case_per_order
on public.cases(order_id);
