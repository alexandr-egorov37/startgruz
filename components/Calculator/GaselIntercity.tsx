'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, ChevronRight, Info, Loader2, ChevronLeft, Phone as PhoneIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { intercityRates, IntercityRate } from '../../data/intercityRates';
import PhoneVerification from '../PhoneVerification';

interface GaselIntercityProps {
  onBack: () => void;
  city: string;
  onSumbit: (data: any, candidates?: any[]) => void;
}

export default function GaselIntercity({ onBack, city, onSumbit }: GaselIntercityProps) {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<IntercityRate | null>(null);
  const [carLen, setCarLen] = useState<'3-4' | '5-6'>('3-4');
  const [isTowing, setIsTowing] = useState(false);
  const [extraPoints, setExtraPoints] = useState(0);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone') || '';
    const savedName = localStorage.getItem('user_name') || '';
    setPhone(savedPhone);
    if (savedName) setName(savedName);
  }, []);

  const isShuya = city === 'Шуя';

  const filteredCities = useMemo(() => {
    if (!search) return intercityRates.slice(0, 8);
    return intercityRates.filter(c => c.city.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const calculateFinalPrice = (): string | number => {
    if (!selectedCity) return 0;
    if (!isShuya) return 0;

    let base: any = 0;
    const kmValue = typeof selectedCity.km === 'string' ? 0 : (selectedCity.km || 0);
    const rawPrice = carLen === '3-4' ? selectedCity.price3mt : selectedCity.price5mt;

    if (typeof rawPrice === 'string' && rawPrice.includes('–')) {
        return rawPrice;
    }

    if (kmValue < 100 && selectedCity.km !== '—' && kmValue > 0) {
      base = Number(rawPrice);
    } else if (selectedCity.km === '—') {
      base = Number(rawPrice);
    } else if (kmValue >= 100 && kmValue <= 200) {
      base = 70 * kmValue + 800;
      if (carLen === '5-6') base += 200;
    } else if (kmValue > 200) {
      if (selectedCity.city.includes('Москва')) {
          base = 100 * kmValue;
          if (carLen === '5-6') base += 200;
      } else {
        base = 70 * kmValue;
        if (carLen === '5-6') base += 200;
      }
    }

    if (isTowing) base += 1000;
    if (extraPoints > 0) {
        if (selectedCity.city.includes('Москва')) base += extraPoints * 2000;
        else base += extraPoints * 500;
    }

    return base;
  };

  const finalPrice = calculateFinalPrice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name.trim()) {
      alert('Ошибка авторизации. Перезайдите');
      return;
    }
    await completeSubmission();
  };

  const handleNonShuyaClick = async () => {
    if (!phone || !name.trim()) {
      alert('Ошибка авторизации. Перезайдите');
      return;
    }
    await completeNonShuyaSubmission();
  };

  const completeSubmission = async () => {
    setIsSubmitting(true);
    localStorage.setItem('user_name', name.trim());
    const userPhone = localStorage.getItem('user_phone') || phone;
    console.log('ORDER CREATE:', { phone: userPhone, name: name.trim() });
    const priceStr = calculateFinalPrice();
    const finalData = {
      type: 'Газель Межгород',
      description: (name ? `Имя: ${name}\n` : '') + `Межгород: ${selectedCity?.city}`,
      client_name: name || '',
      phone: userPhone,
      city: city,
      status: 'searching',
      price_estimate: typeof priceStr === 'number' ? priceStr : 0,
      price_type: isShuya ? 'fixed' : 'request',
      from_address: city || 'Не указано',
      to_address: selectedCity?.city || 'Не указано',
      floor_from: 1,
      floor_to: 1,
      movers_count: 0
    };

    try {
      console.log(">>> [INTERCITY] SUBMITTING TO DB...", finalData);
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.from('orders').insert([finalData]).select('id');
      if (error) {
        console.error(">>> [INTERCITY] DB INSERT FAILED:", error);
        throw error;
      }
      console.log(">>> [INTERCITY] DB INSERT OK, id:", data?.[0]?.id);
      const completeOrder = { ...finalData, id: data?.[0]?.id };
      const { notifyExecutors } = await import('../../lib/notifications');
      const { candidates } = await notifyExecutors(completeOrder);
      onSumbit(completeOrder, candidates);
    } catch (err) {
      console.error(">>> [INTERCITY] FULL ERROR:", err);
      onSumbit(finalData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeNonShuyaSubmission = async () => {
    setIsSubmitting(true);
    const userPhone = localStorage.getItem('user_phone') || phone;
    console.log('ORDER CREATE [NON-SHUYA]:', { phone: userPhone, name: name.trim() });
    const finalData = {
        type: 'Газель Межгород',
        description: 'Запрос на расчёт Межгород (не Шуя)',
        phone: userPhone,
        city,
        status: 'searching',
        from_address: city || 'Не указано',
        to_address: 'Иваново (расчет)',
        floor_from: 1,
        floor_to: 1,
        movers_count: 0,
        price_type: 'request'
    };
    try {
        console.log(">>> [INTERCITY NON-SHUYA] SUBMITTING TO DB...", finalData);
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase.from('orders').insert([finalData]).select('id');
        if (error) {
          console.error(">>> [INTERCITY NON-SHUYA] DB INSERT FAILED:", error);
          throw error;
        }
        console.log(">>> [INTERCITY NON-SHUYA] DB INSERT OK, id:", data?.[0]?.id);
        const completeOrder = { ...finalData, id: data?.[0]?.id };
        const { notifyExecutors } = await import('../../lib/notifications');
        const { candidates } = await notifyExecutors(completeOrder);
        onSumbit(completeOrder, candidates);
    } catch (e) {
        console.error(">>> [INTERCITY NON-SHUYA] FULL ERROR:", e);
        onSumbit(finalData);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isShuya) {
    return (
      <div className="relative min-h-[500px] flex flex-col pt-4">
        <header className="flex items-center justify-between mb-8 text-white">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-white/40 hover:text-white transition group border border-white/5">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tighter">МЕЖГОРОД</h2>
          <div className="w-10 h-10" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center space-y-10 px-4">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center border-t-2 border-blue-500/20 shadow-2xl">
             <Info className="h-10 w-10 text-blue-400" />
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-black text-white uppercase leading-none">ТОЛЬКО ИЗ ШУИ</h2>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[240px] mx-auto">
              Расчёт временно доступен только для выезда из г. Шуя. Иваново — по запросу.
            </p>
          </div>
          <div className="w-full space-y-4">
             <div className="space-y-2">
               <input 
                  type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" 
                  className="w-full bg-white/5 border-2 border-white/10 rounded-[28px] px-6 py-5 text-white font-black text-lg outline-none focus:border-blue-500/50 transition-all placeholder:text-white/5 shadow-2xl" 
               />
               <div className="flex items-center gap-3 bg-white/5 border-2 border-white/10 rounded-[28px] px-6 py-5">
                 <PhoneIcon className="w-5 h-5 text-yellow-500/70" />
                 <span className="text-white/70 font-black text-lg">{phone || 'Не указано'}</span>
               </div>
             </div>
             <button 
                disabled={isSubmitting || !phone || !name.trim()}
                onClick={handleNonShuyaClick} 
                className={cn(
                  "w-full h-20 rounded-[30px] font-black uppercase text-lg transition-all",
                  (phone && name.trim()) ? "bg-blue-500 text-white shadow-blue-500/20 hover:scale-[1.02]" : "bg-white/5 text-white/10 opacity-50 cursor-not-allowed"
                )}
             >
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'ЗАПРОСИТЬ РАСЧЁТ'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px] flex flex-col pt-4">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-white/40 hover:text-white transition group border border-white/5">
           <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">МЕЖГОРОД</h2>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 space-y-8">
        <div className="bg-white/[0.03] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Направления из Шуи</span>
            <Search className="w-4 h-4 text-white/20" />
          </div>
          <div className="max-h-[220px] overflow-y-auto no-scrollbar grid grid-cols-2 gap-px bg-white/5">
            {intercityRates.slice(0, 30).map((r, i) => (
              <button
                key={i}
                onClick={() => { setSelectedCity(r); setSearch(r.city); }}
                className={cn(
                  "p-4 text-left transition-all border-none outline-none group",
                  selectedCity?.city === r.city ? "bg-yellow-500" : "bg-black/60 hover:bg-white/[0.03]"
                )}
              >
                <div className={cn("text-xs font-black uppercase tracking-tight truncate", selectedCity?.city === r.city ? "text-black" : "text-white/60 group-hover:text-white")}>{r.city}</div>
                <div className={cn("text-[10px] font-black mt-0.5", selectedCity?.city === r.city ? "text-black/60" : "text-yellow-500")}>
                  {r.price3mt && typeof r.price3mt === 'string' ? r.price3mt : `${r.price3mt} ₽`}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative group">
          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500 z-10" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedCity(null); }}
            placeholder="Выберите или введите город..."
            className="w-full bg-white/5 border-2 border-white/10 rounded-[28px] py-6 pl-16 pr-8 text-white text-lg font-black outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/10 shadow-2xl"
          />
          {search && !selectedCity && filteredCities.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#121212] border-2 border-white/10 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden">
               {filteredCities.map((c, i) => (
                 <button
                   key={i}
                   onClick={() => { setSelectedCity(c); setSearch(c.city); }}
                   className="w-full p-5 text-left border-b border-white/5 hover:bg-white/5 text-white flex justify-between items-center transition group"
                 >
                   <div>
                     <div className="font-black text-base uppercase tracking-tight">{c.city}</div>
                     <div className="text-[10px] text-white/30 uppercase font-black tracking-widest">{c.km} КМ ОТ ШУИ</div>
                   </div>
                   <ChevronRight className="h-5 w-5 text-yellow-500 group-hover:translate-x-1 transition-transform" />
                 </button>
               ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Машина</label>
             <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-2xl">
               {(['3-4', '5-6'] as const).map(len => (
                  <button key={len} onClick={() => setCarLen(len)} className={cn("py-3 rounded-xl font-black text-[10px] uppercase transition-all", carLen === len ? "bg-white text-black" : "text-white/40 hover:text-white")}>
                    {len === '3-4' ? '3–4м' : '5–6м'}
                  </button>
               ))}
             </div>
           </div>
           <div className="space-y-2">
             <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Точки</label>
             <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
                <button onClick={() => setExtraPoints(Math.max(0, extraPoints - 1))} className="w-9 h-9 rounded-xl bg-black text-white hover:bg-yellow-500 hover:text-black transition-colors">-</button>
                <span className="flex-1 text-center font-black text-white text-lg">{extraPoints}</span>
                <button onClick={() => setExtraPoints(extraPoints + 1)} className="w-9 h-9 rounded-xl bg-black text-white hover:bg-yellow-500 hover:text-black transition-colors">+</button>
             </div>
           </div>
        </div>
      </div>

      <div className="mt-8 sticky bottom-0 left-0 right-0 py-6 pb-8 z-[60]">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
           {selectedCity && (
             <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                         <MapPin className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="text-left">
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1.5">Направление</p>
                         <p className="text-white font-black text-lg uppercase tracking-tight leading-none">{selectedCity.city}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest leading-none mb-1.5">Тариф</p>
                      <p className="text-white text-2xl font-black tabular-nums leading-none">
                         {typeof finalPrice === 'number' ? `${finalPrice.toLocaleString('ru-RU')} ₽` : finalPrice}
                      </p>
                   </div>
                </div>

                <div className="h-px bg-white/5 w-full" />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Ваше имя" 
                      className="w-full bg-white/5 border border-white/10 rounded-[24px] py-5 px-6 text-white font-black text-lg outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/10" 
                    />
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[24px] py-5 px-6">
                      <PhoneIcon className="w-5 h-5 text-yellow-500/70" />
                      <span className="text-white/70 font-black text-lg">{phone || 'Не указано'}</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedCity || !phone || !name.trim() || isSubmitting}
                    className={cn(
                      "w-full h-20 rounded-[30px] font-black text-xl uppercase transition-all shadow-[0_20px_50px_rgba(234,179,8,0.2)] relative overflow-hidden",
                      (selectedCity && phone && name.trim()) ? "bg-yellow-500 text-black hover:scale-[1.02]" : "bg-white/5 text-white/10 opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'ЗАКАЗАТЬ ПЕРЕВОЗКУ'}
                  </button>
                </div>
             </div>
           )}
        </form>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
