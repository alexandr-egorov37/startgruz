'use client';

import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import PhoneVerification from '../PhoneVerification';
import { ChevronLeft, CheckCircle2, Calendar as CalendarIcon, Clock, Info, ChevronRight, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import { startOfDay, addDays, isSameDay, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface FurnitureAssemblyProps {
  onBack: () => void;
  city: string;
  onSumbit: (data: any, candidates?: any[]) => void;
}

export default function FurnitureAssembly({ onBack, city, onSumbit }: FurnitureAssemblyProps) {
  const [type, setType] = useState('Шкаф');
  const [count, setCount] = useState(1);
  const [hasInstruction, setHasInstruction] = useState(true);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone') || '';
    const savedName = localStorage.getItem('user_name') || '';
    setPhone(savedPhone);
    if (savedName) setName(savedName);
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState('Ближайшее');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const dateType = (() => {
    if (isSameDay(selectedDate, today)) return 'today';
    if (isSameDay(selectedDate, tomorrow)) return 'tomorrow';
    return 'custom';
  })();

  const isShuya = city?.toLowerCase().includes('шуя') || city?.toLowerCase().includes('shuya');

  const calculatePrice = () => {
    if (!isShuya) return 'Цена по запросу';
    if (type === 'Кухня') return 'от 3 000 ₽';
    return `от ${count * 500} ₽`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name.trim()) {
      alert('Ошибка авторизации. Перезайдите');
      return;
    }
    await completeSubmission();
  };

  const completeSubmission = async () => {
    setIsSubmitting(true);
    localStorage.setItem('user_name', name.trim());
    const userPhone = localStorage.getItem('user_phone') || phone;
    console.log('ORDER CREATE:', { phone: userPhone, name: name.trim() });
    const priceStr = calculatePrice();
    const finalData = {
      type: 'Сборка мебели',
      description: `Сборка: ${type} (${count} шт). ` + (name ? `Заказчик: ${name}. ` : '') + (comment ? `Коммент: ${comment}` : ''),
      phone: userPhone,
      city: city || 'Не указано',
      status: 'searching',
      price_estimate: parseInt(priceStr.replace(/[^0-9]/g, '')) || 0,
      price_type: isShuya ? 'fixed' : 'request',
      from_address: city || 'Не указано',
      to_address: city || 'Не указано',
      floor_from: 1,
      floor_to: 1,
      movers_count: 0,
      details: {
        furnitureType: type,
        quantity: count,
        hasInstruction,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime,
        dateType,
        customerName: name
      }
    };

    try {
      console.log(">>> [FURNITURE] SUBMITTING TO DB...", finalData);
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.from('orders').insert([finalData]).select('id');
      if (error) {
        console.error(">>> [FURNITURE] DB INSERT FAILED:", error);
        throw error;
      }
      console.log(">>> [FURNITURE] DB INSERT OK, id:", data?.[0]?.id);
      const completeOrder = { ...finalData, id: data?.[0]?.id };
      const { notifyExecutors } = await import('../../lib/notifications');
      const { candidates } = await notifyExecutors(completeOrder);
      onSumbit(completeOrder, candidates);
    } catch (err) {
      console.error(">>> [FURNITURE] FULL ERROR:", err);
      onSumbit(finalData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-col">
      
      <DatePicker isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} value={selectedDate} onChange={setSelectedDate} />
      <TimePicker isOpen={isTimePickerOpen} onClose={() => setIsTimePickerOpen(false)} value={selectedTime} onChange={setSelectedTime} selectedDate={selectedDate} />

      <header className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center bg-white/[0.06] rounded-xl text-white/40 hover:text-white transition group border border-white/[0.08]">
           <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h2 className="text-lg font-black text-white uppercase tracking-tight">Сборка мебели</h2>
        <div className="w-9 h-9" />
      </header>

      <form onSubmit={handleSubmit} className="flex-1 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Тип мебели</label>
            <div className="grid grid-cols-2 gap-2">
              {['Шкаф', 'Кухня', 'Кровать', 'Другое'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "h-11 rounded-2xl font-black transition-all uppercase text-[10px] tracking-widest",
                    type === t 
                      ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25" 
                      : "bg-white/[0.06] text-white/50 hover:bg-white/10"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Количество</label>
              <div className="relative overflow-hidden bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.06]">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                <div className="flex items-center gap-3 pl-2">
                  <button type="button" onClick={() => setCount(Math.max(1, count - 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] text-white font-black hover:bg-yellow-500 hover:text-black transition-colors">-</button>
                  <span className="flex-1 text-xl font-black text-white text-center tabular-nums">{count}</span>
                  <button type="button" onClick={() => setCount(count + 1)} className="w-10 h-10 rounded-xl bg-white/[0.06] text-white font-black hover:bg-yellow-500 hover:text-black transition-colors">+</button>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Инструкция</label>
                <div className="grid grid-cols-2 gap-1 bg-white/[0.04] p-1 rounded-xl">
                  {[true, false].map((v) => (
                    <button
                      key={v.toString()}
                      type="button"
                      onClick={() => setHasInstruction(v)}
                      className={cn(
                        "py-2 rounded-lg font-black transition-all text-[10px] uppercase tracking-widest",
                        hasInstruction === v ? "bg-white text-black" : "text-white/40 hover:text-white"
                      )}
                    >
                      {v ? 'Да' : 'Нет'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Когда?</label>
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <button 
                    type="button"
                    onClick={() => setSelectedDate(today)}
                    className={cn("flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", dateType === 'today' ? "bg-white text-black shadow-lg" : "bg-white/[0.04] text-white/40 hover:bg-white/10")}
                  >Сегодня</button>
                  <button 
                    type="button"
                    onClick={() => setSelectedDate(tomorrow)}
                    className={cn("flex-1 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", dateType === 'tomorrow' ? "bg-white text-black shadow-lg" : "bg-white/[0.04] text-white/40 hover:bg-white/10")}
                  >Завтра</button>
                </div>
                
                <button 
                  type="button"
                  onClick={() => setIsCalendarOpen(true)}
                  className={cn("w-full py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-2", dateType === 'custom' ? "bg-yellow-500 text-black shadow-lg" : "bg-white/[0.04] text-white/40 hover:bg-white/10")}
                >
                  <CalendarIcon className="w-3 h-3" />
                  {dateType === 'custom' ? format(selectedDate, 'dd MMMM', { locale: ru }) : 'ДРУГАЯ ДАТА'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsTimePickerOpen(true)}
                  className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between px-4 text-white hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-black uppercase text-[11px] tracking-tight">{selectedTime}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                </button>
                
                <div className="flex items-center gap-2 bg-yellow-500/5 p-2 rounded-xl border border-yellow-500/10">
                   <Info className="w-3 h-3 text-yellow-500/50 shrink-0" />
                   <p className="text-[7px] font-bold text-yellow-500/50 uppercase leading-tight">Ближайшие свободные мастера: через 40 минут</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] space-y-4">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <div className="text-center space-y-1 mb-2">
              <p className="text-yellow-500/50 text-[10px] uppercase font-black tracking-widest">
                {isShuya ? 'Примерная стоимость' : 'Стоимость работ'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {!isShuya && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />}
                <p className={cn(
                  "font-black text-white tracking-tight tabular-nums",
                  isShuya ? "text-3xl" : "text-xl uppercase"
                )}>
                  {isShuya ? `≈ ${calculatePrice()}` : calculatePrice()}
                </p>
              </div>
              {!isShuya && (
                <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 italic">
                  ⚡ В вашем городе цена формируется индивидуально
                </p>
              )}
            </div>

            <div className="space-y-2">
              <input
                required
                type="text"
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/15 focus:outline-none focus:border-yellow-500/40 transition font-black text-base"
              />
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                <Phone className="w-4 h-4 text-yellow-500/70" />
                <span className="text-white/70 text-sm font-medium">{phone || 'Не указано'}</span>
              </div>
            </div>
            
            <textarea
              placeholder="Ваш комментарий (если есть)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2 text-white placeholder:text-white/15 focus:outline-none focus:border-yellow-500/40 transition font-bold text-xs resize-none h-12"
            />
          </div>

          <div className="space-y-2.5">
            <button
              type="submit"
              disabled={!phone || !name.trim() || isSubmitting}
              className={cn(
                "w-full h-12 rounded-2xl font-black text-base transition-all flex items-center justify-center relative overflow-hidden",
                (phone && name.trim()) ? "bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black hover:brightness-110 active:scale-[0.98]" : "bg-white/[0.06] text-white/20 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Отправляем...
                </>
              ) : 'ОТПРАВИТЬ ЗАЯВКУ'}
            </button>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> Проверенные исполнители
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
