'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (login === 'admin' && password === '22764erik') {
      localStorage.setItem('admin_auth', 'true');
      router.push('/admin');
    } else {
      setError('Неверный логин или пароль');
    }
  };

  const isDisabled = !login.trim() || !password.trim();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Header */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Админ-панель</h1>
              <p className="text-white/30 text-xs uppercase tracking-widest font-bold mt-1">Авторизация</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Логин"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-4 px-5 text-white font-bold outline-none focus:border-yellow-500/40 transition-all placeholder:text-white/20"
                autoComplete="username"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Пароль"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl py-4 px-5 pr-12 text-white font-bold outline-none focus:border-yellow-500/40 transition-all placeholder:text-white/20"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className={cn(
                "w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider transition-all",
                isDisabled
                  ? "bg-white/[0.06] text-white/20 cursor-not-allowed"
                  : "bg-gradient-to-b from-[#FFD54A] to-[#FFB800] text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-yellow-500/20"
              )}
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
