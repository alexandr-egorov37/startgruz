'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle, Phone, Copy, ExternalLink, ArrowLeft, Star, Package, Briefcase, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExecutorInfo {
  id: string;
  name: string;
  phone: string;
  rating?: number;
  reviews?: number;
  completed_orders?: number;
  cases?: string[];
  avatar?: string;
}

interface ContactUnlockedModalProps {
  executor: ExecutorInfo;
  chatId?: string;
  mode?: 'client' | 'executor';
  onOpenChat: () => void;
  onClose: () => void;
}

const SERVICE_LABELS: Record<string, string> = {
  loaders: 'Грузчики',
  gazelle: 'Газель',
  furniture: 'Сборка мебели',
  rigging: 'Такелаж',
  dismantling: 'Демонтаж',
  cleaning: 'Уборка',
  packing: 'Упаковка',
  lifting: 'Подъём на этаж',
};

export default function ContactUnlockedModal({ executor, chatId, mode = 'client', onOpenChat, onClose }: ContactUnlockedModalProps) {
  const [copied, setCopied] = useState(false);

  const cleanPhone = executor.phone?.replace(/\D/g, '') || '';
  const displayPhone = formatPhone(executor.phone || '');

  function formatPhone(phone: string) {
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
    return phone;
  }

  const copyPhone = () => {
    navigator.clipboard.writeText(`+${cleanPhone}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center pointer-events-none p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl pointer-events-auto"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-[#0B0B0B] border border-white/[0.06] w-full max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] pointer-events-auto"
      >
        {/* Success header */}
        <div className="relative px-6 pt-10 pb-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.06] to-transparent" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.15 }}
              className="w-20 h-20 bg-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.3)] mb-5"
            >
              <CheckCircle2 className="w-10 h-10 text-black" />
            </motion.div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Контакт открыт</h1>
            <p className="text-[11px] font-medium text-white/35 mt-2 leading-relaxed max-w-[280px] mx-auto">
              {mode === 'executor' ? 'Заказчик готов к диалогу. Обсудите детали или свяжитесь напрямую.' : 'Мастер готов к выезду. Обсудите детали или свяжитесь напрямую.'}
            </p>
          </div>
        </div>

        {/* Executor card */}
        <div className="px-5 pb-5">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-4 backdrop-blur-sm">
            {/* Profile row */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.04] shrink-0">
                {executor.avatar ? (
                  <img src={executor.avatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-[15px] text-white truncate">{executor.name || 'Мастер'}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {(executor.rating ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-500">
                      <Star className="w-3 h-3 fill-yellow-500" />
                      {executor.rating?.toFixed(1)}
                      {(executor.reviews ?? 0) > 0 && <span className="text-white/25">({executor.reviews})</span>}
                    </span>
                  )}
                  {(executor.completed_orders ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-white/30">
                      <Package className="w-3 h-3" /> {executor.completed_orders} заказов
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="flex-1 text-[13px] font-bold text-white tabular-nums tracking-wide">{displayPhone}</span>
              <button
                onClick={copyPhone}
                className={cn(
                  "text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all duration-200",
                  copied
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.08]"
                )}
              >
                {copied ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Скопирован</span>
                ) : (
                  <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Копировать</span>
                )}
              </button>
            </div>

            {/* Cases */}
            {executor.cases && executor.cases.length > 0 && (
              <div className="space-y-2">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" /> Специализация
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {executor.cases.map((c, i) => (
                    <span key={i} className="text-[9px] font-semibold text-white/40 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                      {SERVICE_LABELS[c] || c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 space-y-2.5">
          {/* Primary: Write */}
          <button
            onClick={onOpenChat}
            className="w-full h-14 bg-gradient-to-r from-[#F5B800] to-[#FFCC33] text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-[0_4px_24px_rgba(245,184,0,0.25)] hover:shadow-[0_4px_32px_rgba(245,184,0,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5"
          >
            <MessageCircle className="w-4 h-4" />
            {mode === 'executor' ? 'Написать заказчику' : 'Написать мастеру'}
          </button>

          {/* Call */}
          <a
            href={`tel:+${cleanPhone}`}
            className="w-full h-12 bg-transparent border border-white/[0.08] text-white/60 rounded-2xl font-bold uppercase text-[9px] tracking-[0.15em] hover:bg-white/[0.04] hover:text-white/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5"
          >
            <Phone className="w-3.5 h-3.5" />
            Позвонить
          </a>

          {/* WhatsApp */}
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-transparent border border-white/[0.08] text-white/60 rounded-2xl font-bold uppercase text-[9px] tracking-[0.15em] hover:bg-emerald-500/[0.06] hover:text-emerald-400/80 hover:border-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть WhatsApp
            </a>
          )}

          {/* Back */}
          <button
            onClick={onClose}
            className="w-full py-3 text-white/20 font-bold uppercase text-[8px] tracking-[0.2em] hover:text-white/40 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" />
            На главную
          </button>
        </div>
      </motion.div>
    </div>
  );
}
