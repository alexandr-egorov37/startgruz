-- 1. Расширение таблицы предложений (Offers)
-- Добавляем JSONB поле для структурированных опций и TEXT для комментариев
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS comment TEXT;

-- 2. Обновление статусов заказов
-- Добавляем 'offer_received' и 'matched' в разрешенные статусы
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('new', 'searching', 'offer_received', 'accepted', 'closed', 'CANCELLED', 'matched'));

-- 3. Добавление/обновление Realtime
-- Убедимся, что таблицы включены в публикацию (через консоль Supabase или SQL)
-- alter publication supabase_realtime add table public.offers;
-- alter publication supabase_realtime add table public.orders;

-- 4. Переименование (опционально для обратной совместимости)
-- Если вы хотите сохранить старые данные из 'conditions' в 'comment':
-- UPDATE public.offers SET comment = conditions WHERE comment IS NULL;
