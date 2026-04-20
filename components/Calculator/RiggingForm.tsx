'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  ChevronRight, 
  ChevronLeft,
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare, 
  CheckCircle2,
  Info,
  Phone as PhoneIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import PhoneVerification from '../PhoneVerification';

interface RiggingFormProps {
  onBack: () => void;
  city: string;
  onSumbit: (data: any, candidates?: any[]) => void;
}

type StepKey = 'addresses' | 'cargo_details' | 'team' | 'scheduling' | 'summary';

const STEPS: StepKey[] = ['addresses', 'cargo_details', 'team', 'scheduling', 'summary'];

export default function RiggingForm({ onBack, city: initialCity, onSumbit }: RiggingFormProps) {
  // Wizard State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex];
  const [direction, setDirection] = useState(0);

  // Data State
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [fromFloor, setFromFloor] = useState(1);
  const [toFloor, setToFloor] = useState(1);
  const [fromLift, setFromLift] = useState(false);
  const [toLift, setToLift] = useState(false);
  const [fromSmallLift, setFromSmallLift] = useState(false);
  const [toSmallLift, setToSmallLift] = useState(false);
  
  const [loadersCount, setLoadersCount] = useState(4);
  const [hasOwnLoaders, setHasOwnLoaders] = useState(false);
  
  const [loadType, setLoadType] = useState<string[]>([]);
  const [weightRange, setWeightRange] = useState('до 100 кг');
  const [complications, setComplications] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedCity, setDetectedCity] = useState(initialCity);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone') || '';
    const savedName = localStorage.getItem('user_name') || '';
    setPhone(savedPhone);
    if (savedName) setName(savedName);
  }, []);
  const [isStepLoading, setIsStepLoading] = useState(false);

  const fromRef = useRef<HTMLInputElement>(null);

  // Constants
  const HOURLY_RATE = 700;
  const MIN_HOURS = 2;
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  // Determine current "Date Type" for highlighting buttons
  const dateType = useMemo(() => {
    if (isSameDay(selectedDate, today)) return 'today';
    if (isSameDay(selectedDate, tomorrow)) return 'tomorrow';
    return 'custom';
  }, [selectedDate, today, tomorrow]);

  // Wizard Helpers
  const nextStep = async () => {
    if (currentStepIndex < STEPS.length - 1) {
      if (currentStep === 'addresses') {
        setIsStepLoading(true);
        await new Promise(r => setTimeout(r, 600));
        setIsStepLoading(false);
      }
      setDirection(1);
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStepIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  // Auto-detect city
  useEffect(() => {
    const combined = (fromAddress + toAddress).toLowerCase();
    if (combined.includes('шуя') || combined.includes('shuya')) setDetectedCity('Шуя');
    else if (combined.includes('иваново') || combined.includes('ivanovo')) setDetectedCity('Иваново');
    else setDetectedCity(initialCity);
  }, [fromAddress, toAddress, initialCity]);

  // Adjust time if past and today is selected
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

  // Smart workers logic
  useEffect(() => {
    if (!hasOwnLoaders) {
        if (weightRange === '500–1000 кг' && loadersCount < 5) setLoadersCount(5);
        if (weightRange === '> 1 тонны' && loadersCount < 6) setLoadersCount(6);
    }
  }, [weightRange, hasOwnLoaders]);

  const recommendation = useMemo(() => {
    if (loadersCount < 4 && !hasOwnLoaders) return 'Рекомендуем от 4 грузчиков';
    if (weightRange === '500–1000 кг' && loadersCount < 5) return 'Для 1т нужно минимум 5 чел';
    if (weightRange === '> 1 тонны' && loadersCount < 6) return 'Для >1т нужно минимум 6 чел';
    return null;
  }, [weightRange, loadersCount, hasOwnLoaders]);

  const isShuya = detectedCity === 'Шуя';

  const priceData = useMemo(() => {
    if (!isShuya) return null;
    let base = loadersCount * HOURLY_RATE * MIN_HOURS;
    let floorSurcharge = 0;
    if (!fromLift && fromFloor > 1) floorSurcharge += (fromFloor - 1) * 100 * loadersCount;
    if (!toLift && toFloor > 1) floorSurcharge += (toFloor - 1) * 100 * loadersCount;
    let total = base + floorSurcharge;
    if (weightRange === '300–500 кг') total *= 1.2;
    if (weightRange === '500–1000 кг') total *= 1.4;
    if (weightRange === '> 1 тонны') total *= 1.7;
    if (complications.includes('узкие проёмы')) total *= 1.1;
    if (complications.includes('демонтаж')) total *= 1.15;
    if (complications.includes('монтаж')) total *= 1.15;
    return { total: Math.round(total), isApprox: true };
  }, [isShuya, loadersCount, fromFloor, toFloor, fromLift, toLift, weightRange, complications]);

  const handleSubmit = async () => {
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
    const finalData = {
      type: 'Такелаж',
      from_address: fromAddress || 'Не указано',
      to_address: toAddress || 'Не указано',
      floor_from: fromFloor || 1,
      floor_to: toFloor || 1,
      details: {
        fromFloor, toFloor, fromLift, toLift, fromSmallLift, toSmallLift,
        loadType, weightRange, complications,
        loadersCount, hasOwnLoaders,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime, dateType
      },
      movers_count: loadersCount,
      price_estimate: priceData?.total || 0,
      price_type: isShuya ? 'fixed' : 'request',
      city: detectedCity || 'Не указано',
      description: (name ? `Имя: ${name}\n` : '') + (comment || ''),
      client_name: name || '',
      phone: userPhone,
      status: 'searching'
    };

    try {
      const { data, error } = await supabase.from('orders').insert([finalData]).select('id');
      if (error) throw error;
      
      const completeOrder = { ...finalData, id: data?.[0]?.id };
      const { notifyExecutors } = await import('../../lib/notifications');
      const { candidates } = await notifyExecutors(completeOrder);
      onSumbit(completeOrder, candidates);
    } catch (err) {
      console.error(err);
      onSumbit(finalData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <div className="relative flex flex-col">
      <DatePicker isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} value={selectedDate} onChange={setSelectedDate} />
      <TimePicker isOpen={isTimePickerOpen} onClose={() => setIsTimePickerOpen(false)} value={selectedTime} onChange={setSelectedTime} selectedDate={selectedDate} />

      <header className="flex items-center justify-between mb-4">
        <button onClick={prevStep} className="w-9 h-9 flex items-center justify-center bg-white/[0.06] rounded-xl text-white/40 hover:text-white transition group border border-white/[0.08]">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <h2 className="text-lg font-black text-white uppercase tracking-tight">Такелаж</h2>
        <div className="w-9 h-9" />
      </header>

      <div className="flex justify-center items-center gap-1.5 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={cn("h-1 rounded-full transition-all duration-300", i === currentStepIndex ? "w-8 bg-yellow-500" : i < currentStepIndex ? "w-6 bg-yellow-500/40" : "w-6 bg-white/10")} />
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full"
          >
            {/* STEP 1: ADDRESSES */}
            {currentStep === 'addresses' && (
              <div className="space-y-5">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Адреса</h3>
                    <p className="text-white/35 text-xs font-bold">Откуда и куда несем?</p>
                </div>
                
                <div className="space-y-5">
                    {/* FROM SECTION */}
                    <div className="space-y-3">
                        <div className="relative group">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                            <input 
                              ref={fromRef}
                              value={fromAddress}
                              onChange={e => setFromAddress(e.target.value)}
                              placeholder="ОТКУДА: Улица, дом" 
                              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-4 pl-12 pr-5 text-white font-black text-base outline-none focus:border-yellow-500/30 transition-all placeholder:text-white/15"
                            />
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2 bg-white/[0.04] p-3 rounded-2xl border border-white/[0.06]">
                            <div className="col-span-3 space-y-2">
                                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Этаж</p>
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFromFloor(f)}
                                            className={cn(
                                                "min-w-[32px] h-8 rounded-lg font-black text-[11px] transition-all",
                                                fromFloor === f ? "bg-yellow-500 text-black" : "bg-white/[0.06] text-white/40 hover:bg-white/10"
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Лифт</p>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => { setFromLift(true); setFromSmallLift(false); }}
                                        className={cn("flex-1 h-8 rounded-lg text-[8px] font-black uppercase transition-all", fromLift && !fromSmallLift ? "bg-white text-black" : "bg-white/[0.06] text-white/25")}
                                    >Бол</button>
                                    <button 
                                        onClick={() => { setFromLift(true); setFromSmallLift(true); }}
                                        className={cn("flex-1 h-8 rounded-lg text-[8px] font-black uppercase transition-all", fromLift && fromSmallLift ? "bg-white text-black" : "bg-white/[0.06] text-white/25")}
                                    >Мал</button>
                                    <button 
                                        onClick={() => setFromLift(false)}
                                        className={cn("flex-1 h-8 rounded-lg text-[8px] font-black uppercase transition-all", !fromLift ? "bg-red-500 text-black" : "bg-white/[0.06] text-white/25")}
                                    >Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TO SECTION */}
                    <div className="space-y-3">
                        <div className="relative group">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                            <input 
                              value={toAddress}
                              onChange={e => setToAddress(e.target.value)}
                              placeholder="КУДА: Улица, дом" 
                              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-4 pl-12 pr-5 text-white font-black text-base outline-none focus:border-yellow-500/30 transition-all placeholder:text-white/15"
                            />
                        </div>

                        <div className="grid grid-cols-5 gap-2 bg-white/[0.04] p-3 rounded-2xl border border-white/[0.06]">
                            <div className="col-span-3 space-y-2">
                                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Этаж</p>
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setToFloor(f)}
                                            className={cn(
                                                "min-w-[32px] h-8 rounded-lg font-black text-[11px] transition-all",
                                                toFloor === f ? "bg-yellow-500 text-black" : "bg-white/[0.06] text-white/40 hover:bg-white/10"
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Лифт</p>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => { setToLift(true); setToSmallLift(false); }}
                                        className={cn("flex-1 h-8 rounded-lg text-[8px] font-black uppercase transition-all", toLift && !toSmallLift ? "bg-white text-black" : "bg-white/[0.06] text-white/25")}
                                    >Бол</button>
                                    <button 
                                        onClick={() => { setToLift(true); setToSmallLift(true); }}
                                        className={cn("flex-1 h-8 rounded-lg text-[8px] font-black uppercase transition-all", toLift && toSmallLift ? "bg-white text-black" : "bg-white/[0.06] text-white/25")}
                                    >Мал</button>
                                    <button 
                                        onClick={() => setToLift(false)}
                                        className={cn("flex-1 h-8 rounded-lg text-[8px] font-black uppercase transition-all", !toLift ? "bg-red-500 text-black" : "bg-white/[0.06] text-white/25")}
                                    >Нет</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {/* STEP 2: CARGO DETAILS */}
            {currentStep === 'cargo_details' && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Детали груза</h3>
                    <p className="text-white/35 text-[10px] font-bold">Укажите всё необходимое</p>
                </div>
                
                <div className="space-y-5">
                    {/* TYPE */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-widest text-center">Тип груза</p>
                        <div className="grid grid-cols-2 gap-2">
                          {['Сейф', 'Пианино', 'Станок', 'Банкомат', 'Сервер', 'Другое'].map(t => (
                            <button 
                              key={t}
                              onClick={() => setLoadType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                              className={cn(
                                "h-11 rounded-2xl font-black text-[11px] uppercase transition-all",
                                loadType.includes(t) ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25" : "bg-white/[0.06] text-white/40 hover:bg-white/10"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                    </div>

                    {/* WEIGHT */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-widest text-center">Вес груза</p>
                        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
                          {['до 100 кг', '100–300 кг', '300–500 кг', '500–1000 кг', '> 1 тонны'].map(w => (
                            <button 
                              key={w}
                              onClick={() => setWeightRange(w)}
                              className={cn(
                                "min-w-[100px] h-11 rounded-2xl font-black text-[10px] uppercase transition-all shrink-0",
                                weightRange === w ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25" : "bg-white/[0.06] text-white/40 border border-transparent hover:border-white/10"
                              )}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                    </div>

                    {/* COMPLICATIONS */}
                    <div className="space-y-3 pb-2 pt-2 border-t border-white/[0.06]">
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-widest text-center">Усложнения</p>
                        <div className="grid grid-cols-2 gap-2">
                          {['узкие проёмы', 'лестницы', 'повороты', 'демонтаж', 'монтаж'].map(c => (
                            <button 
                              key={c}
                              onClick={() => setComplications(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                              className={cn(
                                "h-11 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5",
                                complications.includes(c) ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25" : "bg-white/[0.06] text-white/30 hover:bg-white/10"
                              )}
                            >
                              {complications.includes(c) && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {c}
                            </button>
                          ))}
                        </div>
                    </div>
                </div>
              </div>
            )}

            {/* STEP 3: TEAM */}
            {currentStep === 'team' && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Грузчики</h3>
                    <p className="text-white/35 text-[10px] font-bold">Обычно такелаж делают от 4-х человек</p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6].map(n => (
                          <button key={n} onClick={() => setLoadersCount(n)} className={cn("flex-1 h-12 rounded-2xl font-black text-lg transition-all", loadersCount === n ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25" : "bg-white/[0.06] text-white/40 hover:bg-white/10")}>
                              {n === 6 ? '6+' : n}
                          </button>
                      ))}
                  </div>
                  
                  <button onClick={() => setHasOwnLoaders(!hasOwnLoaders)} className="w-full h-12 rounded-2xl border border-dashed border-white/10 flex items-center justify-center gap-2 transition-colors hover:bg-white/[0.06] group">
                      <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center transition-all", hasOwnLoaders ? "bg-yellow-500 border-yellow-500 text-black" : "border-white/20 text-transparent")}>
                          <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] font-black uppercase text-white/40 group-hover:text-white transition">У меня есть свои люди</span>
                  </button>

                  <AnimatePresence>
                    {recommendation && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                            <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                            <p className="text-[9px] font-bold text-yellow-500 uppercase leading-normal tracking-wider">{recommendation}</p>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* STEP 4: SCHEDULING */}
            {currentStep === 'scheduling' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight text-center">Когда?</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex gap-2">
                    <button 
                        onClick={() => setSelectedDate(today)}
                        className={cn("flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2", dateType === 'today' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/5 text-white/30")}
                    >Сегодня</button>
                    <button 
                        onClick={() => setSelectedDate(tomorrow)}
                        className={cn("flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2", dateType === 'tomorrow' ? "bg-white text-black border-white shadow-xl" : "bg-white/5 border-white/5 text-white/30")}
                    >Завтра</button>
                  </div>

                      <button 
                          onClick={() => setIsCalendarOpen(true)}
                          className={cn("w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 flex items-center justify-center gap-3", dateType === 'custom' ? "bg-yellow-500 border-yellow-500 text-black" : "bg-white/5 border-white/5 text-white/40")}
                      >
                          <CalendarIcon className="w-4 h-4" />
                          {dateType === 'custom' ? format(selectedDate, 'dd MMMM', { locale: ru }) : 'ДРУГАЯ ДАТА'}
                      </button>

                  <button
                      onClick={() => setIsTimePickerOpen(true)}
                      className="w-full h-18 rounded-2xl bg-white/[0.03] border-2 border-white/5 flex items-center px-8 text-white font-black uppercase text-lg tracking-tighter relative hover:bg-white/[0.08]"
                  >
                      <Clock className="w-5 h-5 text-yellow-500 mr-4" />
                      {selectedTime}
                      <ChevronRight className="absolute right-8 w-5 h-5 opacity-20" />
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-yellow-500/10 p-3 rounded-2xl border border-yellow-500/15">
                     <Info className="w-4 h-4 text-yellow-500/70" />
                     <p className="text-[9px] font-bold text-yellow-500/70 uppercase">Ближайшие свободные мастера: через 40 минут</p>
                </div>
              </div>
            )}

            {/* STEP 5: SUMMARY & SUBMIT */}
            {currentStep === 'summary' && (
              <div className="space-y-5">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-5 md:p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black px-3 py-0.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest">Такелаж</div>
                    
                    <div className="space-y-4 text-sm font-bold text-white/90">
                        {/* Compact summary matching Moving */}
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                            <p className="truncate">{fromAddress} <span className="text-white/30 mx-1">→</span> {toAddress}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-4 text-center">🏢</span>
                            <p className="truncate">
                              {fromFloor} этаж {fromLift ? '(с лифтом)' : '(без лифта)'} 
                              <span className="text-white/30 mx-1">→</span> 
                              {toFloor} этаж {toLift ? '(с лифтом)' : '(без лифта)'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-4 text-center">👷</span>
                            <p className="truncate uppercase text-xs tracking-wide">
                              {loadersCount} чел {loadType.length > 0 ? `• ГРУЗ: ${loadType[0]}` : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-4 text-center">🕒</span>
                            <p className="truncate uppercase text-xs tracking-wide">
                              {format(selectedDate, 'd MMM', { locale: ru })} • {selectedTime}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 mb-2">
                        {isShuya ? (
                           <p className="text-3xl md:text-4xl font-black tracking-tight text-yellow-500 tabular-nums">
                              ≈ {priceData?.total.toLocaleString()} ₽
                           </p>
                        ) : (
                           <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-2 text-yellow-500">
                                   <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
                                   <p className="text-3xl font-black uppercase tracking-tight">Цена по запросу</p>
                               </div>
                               <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] italic mt-1">⚡ В вашем городе цена формируется индивидуально</p>
                           </div>
                        )}
                    </div>

                    <div className="mt-5 space-y-2.5">
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
                        
                        <div className="relative group">
                            <MessageSquare className="absolute left-4 top-3.5 w-3.5 h-3.5 text-white/20" />
                            <textarea 
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Ваш комментарий (если есть)..." 
                                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3 pl-10 pr-4 text-white/80 text-sm outline-none focus:border-white/15 transition-all resize-none h-14 placeholder:text-white/20"
                            />
                        </div>
                    </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Button */}
      <div className="mt-4 pt-2">
        {currentStep !== 'summary' ? (
          <button
            onClick={nextStep}
            disabled={
                isStepLoading ||
                (currentStep === 'addresses' && (!fromAddress.trim() || !toAddress.trim())) || 
                (currentStep === 'cargo_details' && loadType.length === 0)
            }
            className={cn(
              "w-full h-14 rounded-2xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden",
              (currentStep === 'addresses' && (fromAddress.trim() && toAddress.trim())) || 
              (currentStep === 'cargo_details' && loadType.length > 0) ||
              (!['addresses', 'cargo_details'].includes(currentStep))
                ? "bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black shadow-[0_10px_30px_rgba(255,184,0,0.35)] hover:scale-[1.05] active:scale-[0.97]" 
                : "bg-[#2a2a2a] text-[#777] opacity-50 cursor-not-allowed"
            )}
          >
              {isStepLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Считаем...
                </>
              ) : (
                <>
                  {currentStep === 'addresses' ? "Рассчитать стоимость →" : "Далее"}
                </>
              )}
          </button>
        ) : (
          <button
              onClick={handleSubmit}
              disabled={isSubmitting || !phone || !name.trim()}
              className={cn(
                "w-full h-14 rounded-2xl font-semibold text-base transition-all duration-300 flex items-center justify-center shadow-[0_10px_30px_rgba(234,179,8,0.35)] hover:scale-[1.05] active:scale-[0.97] relative overflow-hidden",
                (phone && name.trim()) ? "bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black" : "bg-[#2a2a2a] text-[#777] opacity-50 cursor-not-allowed"
              )}
          >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Отправляем...
                </>
              ) : (
                  "ОТПРАВИТЬ ЗАЯВКУ"
              )}
              {/* Shine effect */}
              {phone && name.trim() && !isSubmitting && (
                <motion.div 
                    className="absolute inset-0 bg-white/20 skew-x-[-20deg]"
                    animate={{ left: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                />
              )}
          </button>
        )}
        
        {currentStep === 'summary' && (
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Проверенные исполнители
          </p>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
