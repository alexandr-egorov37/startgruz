'use client';

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ShieldX, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

export type VerificationStatus = 'verified' | 'pending' | 'skipped' | 'unverified' | 'rejected';

interface VerificationBadgeProps {
  status?: VerificationStatus | string | null;
  size?: 'sm' | 'md';
  showPopup?: boolean;
  className?: string;
}

const CONFIG: Record<string, {
  label: string;
  Icon: any;
  badgeCls: string;
  dotColor: string;
  popupTitle: string;
  popupText: string;
}> = {
  verified: {
    label: 'Документы проверены',
    Icon: ShieldCheck,
    badgeCls: 'text-green-400 bg-green-500/10 border-green-500/25 shadow-[0_0_12px_rgba(34,197,94,0.15)]',
    dotColor: 'bg-green-400',
    popupTitle: '✅ Личность подтверждена',
    popupText: 'Исполнитель прошёл проверку личности. Документы подтверждены платформой. Можно доверять.',
  },
  pending: {
    label: 'Проверка документов',
    Icon: Shield,
    badgeCls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
    dotColor: 'bg-yellow-400',
    popupTitle: '⏳ Документы на проверке',
    popupText: 'Документы отправлены и находятся на проверке. Обычно занимает до 24 часов.',
  },
  skipped: {
    label: 'Не верифицирован',
    Icon: ShieldX,
    badgeCls: 'text-red-400/60 bg-red-500/5 border-red-500/10',
    dotColor: 'bg-red-400/60',
    popupTitle: '❌ Личность не подтверждена',
    popupText: 'Исполнитель не прошёл проверку личности. Рекомендуется соблюдать осторожность.',
  },
  unverified: {
    label: 'Не верифицирован',
    Icon: ShieldX,
    badgeCls: 'text-red-400/60 bg-red-500/5 border-red-500/10',
    dotColor: 'bg-red-400/60',
    popupTitle: '❌ Личность не подтверждена',
    popupText: 'Исполнитель не прошёл проверку личности. Рекомендуется соблюдать осторожность.',
  },
  rejected: {
    label: 'Документы отклонены',
    Icon: ShieldX,
    badgeCls: 'text-red-400/60 bg-red-500/5 border-red-500/10',
    dotColor: 'bg-red-400/60',
    popupTitle: '❌ Документы отклонены',
    popupText: 'Документы не прошли проверку. Исполнителю отправлены инструкции по исправлению.',
  },
};

export default function VerificationBadge({
  status,
  size = 'sm',
  showPopup = true,
  className,
}: VerificationBadgeProps) {
  const key = (status || 'unverified') as string;
  const cfg = CONFIG[key] || CONFIG['unverified'];
  const { label, Icon, badgeCls, popupTitle, popupText } = cfg;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isSm = size === 'sm';

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => showPopup && setOpen(v => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-bold transition-all',
          isSm ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
          badgeCls,
          showPopup && 'cursor-pointer hover:opacity-80 active:scale-[0.97]',
          !showPopup && 'cursor-default',
        )}
      >
        <Icon className={cn(isSm ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        {label}
      </button>

      {showPopup && open && (
        <div className="absolute bottom-full left-0 mb-2 z-[200] w-64 bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 fade-in duration-150">
          <p className="font-black text-sm text-white mb-1.5">{popupTitle}</p>
          <p className="text-xs text-white/50 leading-relaxed">{popupText}</p>
          <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-[#111] border-r border-b border-white/10 rotate-45" />
        </div>
      )}
    </div>
  );
}
