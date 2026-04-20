'use client';

import { useMemo, useState, useEffect } from 'react';
import { Users, Box, Anchor, Wrench, Calendar as CalendarIcon, Clock, Info, ChevronRight, Phone as PhoneIcon, UserCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import FurnitureAssembly from './FurnitureAssembly';
import MovingForm from './MovingForm';
import RiggingForm from './RiggingForm';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import { startOfDay, addDays, isSameDay, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface LoadersProps {
  onBack: () => void;
  city: string;
  onSumbit: (data: any, candidates?: any[]) => void;
}

type LoaderType = null | 'moving' | 'rigging' | 'furniture' | 'hourly';

export default function Loaders({ onBack, city, onSumbit }: LoadersProps) {
  const isShuya = city?.toLowerCase().includes('шуя') || city?.toLowerCase().includes('shuya');
  const [type, setType] = useState<LoaderType>(null);
  const [movers, setMovers] = useState(2);
  const [task, setTask] = useState('');
  const [userData, setUserData] = useState({ phone: '', name: '' });
  const [hourlyStep, setHourlyStep] = useState(1);
  const [hourlyCount, setHourlyCount] = useState(2);
  const [hourlyHours, setHourlyHours] = useState(2);
  const [hourlyComment, setHourlyComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const dateType = useMemo(() => {
    if (isSameDay(selectedDate, today)) return 'today';
    if (isSameDay(selectedDate, tomorrow)) return 'tomorrow';
    return 'custom';
  }, [selectedDate, today, tomorrow]);

  useEffect(() => {
    if (isSameDay(selectedDate, today)) {
        const now = new Date();
        const currentHour = now.getHours();
        const selectedHour = parseInt(selectedTime.split(':')[0]);
        if (selectedHour <= currentHour) {
            const firstAvailable = [8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].find(h => h > currentHour + 1);
            if (firstAvailable) setSelectedTime(`${firstAvailable}:00`.padStart(5, '0'));
            else setSelectedTime('Ближайшее'); 
        }
    }
  }, [selectedDate, today, selectedTime]);

  const HOURLY_RATE = 450;

  const hourlyTotal = useMemo(() => {
    return hourlyCount * hourlyHours * HOURLY_RATE;
  }, [hourlyCount, hourlyHours]);

  // Load user data from localStorage
  useEffect(() => {
    const userPhone = localStorage.getItem('user_phone') || '';
    const userName = localStorage.getItem('user_name') || '';
    setUserData({ phone: userPhone, name: userName });
  }, []);

  
  const completeHourlySubmission = async () => {
    if (!userData.name || userData.name.trim().length < 2) {
      setNameError(true);
      return;
    }
    localStorage.setItem('user_name', userData.name.trim());
    setIsSubmitting(true);
    const userPhone = localStorage.getItem('user_phone') || userData.phone;
    console.log('ORDER CREATE:', { phone: userPhone, name: userData.name.trim() });
    const finalData = {
      type: 'Грузчики',
      city: city || 'Не указано',
      from_address: city || 'Не указано',
      to_address: city || 'Не указано',
      floor_from: 1,
      floor_to: 1,
      movers_count: hourlyCount,
      price_estimate: hourlyTotal,
      price_type: isShuya ? 'fixed' : 'request',
      details: {
        loadersCount: hourlyCount,
        hours: hourlyHours,
        rate: HOURLY_RATE,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime,
        dateType
      },
      description: (userData.name ? `Имя: ${userData.name}\n` : '') + (hourlyComment || `Грузчики: ${hourlyCount} чел, ${hourlyHours} ч. На ${format(selectedDate, 'd MMM', { locale: ru })} в ${selectedTime}`),
      phone: userPhone,
      status: 'searching'
    };

    try {
      console.log(">>> [HOURLY] SUBMITTING TO DB...", finalData);
      const { data, error } = await supabase.from('orders').insert([finalData]).select('id');
      if (error) {
        console.error(">>> [HOURLY] DB INSERT FAILED:", error);
        throw error;
      }
      console.log(">>> [HOURLY] DB INSERT OK, id:", data?.[0]?.id);
      const completeOrder = { ...finalData, id: data?.[0]?.id };
      const { notifyExecutors } = await import('../../lib/notifications');
      const { candidates } = await notifyExecutors(completeOrder as any);
      onSumbit(completeOrder, candidates);
    } catch (err) {
      console.error(">>> [HOURLY] FULL ERROR:", err);
      onSumbit(finalData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (type === 'furniture') {
    return <FurnitureAssembly onBack={() => setType(null)} city={city} onSumbit={onSumbit} />;
  }

  if (type === 'moving') {
    return <MovingForm onBack={() => setType(null)} city={city} onSumbit={onSumbit} />;
  }

  if (type === 'rigging') {
    return <RiggingForm onBack={() => setType(null)} city={city} onSumbit={onSumbit} />;
  }

  if (type === 'hourly') {
    return (
      <div className="relative flex flex-col gap-6">
        <DatePicker isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} value={selectedDate} onChange={setSelectedDate} />
        <TimePicker isOpen={isTimePickerOpen} onClose={() => setIsTimePickerOpen(false)} value={selectedTime} onChange={setSelectedTime} selectedDate={selectedDate} />

        {/* Step content */}
        {hourlyStep === 1 && (
          <div className="flex flex-col items-center gap-8 py-6">
            <h3 className="text-2xl md:text-3xl font-black text-white text-center leading-tight">Количество грузчиков</h3>
            <div className="flex gap-2.5 justify-center flex-wrap">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHourlyCount(n)}
                  className={cn(
                    'w-14 h-14 md:w-16 md:h-16 rounded-2xl font-black text-lg md:text-xl transition-all duration-200',
                    hourlyCount === n
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25 scale-105'
                      : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70'
                  )}
                >
                  {n === 6 ? '6+' : n}
                </button>
              ))}
            </div>
          </div>
        )}

        {hourlyStep === 2 && (
          <div className="flex flex-col items-center gap-8 py-6">
            <h3 className="text-2xl md:text-3xl font-black text-white text-center leading-tight">Время работы?</h3>
            <div className="w-full max-w-sm space-y-2">
              <div className="grid grid-cols-5 gap-2.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHourlyHours(h)}
                    className={cn(
                      'h-12 md:h-14 rounded-2xl font-black text-base md:text-lg transition-all duration-200',
                      hourlyHours === h
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25 scale-105'
                        : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <p className="text-yellow-500/50 text-[11px] font-bold text-center tracking-widest uppercase pt-1">* минимум 2 часа</p>
            </div>
          </div>
        )}

        {hourlyStep === 3 && (
          <div className="flex flex-col gap-6 py-6">
            <h3 className="text-xl md:text-2xl font-black text-white text-center leading-tight">Когда?</h3>
            <div className="grid grid-cols-1 gap-3 w-full max-w-sm mx-auto">
              <div className="flex gap-2">
                <button 
                    onClick={() => setSelectedDate(today)}
                    className={cn("flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2", dateType === 'today' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/5 text-white/30")}
                >Сегодня</button>
                <button 
                    onClick={() => setSelectedDate(tomorrow)}
                    className={cn("flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2", dateType === 'tomorrow' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/5 text-white/30")}
                >Завтра</button>
              </div>

                  <button 
                      onClick={() => setIsCalendarOpen(true)}
                      className={cn("w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 flex items-center justify-center gap-3", dateType === 'custom' ? "bg-yellow-500 border-yellow-500 text-black" : "bg-white/5 border-white/5 text-white/40")}
                  >
                      <CalendarIcon className="w-4 h-4" />
                      {dateType === 'custom' ? format(selectedDate, 'dd MMMM', { locale: ru }) : 'ДРУГАЯ ДАТА'}
                  </button>

              <button
                  onClick={() => setIsTimePickerOpen(true)}
                  className="w-full h-14 rounded-2xl bg-white/[0.03] border-2 border-white/5 flex items-center px-8 text-white font-black uppercase text-lg tracking-tighter relative hover:bg-white/[0.08]"
              >
                  <Clock className="w-5 h-5 text-yellow-500 mr-4" />
                  {selectedTime}
                  <ChevronRight className="absolute right-8 w-5 h-5 opacity-20" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 bg-yellow-500/10 p-3 rounded-2xl border border-yellow-500/15 w-full max-w-sm mx-auto">
                 <Info className="w-4 h-4 text-yellow-500/70 shrink-0" />
                 <p className="text-[9px] font-bold text-yellow-500/70 uppercase">Ближайшие свободные мастера: через 40 минут</p>
            </div>
          </div>
        )}

        {hourlyStep === 4 && (
          <div className="py-2">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-5 md:p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black px-3 py-0.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest">Грузчики</div>

              <div className="flex items-center gap-6 text-sm font-bold text-white/80">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">👷</span>
                  <span className="uppercase text-xs tracking-wide">{hourlyCount} чел</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">🕒</span>
                  <span className="uppercase text-xs tracking-wide">{hourlyHours} ч × {HOURLY_RATE} ₽/ч</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm font-bold text-white/80">
                  <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span className="uppercase text-xs tracking-wide">{format(selectedDate, 'd MMM', { locale: ru })} • {selectedTime}</span>
              </div>

              <div className="mt-4 mb-5">
                {isShuya ? (
                  <p className="text-3xl md:text-4xl font-black tracking-tight text-yellow-500 tabular-nums">
                    ≈ {hourlyTotal.toLocaleString()} ₽
                  </p>
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-xl font-black uppercase tracking-tight">Цена по запросу</span>
                    </div>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">⚡ В вашем городе цена формируется индивидуально</p>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {/* User info: name input + phone display */}
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Ваши данные</p>
                  
                  {/* Name input */}
                  <div>
                    <div className={`flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 border transition-all ${nameError ? 'border-red-500/60 bg-red-500/[0.04]' : 'border-white/[0.08] focus-within:border-yellow-500/40'}`}>
                      <UserCircle className={`w-4 h-4 shrink-0 ${nameError ? 'text-red-400' : 'text-white/30'}`} />
                      <input
                        type="text"
                        value={userData.name}
                        onChange={(e) => {
                          setUserData({ ...userData, name: e.target.value });
                          if (e.target.value.trim().length >= 2) setNameError(false);
                        }}
                        placeholder="Ваше имя"
                        className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder:text-white/20"
                      />
                    </div>
                    {nameError && (
                      <p className="text-red-400 text-[11px] font-bold mt-1.5 ml-1">Введите имя для отправки заявки</p>
                    )}
                  </div>

                  {/* Phone display */}
                  <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
                    <PhoneIcon className="w-4 h-4 text-yellow-500/70 shrink-0" />
                    <span className="text-white/70 text-sm font-medium">{userData.phone || 'Не указано'}</span>
                  </div>
                </div>
                
                <textarea
                  value={hourlyComment}
                  onChange={e => setHourlyComment(e.target.value)}
                  placeholder="Ваш комментарий (если есть)..."
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3 px-4 text-white/80 text-sm outline-none focus:border-white/15 transition-all resize-none h-14 placeholder:text-white/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (hourlyStep === 1) { setType(null); return; }
                setHourlyStep((s) => Math.max(1, s - 1));
              }}
              className="h-12 px-5 rounded-2xl font-black text-sm text-white/50 bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5 hover:bg-white/10 transition-all shrink-0"
            >
              ‹ Назад
            </button>

            {hourlyStep < 4 ? (
              <button
                type="button"
                onClick={() => setHourlyStep((s) => s + 1)}
                className="flex-1 h-12 rounded-2xl font-black text-base bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Далее ›
              </button>
            ) : (
              <button
                type="button"
                onClick={completeHourlySubmission}
                disabled={isSubmitting || !userData.phone || !userData.name.trim()}
                className={cn(
                  'flex-1 h-12 rounded-2xl font-black text-base transition-all flex items-center justify-center',
                  (userData.phone && userData.name.trim() && !isSubmitting)
                    ? 'bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black hover:brightness-110 active:scale-[0.98]'
                    : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                )}
              >
                {isSubmitting ? 'Отправляем...' : 'ОТПРАВИТЬ ЗАЯВКУ'}
              </button>
            )}
          </div>

          <div className="flex justify-center items-center gap-1.5 mt-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={cn('h-1 rounded-full transition-all duration-300', n <= hourlyStep ? 'w-8 bg-yellow-500' : 'w-6 bg-white/10')} />
            ))}
          </div>
          <p className="text-[10px] text-white/15 font-bold uppercase tracking-widest text-center mt-1">Шаг {hourlyStep} из 4</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 md:py-10 space-y-8">
      {/* Label + Heading */}
      <div className="text-center space-y-3">
        <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.35em]">Калькулятор</p>
        <h2 className="text-2xl md:text-4xl font-black text-white italic text-center">Что нужно сделать?</h2>
      </div>

      {/* Service Cards */}
      <div className="w-full max-w-2xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { id: 'moving', title: 'Переезд', icon: Box, desc: 'Грузчики + ГАЗель' },
          { id: 'hourly', title: 'Грузчики', icon: Users, desc: 'Просто люди' },
          { id: 'rigging', title: 'Такелаж', icon: Anchor, desc: 'Тяжёлые грузы' },
          { id: 'furniture', title: 'Сборка мебели', icon: Wrench, badge: 'NEW', desc: 'Шкафы, кухни' },
        ].map((it) => (
          <button
             key={it.id}
             onClick={() => {
               setType(it.id as LoaderType);
               if (it.id === 'hourly') {
                 setHourlyStep(1);
                 setHourlyCount(2);
                 setHourlyHours(2);
                 setUserData(prev => ({ ...prev }));
               }
             }}
             className="group relative flex flex-col items-center bg-white/[0.06] border border-white/[0.1] rounded-2xl p-5 md:p-7 transition-all duration-300 hover:bg-white/[0.12] hover:border-white/20"
          >
            {it.badge && (
               <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse z-20">
                {it.badge}
               </span>
            )}

            <it.icon className="h-10 w-10 mb-3 text-yellow-500 transition-transform duration-300 group-hover:scale-110" />
            
            <h3 className="text-sm font-black text-white text-center">{it.title}</h3>
            
            {'desc' in it && it.desc && (
              <p className="text-white/30 text-[10px] font-medium mt-1 text-center group-hover:text-white/50 transition-colors">{it.desc}</p>
            )}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="pt-4">
        <div className="flex justify-center items-center gap-1.5">
          <div className="w-8 h-1 rounded-full bg-yellow-500" />
          <div className="w-6 h-1 rounded-full bg-white/10" />
          <div className="w-6 h-1 rounded-full bg-white/10" />
        </div>
        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center mt-2">Шаг 1 из 3</p>
      </div>
    </div>
  );
}
