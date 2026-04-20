"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Select } from "./Select"
import DatePicker from "./DatePicker"
import TimePicker from "./TimePicker"
import type { DropdownOption } from "./Dropdown"
import { findCandidates, notifyExecutor } from "../../lib/notifications"
import { supabase } from "../../lib/supabase"
import { Calendar, Clock, X, ChevronRight, User, Star, Loader2, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from "../../lib/utils"
import SearchingScreen from "../SearchingScreen"

export type CalculatorState = {
  workType: string
  workers: number
  hours: number
  date: string 
  time: string 
  outsideCity: boolean
}

type OpenId = "date" | "time" | "workType" | "workers" | "hours" | null

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function Calculator() {
  const todayIso = useMemo(() => toIsoDate(new Date()), [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openId, setOpenId] = useState<OpenId>(null)
  
  // -- SEARCH STATE --
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState<any[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(12)
  const [canNext, setCanNext] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)

  const [state, setState] = useState<CalculatorState>({
    workType: "Грузчики",
    workers: 1,
    hours: 2,
    date: todayIso,
    time: "09:00",
    outsideCity: false,
  })

  const workTypeOptions: DropdownOption[] = useMemo(() => [
    { value: "Грузчики", label: "Грузчики" },
    { value: "Такелажные работы", label: "Такелаж" },
    { value: "Разнорабочие", label: "Разнорабочие" },
    { value: "Переезд", label: "Переезд" },
  ], [])

  const workerOptions: DropdownOption[] = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1} чел.` })), [])

  const hourOptions: DropdownOption[] = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => ({ value: `${i + 1}`, label: `${i + 1} час${i === 0 ? '' : 'а'}` })), [])

  // 1. ТАЙМЕР И ПЕРЕКЛЮЧЕНИЕ
  useEffect(() => {
    if (!searching || timeLeft <= 0 || candidates.length === 0) {
        if (searching && timeLeft === 0 && currentIdx < candidates.length - 1) {
            handleNextCandidate();
        }
        return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [searching, timeLeft, candidates, currentIdx]);

  // 2. REALTIME STATUS SYNC
  useEffect(() => {
    if (!currentOrderId || !searching) return;

    const channel = supabase
        .channel(`order-track-${currentOrderId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'executor_orders', filter: `order_id=eq.${currentOrderId}` },
            (payload) => {
                const { status, executor_id } = payload.new;
                console.log("[Status Sync] Performer action:", status);

                if (status === 'viewed' && candidates[currentIdx]?.id === executor_id) {
                    // Мастер открыл заявку - можно обновить UI (уже есть индикатор)
                }

                if (status === 'accepted') {
                    setSearching(false);
                    alert("УРА! Мастер принял ваш заказ. Сейчас мы свяжем вас.");
                    // Тут можно направить на страницу деталей заказа
                }

                if (status === 'rejected' && candidates[currentIdx]?.id === executor_id) {
                    handleNextCandidate();
                }
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentOrderId, searching, currentIdx]);

  // 3. LOGIC: NEXT CANDIDATE
  const handleNextCandidate = async () => {
    if (currentIdx < candidates.length - 1) {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setTimeLeft(12);
        setCanNext(false);
        // Уведомляем следующего
        if (currentOrderId && candidates[nextIdx]) {
            await notifyExecutor(currentOrderId, candidates[nextIdx].id);
            setTimeout(() => setCanNext(true), 5000);
        }
    } else {
        // По кругу или стоп
        alert("Поиск завершен. Мы продолжим искать исполнителей в фоновом режиме.");
        setSearching(false);
    }
  }

  const handleCancelOrder = async () => {
    if (currentOrderId) {
        // 1. Отменяем основной заказ
        await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', currentOrderId);
        
        // 2. Отменяем все уведомления для мастеров (чтобы сработал Realtime в их ЛК)
        await supabase.from('executor_orders')
            .update({ status: 'cancelled' })
            .eq('order_id', currentOrderId);
    }
    setSearching(false);
    setCurrentOrderId(null);
    setCandidates([]);
  }

  const handleCalculate = async () => {
    setIsSubmitting(true)
    const orderData = {
      type: state.workType,
      description: `Заказ: ${state.workers} чел, ${state.hours} ч.`,
      city: "Шуя",
      price_estimate: state.workers * state.hours * 450,
      status: 'NEW'
    }

    try {
      const { data, error } = await supabase.from("orders").insert([orderData]).select('id').single()
      if (error) throw error
      
      setCurrentOrderId(data.id);
      
      // Ищем кандидатов
      const found = await findCandidates(data);
      if (found.length > 0) {
        setCandidates(found);
        setSearching(true);
        setCurrentIdx(0);
        setTimeLeft(12);
        
        // Уведомляем ПЕРВОГО сразу
        await notifyExecutor(data.id, found[0].id);
        setTimeout(() => setCanNext(true), 5000);
      } else {
        alert("В данный момент нет свободных исполнителей в вашем городе. Попробуйте позже.");
      }
      
    } catch (err: any) {
      console.error("Order error:", err);
      alert("Ошибка при создании заказа: " + err.message);
    } finally {
      setIsSubmitting(false)
    }
  }

  if (searching && currentOrderId) {
    return (
      <SearchingScreen 
         orderData={{ id: currentOrderId, type: state.workType, city: "Шуя" }}
         candidates={candidates}
         onCancel={handleCancelOrder}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 lg:px-8 pb-32">
      <div className="mb-12 text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Онлайн-калькулятор</h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Рассчитайте стоимость и получите скидку 10%</p>
      </div>

      <div className="mx-auto max-w-5xl bg-white/5 border border-white/10 rounded-[40px] p-2 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
        <div className="bg-[#0a0a0a] rounded-[36px] p-8 md:p-12">
          <form onSubmit={(e) => { e.preventDefault(); handleCalculate(); }} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select
                id="workType" label="Вид работ" value={state.workType} options={workTypeOptions}
                open={openId === "workType"} onOpenChange={(o) => setOpenId(o ? "workType" : null)}
                onChange={(v) => setState(s => ({ ...s, workType: v }))}
              />
              <Select
                id="workers" label="Грузчики" value={`${state.workers}`} options={workerOptions}
                open={openId === "workers"} onOpenChange={(o) => setOpenId(o ? "workers" : null)}
                onChange={(v) => setState(s => ({ ...s, workers: Number(v) }))}
              />
              <Select
                id="hours" label="Время" value={`${state.hours}`} options={hourOptions}
                open={openId === "hours"} onOpenChange={(o) => setOpenId(o ? "hours" : null)}
                onChange={(v) => setState(s => ({ ...s, hours: Number(v) }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-4">Дата выполнения</label>
                <button type="button" onClick={() => setOpenId('date')} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between px-6 hover:bg-white/10 transition group">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition" />
                    <span className="font-bold text-white">{format(parseISO(state.date), 'd MMMM yyyy', { locale: ru })}</span>
                  </div>
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-4">Время начала</label>
                <button type="button" onClick={() => setOpenId('time')} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between px-6 hover:bg-white/10 transition group">
                  <div className="flex items-center gap-4">
                    <Clock className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition" />
                    <span className="font-bold text-white">{state.time}</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-white/5">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative">
                    <input type="checkbox" checked={state.outsideCity} onChange={e => setState(s => ({ ...s, outsideCity: e.target.checked }))} className="sr-only" />
                    <div className={cn("w-12 h-6 rounded-full transition-all duration-300 border", state.outsideCity ? "bg-yellow-500 border-yellow-500" : "bg-white/5 border-white/10")}>
                        <div className={cn("w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300", state.outsideCity ? "left-7 shadow-lg" : "left-1")} />
                    </div>
                </div>
                <span className="text-sm font-bold text-white/60 group-hover:text-white transition uppercase tracking-widest">Работа за городом</span>
              </label>

              <button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-20 px-12 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm tracking-[0.2em] rounded-3xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl shadow-yellow-500/20">
                {isSubmitting ? "Отправка..." : "Рассчитать и вызвать"}
              </button>
            </div>
          </form>
        </div>

      </div>

      <DatePicker 
          value={parseISO(state.date)} 
          onChange={(d) => setState(s => ({ ...s, date: toIsoDate(d) }))}
          isOpen={openId === 'date'}
          onClose={() => setOpenId(null)}
      />
      <TimePicker 
          value={state.time}
          selectedDate={parseISO(state.date)}
          onChange={(t) => setState(s => ({ ...s, time: t }))}
          isOpen={openId === 'time'}
          onClose={() => setOpenId(null)}
      />
    </div>
  )
}
