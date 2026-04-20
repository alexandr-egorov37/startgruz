'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Wrench, CheckCircle, Phone } from 'lucide-react';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    // Migrate old localStorage keys once
    const oldRole = localStorage.getItem('user_role');
    if (oldRole && !localStorage.getItem('role')) {
      localStorage.setItem('role', oldRole);
      localStorage.removeItem('user_role');
    }
    const oldUid = localStorage.getItem('client_user_id');
    if (oldUid && !localStorage.getItem('user_id')) {
      localStorage.setItem('user_id', oldUid);
      localStorage.removeItem('client_user_id');
    }

    // Auto-redirect if already logged in
    const phone = localStorage.getItem('user_phone');
    const role = localStorage.getItem('role');
    if (phone && (role === 'executor' || role === 'performer')) { router.push('/performer/dashboard'); return; }
    if (phone && role === 'customer') { router.push('/customer'); return; }

    // Online counter animation
    const target = 110 + Math.floor(Math.random() * 40);
    let count = 0;
    const step = Math.ceil(target / 40);
    const intro = setInterval(() => {
      count = Math.min(count + step, target);
      setOnlineCount(count);
      if (count >= target) clearInterval(intro);
    }, 30);
    const live = setInterval(() => {
      setOnlineCount(100 + Math.floor(Math.random() * 60));
    }, 5000);
    return () => { clearInterval(intro); clearInterval(live); };
  }, [router]);

  const handleRoleSelect = (role: 'customer' | 'executor') => {
    localStorage.setItem('pending_role', role);
    router.push(role === 'executor' ? '/performer/auth' : '/auth');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8 sm:p-6 overflow-x-hidden">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-yellow-500/5 blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-5"
        >
          <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight mb-1">STARTGRUZ</h1>
          <p className="text-white/30 text-sm mb-4">Грузчики и переезды</p>
          <div className="inline-flex items-center gap-2 bg-green-500/8 border border-green-500/15 rounded-full px-4 py-1.5 opacity-70">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400/90 text-xs font-semibold">Онлайн: {onlineCount} исполнителей</span>
          </div>
        </motion.div>

        {/* Role Cards */}
        <div className="space-y-4 mb-5">
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleRoleSelect('customer')}
            className="w-full group bg-gradient-to-br from-yellow-500/12 to-yellow-500/4 border border-yellow-500/25 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-left transition-all duration-300 hover:scale-[1.02] hover:border-yellow-500/60 hover:shadow-[0_0_30px_rgba(255,200,0,0.2)] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-yellow-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-yellow-500/35 transition-colors shrink-0">
                  <User className="w-5 h-5 sm:w-7 sm:h-7 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">Я ЗАКАЗЧИК</h2>
                  <p className="text-yellow-500/60 text-[11px] sm:text-xs font-medium truncate">Найти исполнителя за 2–5 минут</p>
                </div>
              </div>
              <div className="shrink-0 bg-yellow-500 text-black text-xs sm:text-sm font-black px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl group-hover:bg-yellow-400 transition-colors whitespace-nowrap">
                НАЧАТЬ
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => handleRoleSelect('executor')}
            className="w-full group bg-gradient-to-br from-blue-500/12 to-blue-500/4 border border-blue-500/25 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-left transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-blue-500/35 transition-colors shrink-0">
                  <Wrench className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Я ИСПОЛНИТЕЛЬ</h2>
                  <p className="text-blue-400/60 text-[11px] sm:text-xs font-medium truncate">Зарабатывать от 1000 ₽ в день</p>
                </div>
              </div>
              <div className="shrink-0 bg-blue-500 text-white text-xs sm:text-sm font-black px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl group-hover:bg-blue-400 transition-colors whitespace-nowrap">
                В РАБОТУ
              </div>
            </div>
          </motion.button>
        </div>

        {/* Login link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-5 text-center"
        >
          <button
            onClick={() => router.push('/auth')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 text-white/55 hover:text-white/80 text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all duration-200"
          >
            <Phone className="w-4 h-4" />
            Войти по номеру
          </button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-5"
        >
          {['По всей России', 'Без посредников', 'Оплата за контакт'].map((t) => (
            <span key={t} className="flex items-center gap-1 text-white/25 text-[11px]">
              <CheckCircle className="w-3 h-3 text-green-500/50" />
              {t}
            </span>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="text-center">
          <p className="text-white/15 text-[11px]">
            Продолжая, вы принимаете{' '}
            <a href="/offer" target="_blank" rel="noopener noreferrer" className="text-yellow-500/40 hover:text-yellow-500 underline underline-offset-2 transition-colors">
              условия оферты
            </a>
            {' '}·{' '}
            <a href="/offer#contacts" target="_blank" rel="noopener noreferrer" className="hover:text-white/30 underline underline-offset-2 transition-colors">
              Контакты
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}