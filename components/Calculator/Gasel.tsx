'use client';

import { useState, useEffect } from 'react';
import { Truck, RotateCcw, ArrowRightLeft, ChevronLeft, Phone as PhoneIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import GaselIntercity from './GaselIntercity';
import PhoneVerification from '../PhoneVerification';
import { motion } from 'framer-motion';

interface GaselProps {
  onBack: () => void;
  city: string;
  onSumbit: (data: any, candidates?: any[]) => void;
}

type GaselMode = null | 'city' | 'intercity';

export default function Gasel({ onBack, city, onSumbit }: GaselProps) {
  const isShuya = city?.toLowerCase().includes('шуя') || city?.toLowerCase().includes('shuya');
  const [mode, setMode] = useState<GaselMode>(null);
  const [hours, setHours] = useState(1);
  const [extraPoints, setExtraPoints] = useState(0);
  const [carLen, setCarLen] = useState<'3-4' | '5-6'>('3-4');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone') || '';
    const savedName = localStorage.getItem('user_name') || '';
    setPhone(savedPhone);
    if (savedName) setName(savedName);
  }, []);

  const calculateCityPrice = () => {
    let base = hours * 800;
    base += extraPoints * 300;
    if (carLen === '5-6') base += 200;
    return base;
  };

  const handleSubmitCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name.trim()) {
      alert('Ошибка авторизации. Перезайдите');
      return;
    }
    await completeCitySubmission();
  };

  const completeCitySubmission = async () => {
    setIsSubmitting(true);
    localStorage.setItem('user_name', name.trim());
    const userPhone = localStorage.getItem('user_phone') || phone;
    console.log('ORDER CREATE:', { phone: userPhone, name: name.trim() });
    const price = calculateCityPrice();
    const finalData = {
      type: 'Газель',
      description: (name ? `Имя: ${name}\n` : '') + `Перевозка: ${hours}ч, ${carLen}м`,
      client_name: name || '',
      phone: userPhone,
      city: city || 'Не указано',
      status: 'searching',
      price_estimate: price,
      price_type: isShuya ? 'fixed' : 'request',
      from_address: city || 'Не указано',
      to_address: city || 'Не указано',
      floor_from: 1,
      floor_to: 1,
      movers_count: 0
    };

    try {
      console.log(">>> [GASEL CITY] SUBMITTING TO DB...", finalData);
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.from('orders').insert([finalData]).select('id');
      if (error) {
        console.error(">>> [GASEL CITY] DB INSERT FAILED:", error);
        throw error;
      }
      console.log(">>> [GASEL CITY] DB INSERT OK, id:", data?.[0]?.id);
      const completeOrder = { ...finalData, id: data?.[0]?.id };
      const { notifyExecutors } = await import('../../lib/notifications');
      const { candidates } = await notifyExecutors(completeOrder);
      onSumbit(completeOrder, candidates);
    } catch (err) {
      console.error(">>> [GASEL CITY] FULL ERROR:", err);
      onSumbit(finalData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'intercity') {
    return <GaselIntercity onBack={() => setMode(null)} city={city} onSumbit={onSumbit} />;
  }

  if (mode === 'city') {
    return (
      <div className="relative flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <button onClick={() => setMode(null)} className="w-9 h-9 flex items-center justify-center bg-white/[0.06] rounded-xl text-white/40 hover:text-white transition group border border-white/[0.08]">
             <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">По городу</h2>
          <div className="w-9 h-9" />
        </header>

        <form onSubmit={handleSubmitCity} className="flex-1 space-y-6">
           <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Время аренды</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(h)}
                      className={cn(
                        "h-12 rounded-2xl font-black transition-all text-sm",
                        hours === h 
                          ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25" 
                          : "bg-white/[0.06] text-white/40 hover:bg-white/10"
                      )}
                    >
                      {h}ч
                    </button>
                  ))}
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Доп. адреса</label>
                    <div className="flex items-center gap-3 bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.06]">
                      <button type="button" onClick={() => setExtraPoints(Math.max(0, extraPoints - 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] text-white font-black hover:bg-yellow-500 hover:text-black transition-colors">-</button>
                      <span className="flex-1 text-xl font-black text-white text-center">{extraPoints}</span>
                      <button type="button" onClick={() => setExtraPoints(extraPoints + 1)} className="w-10 h-10 rounded-xl bg-white/[0.06] text-white font-black hover:bg-yellow-500 hover:text-black transition-colors">+</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Длина кузова</label>
                    <div className="grid grid-cols-2 gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/[0.06]">
                      {(['3-4', '5-6'] as const).map(len => (
                        <button
                          key={len}
                          type="button"
                          onClick={() => setCarLen(len)}
                          className={cn(
                            "py-2.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest",
                            carLen === len ? "bg-white text-black" : "text-white/40 hover:text-white"
                          )}
                        >
                          {len === '3-4' ? '3–4м' : '5–6м'}
                        </button>
                      ))}
                    </div>
                  </div>
               </div>
           </div>

           <div className="pt-4 border-t border-white/[0.06] space-y-4">
             <div className="text-center space-y-1">
               <p className="text-yellow-500/50 text-[10px] uppercase font-black tracking-widest">
                 {isShuya ? 'Итого (расчёт)' : 'Стоимость поездки'}
               </p>
               <div className="flex items-center justify-center gap-2">
                 {!isShuya && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />}
                 <p className={cn(
                   "font-black text-white tracking-tight tabular-nums",
                   isShuya ? "text-3xl" : "text-xl uppercase"
                 )}>
                   {isShuya ? `${calculateCityPrice().toLocaleString()} ₽` : 'Цена по запросу'}
                 </p>
               </div>
               {!isShuya && (
                 <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] italic mt-1">⚡ В вашем городе цена формируется индивидуально</p>
               )}
             </div>

             <div className="space-y-2.5">
               <div className="space-y-2">
                 <input
                   type="text"
                   value={name}
                   onChange={e => setName(e.target.value)}
                   placeholder="Ваше имя"
                   className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-3.5 px-4 md:px-5 text-white text-sm md:text-lg font-black outline-none focus:border-yellow-500/40 transition-all placeholder:text-white/15"
                 />
                 <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3.5 px-4">
                   <PhoneIcon className="w-4 h-4 text-yellow-500/70" />
                   <span className="text-white/70 text-sm font-medium">{phone || 'Не указано'}</span>
                 </div>
               </div>
               <button
                 type="submit"
                 disabled={!phone || !name.trim() || isSubmitting}
                 className={cn(
                   "w-full h-12 rounded-2xl font-black text-base uppercase transition-all flex items-center justify-center relative overflow-hidden",
                   (phone && name.trim()) ? "bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black hover:brightness-110 active:scale-[0.98]" : "bg-white/[0.06] text-white/20 cursor-not-allowed"
                 )}
               >
                 {isSubmitting ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'ВЫЗВАТЬ ГАЗЕЛЬ'}
               </button>
             </div>
           </div>
        </form>
      </div>
    );
  }
  return (
    <div className="space-y-6 flex flex-col">
       <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight text-center">Перевозки</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
           onClick={() => setMode('city')}
           className="group relative flex flex-col items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/15 overflow-hidden"
        >
          <RotateCcw className="h-10 w-10 mb-3 text-yellow-500 transition-transform duration-300 group-hover:scale-110 relative z-10" />
          
          <h3 className="text-sm font-black text-white uppercase tracking-tight text-center relative z-10">По городу</h3>
          <p className="text-white/25 text-[10px] font-bold mt-1 text-center relative z-10 group-hover:text-white/40 transition-colors">
             От 800 ₽ / час
          </p>
        </button>

        <button
           onClick={() => setMode('intercity')}
           className="group relative flex flex-col items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/15 overflow-hidden"
        >
          <ArrowRightLeft className="h-10 w-10 mb-3 text-blue-400 transition-transform duration-300 group-hover:scale-110 relative z-10" />
          
          <h3 className="text-sm font-black text-white uppercase tracking-tight text-center relative z-10">Межгород</h3>
          <p className="text-white/25 text-[10px] font-bold mt-1 text-center relative z-10 group-hover:text-white/40 transition-colors">
             Фикс. тарифы
          </p>
        </button>
      </div>
    </div>
  );
}
