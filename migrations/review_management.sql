-- ========================================
-- REVIEW MANAGEMENT: Edit & Delete Requests
-- ========================================

-- Таблица для запросов на удаление отзывов
CREATE TABLE IF NOT EXISTS public.review_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  executor_id uuid NOT NULL,
  order_id uuid NOT NULL,
  reason text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX IF NOT EXISTS idx_review_deletion_requests_status 
ON public.review_deletion_requests(status);

CREATE INDEX IF NOT EXISTS idx_review_deletion_requests_client 
ON public.review_deletion_requests(client_id);

-- RLS для таблицы запросов на удаление
ALTER TABLE public.review_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_deletion_requests_all" 
ON public.review_deletion_requests FOR ALL 
USING (true) WITH CHECK (true);

-- ========================================
-- ФУНКЦИЯ: Обновление отзыва
-- ========================================
CREATE OR REPLACE FUNCTION update_review(
  p_review_id uuid,
  p_client_id uuid,
  p_rating int,
  p_comment text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Проверяем что отзыв принадлежит этому клиенту
  IF NOT EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE id = p_review_id 
    AND client_id = p_client_id
  ) THEN
    RAISE EXCEPTION 'Review not found or access denied';
  END IF;

  -- Обновляем отзыв
  UPDATE public.reviews
  SET 
    rating = p_rating,
    comment = p_comment,
    updated_at = now()
  WHERE id = p_review_id
  AND client_id = p_client_id;

END;
$$;

-- ========================================
-- ФУНКЦИЯ: Запрос на удаление отзыва
-- ========================================
CREATE OR REPLACE FUNCTION request_review_deletion(
  p_review_id uuid,
  p_client_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_executor_id uuid;
  v_order_id uuid;
BEGIN
  -- Получаем данные отзыва
  SELECT executor_id, order_id 
  INTO v_executor_id, v_order_id
  FROM public.reviews 
  WHERE id = p_review_id 
  AND client_id = p_client_id;

  IF v_executor_id IS NULL THEN
    RAISE EXCEPTION 'Review not found or access denied';
  END IF;

  -- Проверяем что запрос еще не создан
  IF EXISTS (
    SELECT 1 FROM public.review_deletion_requests 
    WHERE review_id = p_review_id 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Deletion request already exists';
  END IF;

  -- Создаем запрос на удаление
  INSERT INTO public.review_deletion_requests (
    review_id,
    client_id,
    executor_id,
    order_id,
    reason,
    status
  ) VALUES (
    p_review_id,
    p_client_id,
    v_executor_id,
    v_order_id,
    p_reason,
    'pending'
  );

END;
$$;

-- ========================================
-- ФУНКЦИЯ: Одобрение удаления отзыва (для админа)
-- ========================================
CREATE OR REPLACE FUNCTION approve_review_deletion(
  p_request_id uuid,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_review_id uuid;
BEGIN
  -- Получаем review_id из запроса
  SELECT review_id INTO v_review_id
  FROM public.review_deletion_requests
  WHERE id = p_request_id
  AND status = 'pending';

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Удаляем отзыв
  DELETE FROM public.reviews WHERE id = v_review_id;

  -- Обновляем статус запроса
  UPDATE public.review_deletion_requests
  SET 
    status = 'approved',
    resolved_at = now(),
    resolved_by = p_admin_id
  WHERE id = p_request_id;

END;
$$;

-- ========================================
-- ФУНКЦИЯ: Отклонение удаления отзыва (для админа)
-- ========================================
CREATE OR REPLACE FUNCTION reject_review_deletion(
  p_request_id uuid,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.review_deletion_requests
  SET 
    status = 'rejected',
    resolved_at = now(),
    resolved_by = p_admin_id
  WHERE id = p_request_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

END;
$$;
