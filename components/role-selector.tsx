'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin, ArrowRight } from 'lucide-react';

export function RoleSelector() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState<'role' | 'city'>('role');
  const [city, setCity] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Не показывать на страницах администратора и исполнителя
    const skip = pathname?.startsWith('/admin') || pathname?.startsWith('/performer');
    // Не показывать если роль уже выбрана
    const hasRole = !!localStorage.getItem('role');
    if (!skip && (!hasRole || !localStorage.getItem('user_city'))) {
      setIsVisible(true);
    }

    const handleOpenCitySelector = () => {
      setStep('city');
      setIsVisible(true);
    };
    window.addEventListener('open_city_selector', handleOpenCitySelector);
    return () => window.removeEventListener('open_city_selector', handleOpenCitySelector);
  }, [pathname]);

  const handleRoleSelect = (role: 'client' | 'performer') => {
    localStorage.setItem('role', role);
    if (role === 'performer') {
      setIsVisible(false);
      router.push('/performer/dashboard');
    } else {
      setStep('city');
    }
  };

  const handleCityConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!city.trim()) return;
    localStorage.setItem('user_city', city.trim());
    setIsVisible(false);
    
    // Trigger a custom event so other components can update
    window.dispatchEvent(new Event('city_selected'));
    
    // If not on home, go home?
    if (pathname !== '/') {
      router.push('/');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-[#0d0d0d]/80 backdrop-blur-3xl border border-white/10 shadow-2xl flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-300">
        
        {step === 'role' ? (
          <>
            <h2 className="text-3xl font-bold text-white tracking-tight text-center">Кем вы являетесь?</h2>
            
            <div className="w-full space-y-4">
              <button
                onClick={() => handleRoleSelect('client')}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 rounded-xl transition shadow-lg hover:shadow-yellow-500/20 hover:scale-105 active:scale-95 text-lg uppercase"
              >
                Заказчик
              </button>
              
              <button
                onClick={() => handleRoleSelect('performer')}
                className="w-full bg-white/5 border border-white/20 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition hover:scale-105 active:scale-95 text-lg uppercase"
              >
                Исполнитель
              </button>
            </div>
            
            <p className="text-[10px] text-white/40 text-center uppercase tracking-[0.2em] font-black">
              Выберите роль для продолжения
            </p>
          </>
        ) : (
          <>
            <div className="text-center space-y-4 w-full">
              <MapPin className="w-12 h-12 text-yellow-400 mx-auto animate-bounce" />
              <h2 className="text-3xl font-bold text-white tracking-tight text-center">Из какого вы города?</h2>
              <p className="text-white/40 text-sm">Это поможет нам найти исполнителей рядом</p>
            </div>

            <form onSubmit={handleCityConfirm} className="w-full space-y-6">
              <div className="relative group">
                <input
                  autoFocus
                  required
                  placeholder="Назовите ваш город"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg outline-none focus:border-yellow-500/50 transition-all font-medium text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-extrabold py-4 rounded-2xl transition shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 text-lg uppercase flex items-center justify-center gap-2"
              >
                Продолжить <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
