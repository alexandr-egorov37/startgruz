'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, UserPlus, ShieldCheck, Camera, Plus, Trash2, CheckCircle2, Phone, MapPin } from 'lucide-react';
import { cn } from '../../../lib/utils';

// phone → sms → (existing → dashboard) | (new → city → verification → profile → portfolio → finished)
type Step = 'phone' | 'city' | 'verification' | 'profile' | 'portfolio' | 'finished';

const SERVICES_MAP: Record<string, string> = {
  loaders: 'Грузчики',
  gazelle: 'Газель',
  furniture: 'Сборка мебели',
  rigging: 'Такелаж',
};
const ALL_SERVICE_KEYS = Object.keys(SERVICES_MAP);

const PROGRESS_STEPS: Step[] = ['phone', 'city', 'verification', 'profile', 'portfolio'];

export default function ExecutorRegistration() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    const executorId = typeof window !== 'undefined' ? localStorage.getItem('executor_id') : null;
    if (executorId) {
      // Verify executor still exists before redirecting
      supabase.from('executors').select('id').eq('id', executorId).single()
        .then(({ data }) => {
          if (data?.id) {
            router.replace('/performer/dashboard');
          } else {
            localStorage.removeItem('executor_id');
          }
        });
    }
  }, [router]);

  // Phone
  const [phone, setPhone] = useState('');

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // City (separate from formData for the intermediate step)
  const [cityInput, setCityInput] = useState('');

  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    description: '',
    avatar: '',
    avito_url: '',
    whatsapp_phone: '',
    telegram_username: '',
    max_platform_url: '',
    passport_photo: '',
    selfie_photo: '',
  });

  const [portfolio, setPortfolio] = useState<{ photo_url: string; title: string; description: string }[]>([
    { photo_url: '', title: '', description: '' },
    { photo_url: '', title: '', description: '' },
    { photo_url: '', title: '', description: '' },
  ]);

  // File input refs
  const passportInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'passport_photo' | 'selfie_photo' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result.length > 3000000) { alert('Файл слишком большой. До 2МБ.'); return; }
      setFormData(prev => ({ ...prev, [field]: result }));
    };
    reader.readAsDataURL(file);
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    
    // Immediate conversion for '8'
    if (value === '8') return '+7 (';

    let formatted = "";
    const firstDigit = digits[0];

    if (firstDigit === "8" || firstDigit === "7") {
      formatted = "+7";
    } else {
      formatted = "+7 " + firstDigit;
    }

    if (digits.length > 1) {
      const remaining = firstDigit === "8" || firstDigit === "7" ? digits.substring(1) : digits;
      if (remaining.length > 0) formatted += " (" + remaining.substring(0, 3);
      if (remaining.length > 3) formatted += ") " + remaining.substring(3, 6);
      if (remaining.length > 6) formatted += "-" + remaining.substring(6, 8);
      if (remaining.length > 8) formatted += "-" + remaining.substring(8, 10);
    }
    
    return formatted.trim().substring(0, 18);
  };

  const normalizePhone = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = "7" + digits.substring(1);
    if (digits.length === 10) digits = "7" + digits;
    return digits;
  };

  const isPhoneValid = normalizePhone(phone).length === 11;

  // ── Прямая проверка номера (без SMS) ───────────────────────────────────
  const handlePhoneNext = async () => {
    if (!isPhoneValid) return;
    setLoading(true);
    setError('');
    try {
      const cleanPhone = normalizePhone(phone);
      const { data: existing } = await supabase
        .from('executors')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existing?.id) {
        localStorage.setItem('executor_id', existing.id);
        localStorage.setItem('role', 'executor');
        router.push('/performer/dashboard');
      } else {
        setStep('city');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  // ── City ─────────────────────────────────────────────────────────────────
  const handleCityNext = () => {
    if (!cityInput.trim()) return;
    setFormData(prev => ({ ...prev, city: cityInput.trim() }));
    setStep('verification');
  };

  // ── Profile steps ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 'verification') {
      if (!formData.name) return alert('Заполните ФИО');
      setStep('profile');
    } else if (step === 'profile') {
      if (!formData.avatar) return alert('Аватар обязателен');
      setStep('portfolio');
    }
  };

  // ── Portfolio ─────────────────────────────────────────────────────────────
  const addPortfolioItem = () => setPortfolio([...portfolio, { photo_url: '', title: '', description: '' }]);
  const removePortfolioItem = (i: number) => setPortfolio(portfolio.filter((_, idx) => idx !== i));
  const updatePortfolioItem = (i: number, field: string, value: string) => {
    const n = [...portfolio]; n[i] = { ...n[i], [field]: value }; setPortfolio(n);
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (portfolio.length < 3) return alert('Минимум 3 работы обязательны');
    if (!portfolio.every(p => p.photo_url && p.title)) return alert('Заполните все данные в работах (фото и заголовок)');

    setLoading(true);
    try {
      // 1. Create or get User
      const cleanPhone = normalizePhone(phone);
      const { data: userData, error: userError } = await supabase
        .from('users').insert([{ role: 'executor', phone: cleanPhone }]).select().single();

      let userId = userData?.id;
      if (userError?.code === '23505') {
        const { data: eu } = await supabase.from('users').select('id').eq('phone', cleanPhone).single();
        userId = eu?.id;
      } else if (userError) throw new Error(`Ошибка пользователя: ${userError.message}`);
      if (!userId) throw new Error('Не удалось получить ID пользователя');

      // 2. Create Executor
      const hasVerificationDocs = !!(formData.passport_photo && formData.selfie_photo);
      const verificationStatus = hasVerificationDocs ? 'pending' : 'unverified';
      
      const { passport_photo, selfie_photo, ...cleanFormData } = formData;
      const execPayload: any = { 
        user_id: userId, 
        phone: normalizePhone(phone), 
        ...cleanFormData, 
        balance: hasVerificationDocs ? 500 : 0, 
        rating: 0,
        services: selectedServices,
        status: 'pending',
      };

      // Try with verification_status; fallback without if column missing
      let { data: execData, error: execError } = await supabase
        .from('executors')
        .insert([{ ...execPayload, verification_status: verificationStatus }])
        .select().single();

      if (execError && execError.message?.includes('verification_status')) {
        ({ data: execData, error: execError } = await supabase
          .from('executors')
          .insert([execPayload])
          .select().single());
      }

      let finalExecId = execData?.id;

      if (execError) {
        if (execError.code === '23505') {
          const { data: ex } = await supabase.from('executors').select('id').eq('phone', normalizePhone(phone)).single();
          if (ex?.id) { localStorage.setItem('executor_id', ex.id); router.push('/performer/dashboard'); return; }
        }
        throw new Error(`Ошибка базы (профиль): ${execError.message}`);
      }
      if (!finalExecId) throw new Error('Профиль не был создан');

      // 3. Save verification documents if uploaded (skip silently if table missing)
      if (hasVerificationDocs) {
        try {
          await supabase.from('verification_documents').insert([{
            user_id: finalExecId,
            passport_url: passport_photo,
            selfie_url: selfie_photo,
            status: 'pending',
          }]);
        } catch (_) { /* table may not exist yet */ }
      }

      // 4. Portfolio
      const { error: portError } = await supabase.from('executor_portfolio')
        .insert(portfolio.map(p => ({ executor_id: finalExecId, ...p })));
      if (portError) throw new Error(`Ошибка базы (портфолио): ${portError.message}`);

      localStorage.setItem('executor_id', finalExecId);
      localStorage.setItem('role', 'executor');
      setStep('finished');
    } catch (err: any) {
      alert(err.message || 'Ошибка регистрации.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 md:p-8 relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl z-10 space-y-8">

        {/* Progress bar */}
        {step !== 'finished' && (
          <div className="flex items-center justify-between">
            <button onClick={() => { localStorage.removeItem('role'); window.location.href = '/'; }} className="flex items-center gap-2 text-white/40 hover:text-white transition group">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              На главную
            </button>
            <div className="flex gap-2">
              {PROGRESS_STEPS.map((s, i) => (
                <div key={s} className={cn('h-1.5 rounded-full transition-all duration-500',
                  step === s ? 'w-8 bg-yellow-500'
                  : i < PROGRESS_STEPS.indexOf(step) ? 'w-2 bg-yellow-500/40'
                  : 'w-2 bg-white/10'
                )} />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: PHONE ── */}
        {step === 'phone' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header className="space-y-3">
              <h1 className="text-4xl font-black tracking-tight">Вход / Регистрация</h1>
              <p className="text-white/40">Введите номер телефона — если вы уже зарегистрированы, попадёте в свой кабинет.</p>
            </header>

            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 pl-2">Мобильный телефон</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-5 w-5 h-5 text-yellow-500/50" />
                  <input
                    value={phone}
                    onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                    onKeyDown={e => { if (e.key === 'Enter' && isPhoneValid) handlePhoneNext(); }}
                    placeholder="+7 (___) ___-__-__"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-yellow-500/50 transition-all font-bold text-xl"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm font-bold">{error}</p>
              )}

              <button
                onClick={handlePhoneNext}
                disabled={loading || !isPhoneValid}
                className={cn(
                  "w-full font-black py-6 rounded-3xl text-xl transition-all",
                  isPhoneValid && !loading
                    ? "bg-yellow-500 text-black shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-95"
                    : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                {loading ? 'Проверяем...' : 'Продолжить'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: CITY ── */}
        {step === 'city' && (
          <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-full max-w-sm bg-white/5 border border-white/10 backdrop-blur-xl rounded-[40px] p-10 space-y-8 shadow-2xl shadow-black/50 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Из какого вы города?</h1>
              <input
                autoFocus
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCityNext(); }}
                placeholder="Назовите ваш город"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-center font-semibold text-lg outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/20"
              />
              <button
                onClick={handleCityNext}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-2xl text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-95"
              >
                ПРОДОЛЖИТЬ →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VERIFICATION (SELLING UX) ── */}
        {step === 'verification' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* ── Hero ── */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-full text-yellow-400 text-xs font-black tracking-wide animate-in zoom-in-95 duration-500">
                  🎁 Бонус 500 ₽ за подтверждение
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                Получите 500 ₽<br />
                <span className="text-yellow-400">+ больше заказов</span>
              </h1>
              <p className="text-white/35 text-sm leading-relaxed">
                Подтверждённые исполнители получают<br />больше заявок и доверия от заказчиков
              </p>
            </div>

            {/* ── Benefits card ── */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-2.5">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">После проверки вы получите:</p>
              {[
                { icon: '💰', text: '+500 ₽ на баланс' },
                { icon: '✅', text: 'Значок «Документы проверены»' },
                { icon: '🚀', text: 'Приоритет в выдаче среди исполнителей' },
                { icon: '🤝', text: 'Больше доверия от заказчиков' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-sm font-semibold text-white/70">{text}</span>
                </div>
              ))}
            </div>

            {/* ── Progress ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">Прогресс</span>
                <span className="text-[9px] font-black text-white/35">
                  {(formData.passport_photo ? 1 : 0) + (formData.selfie_photo ? 1 : 0)} / 2
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-green-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${((formData.passport_photo ? 1 : 0) + (formData.selfie_photo ? 1 : 0)) * 50}%` }}
                />
              </div>
            </div>

            {/* ── FIO ── */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 pl-1">ФИО полностью</label>
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иванов Иван Иванович"
                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 outline-none focus:border-yellow-500/30 transition-all"
              />
            </div>

            {/* ── Upload cards ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Passport */}
              <input type="file" ref={passportInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'passport_photo')} />
              <div
                onClick={() => passportInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden aspect-[3/4] group',
                  formData.passport_photo
                    ? 'bg-green-500/5 border-2 border-green-500/30 shadow-[0_0_24px_rgba(34,197,94,0.1)]'
                    : 'bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-yellow-500/30 hover:bg-yellow-500/[0.03] active:scale-[0.97]'
                )}
              >
                {formData.passport_photo ? (
                  <>
                    <img src={formData.passport_photo} className="absolute inset-0 w-full h-full object-cover opacity-25" />
                    <div className="relative z-10 flex flex-col items-center gap-2 animate-in zoom-in-50 duration-300">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-green-400" />
                      </div>
                      <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Готово</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                      <Camera className="w-6 h-6 text-white/25 group-hover:text-yellow-500/70 transition-colors" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">📷 Шаг 1</span>
                      <span className="text-sm font-bold text-white/70 block mt-0.5">Паспорт</span>
                      <span className="text-[10px] text-white/25 leading-tight block mt-1">Разворот с фото</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selfie */}
              <input type="file" ref={selfieInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'selfie_photo')} />
              <div
                onClick={() => selfieInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden aspect-[3/4] group',
                  formData.selfie_photo
                    ? 'bg-green-500/5 border-2 border-green-500/30 shadow-[0_0_24px_rgba(34,197,94,0.1)]'
                    : 'bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-yellow-500/30 hover:bg-yellow-500/[0.03] active:scale-[0.97]'
                )}
              >
                {formData.selfie_photo ? (
                  <>
                    <img src={formData.selfie_photo} className="absolute inset-0 w-full h-full object-cover opacity-25" />
                    <div className="relative z-10 flex flex-col items-center gap-2 animate-in zoom-in-50 duration-300">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-green-400" />
                      </div>
                      <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Готово</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                      <UserPlus className="w-6 h-6 text-white/25 group-hover:text-yellow-500/70 transition-colors" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">🤳 Шаг 2</span>
                      <span className="text-sm font-bold text-white/70 block mt-0.5">Селфи</span>
                      <span className="text-[10px] text-white/25 leading-tight block mt-1">Для подтверждения личности</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Privacy note ── */}
            <div className="flex items-start gap-2 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
              <span className="text-sm leading-none mt-0.5">🔒</span>
              <p className="text-[11px] text-white/30 leading-relaxed">
                Документы не публикуются и не передаются третьим лицам. Используются только для проверки личности.
              </p>
            </div>

            {/* ── CTA: verify ── */}
            <div className="space-y-1 pt-1">
              {/* Основная кнопка — активна только когда оба фото загружены */}
              <button
                onClick={handleNext}
                disabled={!(formData.passport_photo && formData.selfie_photo)}
                className={cn(
                  'w-full py-5 font-black text-lg rounded-3xl transition-all duration-300',
                  (formData.passport_photo && formData.selfie_photo)
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black shadow-[0_0_40px_rgba(234,179,8,0.25)] hover:shadow-[0_0_60px_rgba(234,179,8,0.35)] hover:scale-[1.02] active:scale-95 cursor-pointer'
                    : 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed'
                )}
              >
                {(formData.passport_photo && formData.selfie_photo)
                  ? '🔥 Активировать бонус'
                  : 'Активировать бонус'}
              </button>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-white/20 font-bold">или</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* ── Skip: активна только после ввода ФИО ── */}
              <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-4 space-y-3">
                <button
                  onClick={() => { setFormData(prev => ({ ...prev, passport_photo: '', selfie_photo: '' })); handleNext(); }}
                  disabled={!formData.name.trim()}
                  className={cn(
                    'w-full py-3 border font-bold text-sm rounded-xl transition-all duration-300',
                    formData.name.trim()
                      ? 'bg-white/[0.07] border-white/20 text-white/70 hover:bg-white/10 hover:border-white/30 hover:text-white/90 active:scale-[0.98] cursor-pointer'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/25 cursor-not-allowed'
                  )}
                >
                  Работать без документов
                </button>
                <p className="text-[10px] text-red-400/50 text-center leading-relaxed">
                  ⚠ У вас будет статус «Документы не проверены».<br />Это снижает доверие заказчиков.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PROFILE ── */}
        {step === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <header className="space-y-3">
              <h1 className="text-4xl font-black tracking-tight">Ваш профиль</h1>
              <p className="text-white/40">Расскажите о себе потенциальным клиентам.</p>
            </header>
            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-8">
              <div className="flex items-center gap-6">
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'avatar')} />
                <div className="relative group" onClick={() => avatarInputRef.current?.click()}>
                  <div className={cn('w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all cursor-pointer', formData.avatar ? 'border-green-500/50' : 'border-white/20 bg-white/5')}>
                    {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-white/20" />}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                    <span className="text-[10px] font-bold">ЗАГРУЗИТЬ</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/30">Аватар (обязательно)</label>
                  <input value={formData.avatar.startsWith('data:') ? '[Файл выбран]' : formData.avatar} onChange={e => setFormData({ ...formData, avatar: e.target.value })} placeholder="URL или выберите файл" className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 pl-2">О себе</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Напишите о своём опыте, оборудовании и преимуществах..." rows={4} className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 outline-none focus:border-yellow-500/30 text-white/80 resize-none" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 pl-2">Услуги (выберите все подходящие)</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SERVICE_KEYS.map(key => {
                    const active = selectedServices.includes(key);
                    return (
                      <button key={key} type="button"
                        onClick={() => setSelectedServices(prev =>
                          prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
                        )}
                        className={cn('px-4 py-2.5 rounded-full text-sm font-bold border transition-all active:scale-[0.95]',
                          active ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                                 : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60'
                        )}
                      >
                        {SERVICES_MAP[key]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 pl-2">Соцсети</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[{ key: 'avito_url', label: 'Avito', color: 'text-orange-500' }, { key: 'whatsapp_phone', label: 'WA', color: 'text-green-500' }, { key: 'telegram_username', label: 'TG', color: 'text-blue-500' }, { key: 'max_platform_url', label: 'Max', color: 'text-red-500' }].map(s => (
                    <div key={s.key} className="relative flex items-center">
                      <span className={cn('absolute left-4 text-xs font-bold', s.color)}>{s.label}</span>
                      <input value={(formData as any)[s.key]} onChange={e => setFormData({ ...formData, [s.key]: e.target.value })} placeholder={s.key.includes('phone') ? '+7...' : s.key.includes('username') ? '@user' : 'https://...'} className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-16 pr-4 text-xs" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleNext} className="w-full bg-yellow-500 text-black font-black py-6 rounded-3xl text-xl transition-all">Далее</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: PORTFOLIO ── */}
        {step === 'portfolio' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-20">
            <header className="space-y-3">
              <h1 className="text-4xl font-black tracking-tight uppercase">Портфолио работ</h1>
              <p className="text-white/40 font-medium">Минимум 3 кейса обязательны для публикации профиля.</p>
            </header>
            <div className="space-y-6">
              {portfolio.map((p, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4 relative group">
                  {portfolio.length > 3 && (
                    <button onClick={() => removePortfolioItem(idx)} className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                  <span className="text-[10px] font-black text-yellow-500/40 uppercase">Работа #{idx + 1}</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <input type="file" id={`p-${idx}`} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => updatePortfolioItem(idx, 'photo_url', r.result as string); r.readAsDataURL(f); } }} />
                      <div onClick={() => document.getElementById(`p-${idx}`)?.click()} className={cn('aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all overflow-hidden relative', p.photo_url ? 'border-green-500/50 bg-green-500/5' : 'bg-white/5 border-white/10 hover:border-yellow-500/50')}>
                        {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : <><Plus className="w-6 h-6 text-white/20 mb-1" /><span className="text-[8px] font-bold">ВЫБРАТЬ ФОТО</span></>}
                      </div>
                      <input value={p.photo_url.startsWith('data:') ? '[Файл выбран]' : p.photo_url} onChange={e => updatePortfolioItem(idx, 'photo_url', e.target.value)} placeholder="Ссылка или файл" className="mt-2 w-full bg-white/5 border border-white/5 rounded-lg p-2 text-[10px]" />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <input value={p.title} onChange={e => updatePortfolioItem(idx, 'title', e.target.value)} placeholder="Название (например: Переезд офиса)" className="w-full bg-white/5 border border-white/5 rounded-xl p-3 font-bold" />
                      <textarea value={p.description} onChange={e => updatePortfolioItem(idx, 'description', e.target.value)} placeholder="Краткое описание задачи..." rows={2} className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm resize-none" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addPortfolioItem} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-white/20 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 uppercase font-black text-xs tracking-widest">
                <Plus className="w-4 h-4" /> Добавить работу
              </button>
              <button disabled={loading} onClick={handleFinalSubmit} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black py-8 rounded-[40px] text-2xl shadow-2xl shadow-yellow-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-10">
                {loading ? 'СОЗДАЁМ ПРОФИЛЬ...' : 'ОПУБЛИКОВАТЬ'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: FINISHED ── */}
        {step === 'finished' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 shadow-2xl shadow-green-500/10">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <header className="space-y-4">
              <h1 className="text-5xl font-black">ГОТОВО!</h1>
              <p className="max-w-md mx-auto text-white/50 text-lg">Ваш аккаунт создан и отправлен на модерацию. <span className="text-yellow-500 font-bold underline underline-offset-4">Обычно это занимает 1 час.</span></p>
            </header>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-w-sm w-full space-y-4">
              <p className="text-xs uppercase font-black tracking-widest text-white/30">Следующие шаги:</p>
              <div className="space-y-3 text-left">
                {['Администратор проверит ваши данные', 'Вы получите уведомление об активации', 'Ваш профиль появится в выдаче для клиентов'].map((t, i) => (
                  <div key={i} className="flex gap-3"><span className="text-yellow-500 font-black">{i+1}.</span><span className="text-sm">{t}</span></div>
                ))}
              </div>
            </div>
            <button onClick={() => router.push('/performer/dashboard')} className="px-10 py-5 bg-white text-black font-black rounded-2xl uppercase tracking-tighter hover:bg-white/90 transition-colors">Понятно</button>
          </div>
        )}

      </div>
    </main>
  );
}
