'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isAfter, 
  isBefore,
  startOfDay,
  addDays
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function DatePicker({ value, onChange, isOpen, onClose }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(value));
  const today = startOfDay(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { locale: ru }),
    end: endOfWeek(endOfMonth(currentMonth), { locale: ru }),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
            className="fixed top-1/2 left-1/2 w-[90%] max-w-sm bg-[#111] border border-white/10 rounded-[40px] p-8 z-[101] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black uppercase text-white tracking-widest">Выбор даты</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 text-white/40 hover:text-white transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="text-white font-black uppercase tracking-widest text-sm">
                {format(currentMonth, 'LLLL yyyy', { locale: ru })}
              </div>
              <button onClick={nextMonth} className="p-2 text-white/40 hover:text-white transition">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-white/20 uppercase py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                const isSelected = isSameDay(day, value);
                const isToday = isSameDay(day, today);
                const isPast = isBefore(day, today);
                const isCurrentMonth = startOfMonth(day).getTime() === currentMonth.getTime();

                return (
                  <button
                    key={i}
                    disabled={isPast}
                    onClick={() => {
                        onChange(day);
                        onClose();
                    }}
                    className={cn(
                      "h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative group",
                      isSelected ? "bg-[#fbbf24] text-black shadow-lg shadow-yellow-500/20" : 
                      isToday ? "bg-white/10 text-white border border-white/20" :
                      isCurrentMonth ? "text-white/60 hover:bg-white/5" : "text-white/10",
                      isPast && "opacity-20 cursor-not-allowed grayscale"
                    )}
                  >
                    {format(day, 'd')}
                    {!isPast && !isSelected && (
                        <div className="absolute inset-0 border border-[#fbbf24]/0 group-hover:border-[#fbbf24]/20 rounded-xl transition-all" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fast Select */}
            <div className="grid grid-cols-2 gap-3 mt-8">
                <button 
                    onClick={() => { onChange(today); onClose(); }}
                    className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] hover:bg-white/10 transition"
                >
                    Сегодня
                </button>
                <button 
                    onClick={() => { onChange(addDays(today, 1)); onClose(); }}
                    className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] hover:bg-white/10 transition"
                >
                    Завтра
                </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
