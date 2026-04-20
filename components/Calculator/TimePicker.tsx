'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay, startOfDay } from 'date-fns';
import { Clock, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  selectedDate: Date;
  isOpen: boolean;
  onClose: () => void;
}

const ALL_HOURS = Array.from({ length: 15 }, (_, i) => `${i + 8}:00`.padStart(5, '0'));

export default function TimePicker({ value, onChange, selectedDate, isOpen, onClose }: TimePickerProps) {
  const isToday = isSameDay(selectedDate, startOfDay(new Date()));
  const currentHour = new Date().getHours();

  const availableHours = ALL_HOURS.filter(h => {
    if (!isToday) return true;
    const hour = parseInt(h.split(':')[0]);
    return hour > currentHour;
  });

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
              <h3 className="text-xl font-black uppercase text-white tracking-widest">Выбор времени</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
              {ALL_HOURS.map((h, i) => {
                const hour = parseInt(h.split(':')[0]);
                const isPast = isToday && hour <= currentHour;
                const isSelected = value === h;

                return (
                  <button
                    key={i}
                    disabled={isPast}
                    onClick={() => {
                        onChange(h);
                        onClose();
                    }}
                    className={cn(
                      "h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                      isSelected ? "bg-[#fbbf24] text-black shadow-lg shadow-yellow-500/20 scale-105" : 
                      isPast ? "bg-white/5 text-white/10 opacity-20 cursor-not-allowed" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:scale-105"
                    )}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            {availableHours.length === 0 && isToday && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                 <p className="text-red-500 text-xs font-bold uppercase tracking-widest">На сегодня больше нет слотов.</p>
                 <p className="text-white/20 text-[10px] mt-1">Пожалуйста, выберите завтрашний день.</p>
              </div>
            )}
          </motion.div>
        </>
      )}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </AnimatePresence>
  );
}
