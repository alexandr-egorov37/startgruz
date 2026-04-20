'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Wrench } from 'lucide-react';

export default function SelectRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<'customer' | 'executor' | null>(null);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (!savedPhone) {
      router.push('/auth');
      return;
    }
    const savedRole = localStorage.getItem('role');
    if (savedRole === 'executor' || savedRole === 'performer') { router.push('/performer/dashboard'); return; }
    if (savedRole === 'customer') { router.push('/customer'); return; }
    setPhone(savedPhone);
  }, [router]);

  const handleSelect = async (role: 'customer' | 'executor') => {
    setLoading(role);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phqkzwdlzyumlsdlodor.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const res = await fetch(`${supabaseUrl}/functions/v1/set-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ phone, role }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('role', role);
        if (role === 'customer') router.push('/customer');
        else router.push('/performer/auth');
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-yellow-500/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Кто вы?</h1>
          <p className="text-white/40 text-sm">Выберите роль — это можно сделать только один раз</p>
        </div>

        <div className="space-y-4">
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleSelect('customer')}
            disabled={!!loading}
            className="w-full group bg-gradient-to-br from-yellow-500/12 to-yellow-500/4 border border-yellow-500/25 rounded-3xl p-7 text-left transition-all duration-300 hover:scale-[1.03] hover:border-yellow-500/60 hover:shadow-[0_0_30px_rgba(255,200,0,0.2)] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center group-hover:bg-yellow-500/35 transition-colors shrink-0">
                  <User className="w-7 h-7 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Я ЗАКАЗЧИК</h2>
                  <p className="text-yellow-500/60 text-sm">Нанимаю грузчиков</p>
                </div>
              </div>
              <div className="shrink-0 bg-yellow-500 text-black text-sm font-black px-5 py-2.5 rounded-xl group-hover:bg-yellow-400 transition-colors">
                {loading === 'customer' ? '...' : 'НАЧАТЬ'}
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleSelect('executor')}
            disabled={!!loading}
            className="w-full group bg-gradient-to-br from-blue-500/12 to-blue-500/4 border border-blue-500/25 rounded-3xl p-7 text-left transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/35 transition-colors shrink-0">
                  <Wrench className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white whitespace-nowrap">Я ИСПОЛНИТЕЛЬ</h2>
                  <p className="text-blue-400/60 text-sm">Работаю грузчиком</p>
                </div>
              </div>
              <div className="shrink-0 bg-blue-500 text-white text-sm font-black px-5 py-2.5 rounded-xl group-hover:bg-blue-400 transition-colors whitespace-nowrap">
                {loading === 'executor' ? '...' : 'В РАБОТУ'}
              </div>
            </div>
          </motion.button>
        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          Роль нельзя изменить после выбора
        </p>
      </motion.div>
    </div>
  );
}
