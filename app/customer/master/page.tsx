'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Star, Phone, MessageCircle, MapPin, Send, User, Briefcase } from 'lucide-react';
import { AuthGuard } from '../../../components/auth-guard';
import { supabase } from '../../../lib/supabase';
import VerificationBadge from '../../../components/VerificationBadge';

interface Executor {
  id: string;
  name: string;
  city: string;
  description: string;
  avatar: string;
  rating: number;
  phone: string;
  whatsapp_phone: string;
  telegram_username: string;
  avito_url: string;
  max_platform_url: string;
  status: string;
  verification_status?: string;
}

interface PortfolioItem {
  id: string;
  photo_url: string;
  title: string;
  description: string;
}

function MasterDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const masterId = searchParams?.get('id') || null;
  const [master, setMaster] = useState<Executor | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaster = async () => {
      if (!masterId) return;
      setLoading(true);
      try {
        const { data: masterData } = await supabase
          .from('executors')
          .select('*')
          .eq('id', masterId)
          .single();

        if (masterData) setMaster(masterData);

        const { data: portfolioData } = await supabase
          .from('executor_portfolio')
          .select('*')
          .eq('executor_id', masterId);

        if (portfolioData) setPortfolio(portfolioData);
      } catch (err) {
        console.error('Error fetching master:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaster();
  }, [masterId]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#08090E' }}>
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!master) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#08090E' }}>
          <p className="text-white/40 text-lg mb-4">Мастер не найден</p>
          <button onClick={() => router.back()} className="text-yellow-500 font-bold">← Назад</button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: '#08090E' }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-8 pb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Назад</span>
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-6 pb-12">
          {/* Profile Card */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {master.avatar ? (
                  <img src={master.avatar} alt={master.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-black text-white">{master.name || 'Мастер'}</h1>
                  {master.status === 'online' && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold">ОНЛАЙН</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-yellow-500 font-bold text-sm">{master.rating || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/30 text-xs">
                    <MapPin className="w-3 h-3" />
                    {master.city}
                  </div>
                  <VerificationBadge status={master.verification_status} size="sm" />
                </div>
              </div>
            </div>
            {master.description && (
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-white/50 text-sm leading-relaxed">{master.description}</p>
              </div>
            )}
          </div>

          {/* Contact Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {master.phone && (
              <button
                onClick={() => window.location.href = `tel:+${master.phone}`}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'rgb(74,222,128)' }}
              >
                <Phone className="w-4 h-4" />
                Позвонить
              </button>
            )}
            {master.whatsapp_phone && (
              <button
                onClick={() => window.open(`https://wa.me/${master.whatsapp_phone}`, '_blank')}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: 'rgb(37,211,102)' }}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            )}
            {master.telegram_username && (
              <button
                onClick={() => window.open(`https://t.me/${master.telegram_username.replace('@', '')}`, '_blank')}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgb(96,165,250)' }}
              >
                <Send className="w-4 h-4" />
                Telegram
              </button>
            )}
            {master.avito_url && (
              <button
                onClick={() => window.open(master.avito_url, '_blank')}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: 'rgb(251,146,60)' }}
              >
                <Briefcase className="w-4 h-4" />
                Avito
              </button>
            )}
          </div>

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div>
              <h2 className="text-lg font-black text-white mb-4">ПОРТФОЛИО</h2>
              <div className="space-y-4">
                {portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {item.photo_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img src={item.photo_url} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                      {item.description && <p className="text-white/30 text-xs">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

export default function MasterDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08090E' }}>
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MasterDetailContent />
    </Suspense>
  );
}
