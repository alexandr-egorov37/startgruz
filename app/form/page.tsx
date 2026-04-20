'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import Loaders from '../../components/Calculator/Loaders';
import Gasel from '../../components/Calculator/Gasel';
import SearchingScreen from '../../components/SearchingScreen';

function FormPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams?.get('type') || 'workers';
  
  const [type, setType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [city, setCity] = useState('Шуя');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const savedCity = localStorage.getItem('selected_city') || localStorage.getItem('user_city');
    if (savedCity) setCity(savedCity);
  }, []);

  const [candidates, setCandidates] = useState<any[]>([]);

  const handleFinalSubmit = async (data: any, candidatesList?: any[]) => {
    setLoading(true);
    try {
      // 1. Store orderData and candidates
      setOrderData(data);
      if (candidatesList) setCandidates(candidatesList);

      // 2. Telegram Notification
      const { sendToTelegram } = await import('../../lib/telegram');
      let message = `<b>🚛 НОВАЯ ЗАЯВКА</b>\n\n`;
      message += `📍 <b>Город:</b> ${data.city || city}\n`;
      message += `💼 <b>Тип:</b> ${data.type}\n`;
      
      if (data.details) {
         Object.entries(data.details).forEach(([k, v]) => {
            message += `🔹 <b>${k}:</b> ${v}\n`;
         });
      }
      
      message += `\n📞 <b>Телефон:</b> <code>${data.phone}</code>`;
      
      await sendToTelegram(message);
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert("Ошибка при отправке. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (success && orderData) return (
    <SearchingScreen 
        orderData={orderData} 
        candidates={candidates}
        onCancel={() => {
            setSuccess(false);
            setOrderData(null);
        }}
    />
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 md:py-10 md:px-6 relative overflow-hidden">
      {/* Background Image + Overlay */}
      <img src="/images/hero-bg-3.png" alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <div className="absolute inset-0 bg-black/[0.85] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10">
        <div className="bg-white/[0.05] backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[40px] p-6 md:p-10 shadow-[0_8px_60px_rgba(0,0,0,0.6)] relative">
          {/* Back button */}
          <button onClick={() => router.back()} className="absolute top-5 left-5 md:top-7 md:left-7 flex items-center gap-1.5 text-white/30 hover:text-white/70 transition group text-[10px] font-bold uppercase tracking-widest z-20">
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Назад
          </button>

          <div className="pt-6 md:pt-4">
            {type === 'workers' || type === 'movers' ? (
              <Loaders onBack={() => router.push('/')} city={city} onSumbit={handleFinalSubmit} />
            ) : (
              <Gasel onBack={() => router.push('/')} city={city} onSumbit={handleFinalSubmit} />
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center rounded-3xl md:rounded-[40px]">
               <div className="w-10 h-10 border-4 border-[#fbbf24] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <FormPageInner />
    </Suspense>
  );
}
