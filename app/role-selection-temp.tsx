'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Wrench, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const isVerified = localStorage.getItem('is_verified') === 'true';
    
    // If role is already selected, redirect appropriately
    if (role) {
      if (role === 'executor') {
        router.push('/performer/dashboard');
      } else if (role === 'customer' && isVerified) {
        router.push('/customer');
      } else if (role === 'customer') {
        router.push('/auth');
      }
    }
  }, [router]);

  const handleRoleSelect = async (role: 'customer' | 'executor') => {
    setIsLoading(true);
    
    // Save role to localStorage
    localStorage.setItem('role', role);
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (role === 'executor') {
      router.push('/performer/dashboard');
    } else {
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-blue-500/5" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <ShieldCheck className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
            ГрузСервис
          </h1>
          <p className="text-white/40 font-medium text-lg">
            Выберите вашу роль для продолжения
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="space-y-4">
          {/* Customer Card */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleRoleSelect('customer')}
            disabled={isLoading}
            className="w-full group relative bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-3xl p-8 text-left hover:from-yellow-500/20 hover:to-yellow-500/10 hover:border-yellow-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
                  <User className="w-7 h-7 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">
                    Я ЗАКАЗЧИК
                  </h2>
                  <p className="text-white/60 text-sm">
                    Найти исполнителей для переезда и грузчиков
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-yellow-500 group-hover:translate-x-1 transition-transform" />
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
          </motion.button>

          {/* Executor Card */}
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => handleRoleSelect('executor')}
            disabled={isLoading}
            className="w-full group relative bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-3xl p-8 text-left hover:from-blue-500/20 hover:to-blue-500/10 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Wrench className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">
                    Я ИСПОЛНИТЕЛЬ
                  </h2>
                  <p className="text-white/60 text-sm">
                    Работать грузчиком и выполнять заказы
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
          </motion.button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 text-white/60">
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <span>Загрузка...</span>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-white/20 text-xs uppercase tracking-widest">
            Выберите роль чтобы продолжить
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
