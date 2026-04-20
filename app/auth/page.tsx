'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ShieldCheck, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { formatPhoneMask, extractPhoneDigits, validatePhone } from '../../lib/phone-mask';
import { supabase } from '../../lib/supabase';

// Минимальная защита: 5 секунд между попытками входа
const LOGIN_COOLDOWN_MS = 5000;

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'city'>('phone');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  // Для set-role используем edge function (требует сервисного ключа)
  const callFn = (name: string, body: object) =>
    fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

  // Авто-редирект если уже залогинен
  useEffect(() => {
    const userPhone = localStorage.getItem('user_phone');
    const userRole = localStorage.getItem('role');
    if (userPhone && userRole === 'executor') router.push('/performer/dashboard');
    else if (userPhone && userRole === 'customer') router.push('/customer');
  }, [router]);

  // Таймер обратного отсчёта cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleLogin = async () => {
    if (!validatePhone(phone)) {
      setError('Введите корректный номер телефона');
      return;
    }

    // Rate-limit: не чаще раза в 5 секунд
    const now = Date.now();
    const last = parseInt(localStorage.getItem('auth_last_attempt') || '0');
    const elapsed = now - last;
    if (elapsed < LOGIN_COOLDOWN_MS) {
      const left = Math.ceil((LOGIN_COOLDOWN_MS - elapsed) / 1000);
      setCooldown(left);
      setError(`Подождите ${left} сек`);
      return;
    }
    localStorage.setItem('auth_last_attempt', String(now));

    const cleanPhone = extractPhoneDigits(phone);
    setIsLoading(true);
    setError(null);

    try {
      // Ищем пользователя по номеру
      const { data: existing, error: findErr } = await supabase
        .from('users')
        .select('id, role, city')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (findErr && findErr.code !== 'PGRST116') throw findErr;

      let uid: string;
      let role: string | null = null;

      if (existing) {
        // Уже зарегистрирован
        uid = existing.id;
        role = existing.role ?? null;
      } else {
        // Новый пользователь — создаём запись
        const { data: newUser, error: insertErr } = await supabase
          .from('users')
          .insert({ phone: cleanPhone })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        uid = newUser.id;
      }

      // Сохраняем в localStorage
      localStorage.setItem('user_phone', cleanPhone);
      localStorage.setItem('user_id', uid);
      setUserId(uid);

      if (role) {
        // Роль известна — редирект сразу
        localStorage.setItem('role', role);
        localStorage.removeItem('pending_role');
        router.push(role === 'executor' || role === 'performer' ? '/performer/dashboard' : '/customer');
        return;
      }

      // Роль не задана — смотрим pending_role
      const pendingRole = localStorage.getItem('pending_role');
      if (pendingRole === 'customer') {
        setStep('city');
      } else if (pendingRole === 'executor') {
        await callFn('set-role', { user_id: uid, role: 'executor' });
        localStorage.setItem('role', 'executor');
        localStorage.removeItem('pending_role');
        router.push('/performer/auth');
      } else {
        router.push('/select-role');
      }
    } catch (err: any) {
      console.error('[auth] login error:', err);
      setError('Ошибка входа. Попробуйте ещё раз');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitySubmit = async () => {
    if (!city.trim()) {
      setError('Введите название города');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await callFn('set-role', { user_id: userId, role: 'customer' });
      localStorage.setItem('role', 'customer');
      localStorage.setItem('user_city', city.trim());
      localStorage.removeItem('pending_role');
      router.push('/customer');
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneMask(e.target.value));
    setError(null);
  };

  const handlePhoneFocus = () => {
    if (!phone) setPhone('+7');
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
    if (e.key === 'Enter' && validatePhone(phone)) handleLogin();
  };

  const btnDisabled = isLoading || !validatePhone(phone) || cooldown > 0;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <ShieldCheck className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
            {step === 'phone' ? 'Вход' : 'Ваш город'}
          </h1>
          <p className="text-white/40 font-medium">
            {step === 'phone'
              ? 'Введите номер для входа или регистрации'
              : 'Укажите город для получения заказов'}
          </p>
        </div>

        {/* Phone Step */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-white/60 text-sm font-medium mb-3">
                Номер телефона
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  onFocus={handlePhoneFocus}
                  onKeyDown={handlePhoneKeyDown}
                  placeholder="+7 (___) ___-__-__"
                  autoComplete="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/40 outline-none focus:border-yellow-500/50 transition-all"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-500 text-xs font-bold uppercase tracking-widest"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleLogin}
              disabled={btnDisabled}
              className="w-full h-14 bg-yellow-500 text-black rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : cooldown > 0 ? (
                `Подождите ${cooldown} сек`
              ) : (
                <>
                  Войти
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* City Step */}
        {step === 'city' && (
          <motion.div
            key="city"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-white/60 text-sm font-medium mb-3">
                Город
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()}
                  placeholder="Москва"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/40 outline-none focus:border-yellow-500/50 transition-all"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-red-500 text-xs font-bold uppercase tracking-widest"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleCitySubmit}
              disabled={isLoading || !city.trim()}
              className="w-full h-14 bg-yellow-500 text-black rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Продолжить
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
