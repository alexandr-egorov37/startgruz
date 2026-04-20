'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, LogOut, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone) {
      router.push('/auth');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/auth');
  };

  const userPhone = typeof window !== 'undefined' ? localStorage.getItem('user_phone') : null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <ShieldCheck className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
            Добро пожаловать
          </h1>
          <p className="text-white/40 font-medium">
            Вы успешно авторизованы
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-1">
                Ваш номер
              </p>
              <p className="text-white font-bold text-lg">
                {userPhone || 'Неизвестно'}
              </p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-black flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </div>
    </div>
  );
}
