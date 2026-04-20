-- 1. Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('client', 'performer')) NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица исполнителей (улучшенная)
CREATE TABLE IF NOT EXISTS public.executors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  avatar TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'verified', 'rejected', 'revision')),
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ссылки и контакты
  avito_url TEXT,
  whatsapp_phone TEXT,
  telegram_username TEXT,
  max_platform_url TEXT,

  -- Верификация (для внутренней проверки)
  passport_photo TEXT,
  selfie_photo TEXT,

  balance INTEGER DEFAULT 500,
  rating FLOAT DEFAULT 0,
  services JSONB DEFAULT '{"loaders": true, "gazelle": true, "furniture": true, "rigging": false}',
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Портфолио (кейсы) исполнителя
CREATE TABLE IF NOT EXISTS public.executor_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executor_id UUID REFERENCES public.executors(id) ON DELETE CASCADE,
  photo TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Таблица заказов
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  phone TEXT,
  description TEXT,
  type TEXT,
  city TEXT DEFAULT 'Шуя',
  from_address TEXT,
  to_address TEXT,
  floor_from INTEGER,
  floor_to INTEGER,
  has_elevator BOOLEAN DEFAULT FALSE,
  movers_count INTEGER,
  price_estimate INTEGER DEFAULT 0,
  status TEXT DEFAULT 'searching',
  details JSONB DEFAULT '{}',
  scheduled_date TEXT,
  scheduled_time TEXT,
  accepted_by UUID REFERENCES public.executors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_executors_online ON public.executors(is_online, city);
CREATE INDEX IF NOT EXISTS idx_executors_verified ON public.executors(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 5. Настройка RLS (Безопасность)
ALTER TABLE public.executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executor_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политики доступа (для MVP разрешим публичный доступ на чтение и вставку)
CREATE POLICY "Allow public select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select executors" ON public.executors FOR SELECT USING (true);
CREATE POLICY "Allow public insert executors" ON public.executors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update executors" ON public.executors FOR UPDATE USING (true);
CREATE POLICY "Allow public select portfolio" ON public.executor_portfolio FOR SELECT USING (true);
CREATE POLICY "Allow public insert portfolio" ON public.executor_portfolio FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON public.orders FOR UPDATE USING (true);

-- 6. Назначенные заказы
CREATE TABLE IF NOT EXISTS public.orders_assigned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  executor_id UUID REFERENCES public.executors(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'notified', -- notified, accepted, ignored
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders_assigned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select assigned" ON public.orders_assigned FOR SELECT USING (true);
CREATE POLICY "Allow public insert assigned" ON public.orders_assigned FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update assigned" ON public.orders_assigned FOR UPDATE USING (true);

-- 7. Таблица предложений (ставок от исполнителей)
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  executor_id UUID REFERENCES public.executors(id) ON DELETE CASCADE,
  price INTEGER,
  options JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  contact_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_order_executor UNIQUE(order_id, executor_id)
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Allow public insert offers" ON public.offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update offers" ON public.offers FOR UPDATE USING (true);

-- 8. Таблица транзакций
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executor_id UUID REFERENCES public.executors(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

-- 8. Исполнители (улучшенный статус)
ALTER TABLE public.executors ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.executors ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 9. Таблица рассылки заказов исполнителям (ЗАЩИТА ОТ ДУБЛЕЙ)
CREATE TABLE IF NOT EXISTS public.executor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  executor_id UUID REFERENCES public.executors(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new',
  price_offer NUMERIC,
  comment TEXT,
  viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_executor_order UNIQUE(order_id, executor_id)
);

-- 10. Таблица отказов уведомлений (Fallback)
CREATE TABLE IF NOT EXISTS public.failed_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  executor_id UUID REFERENCES public.executors(id) ON DELETE CASCADE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE public.executor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_notifications ENABLE ROW LEVEL SECURITY;

-- Удаление старых политик
DROP POLICY IF EXISTS "executor reads own" ON public.executor_orders;
DROP POLICY IF EXISTS "allow insert" ON public.executor_orders;
DROP POLICY IF EXISTS "executor updates own" ON public.executor_orders;

-- 1. Чтение: Открыто для всех, так как аутентификация через localStorage
CREATE POLICY "allow select" ON public.executor_orders
FOR SELECT USING (true);

-- 2. Вставка: Разрешена всем (диспетчеру)
CREATE POLICY "allow insert" ON public.executor_orders
FOR INSERT WITH CHECK (true);

-- 3. Обновление
CREATE POLICY "allow update" ON public.executor_orders
FOR UPDATE USING (true);

-- 4. Политики для Fallback (Только чтение админом/вставка диспетчером)
CREATE POLICY "allow insert failed" ON public.failed_notifications
FOR INSERT WITH CHECK (true);

-- Realtime для новых заказов
-- alter publication supabase_realtime add table public.executor_orders;
