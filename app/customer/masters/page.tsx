'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Phone, MessageCircle, User } from 'lucide-react';
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
  status: string;
  verification_status?: string;
}

export default function MastersListPage() {
  const router = useRouter();
  const [masters, setMasters] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    const city = localStorage.getItem('selected_city') || 'ШУЯ';
    setSelectedCity(city);
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    const fetchMasters = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('executors')
          .select('*')
          .eq('city', selectedCity)
          .order('rating', { ascending: false });

        if (!error && data) {
          setMasters(data);
        }
      } catch (err) {
        console.error('Error fetching masters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMasters();
  }, [selectedCity]);

  const handleCall = (phone: string) => {
    window.location.href = `tel:+${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleTelegram = (username: string) => {
    window.open(`https://t.me/${username.replace('@', '')}`, '_blank');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col" style={{ background: '#08090E' }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-8 pb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Назад</span>
          </button>
        </div>

        <div className="px-6 pb-6">
          <h1 className="text-3xl font-black text-white mb-1">ВАШИ МАСТЕРА</h1>
          <p className="text-white/30 text-sm">Город: {selectedCity}</p>
        </div>

        {/* Masters List */}
        <div className="flex-1 px-6 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : masters.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-lg font-bold mb-2">Мастеров пока нет</p>
              <p className="text-white/20 text-sm">В городе {selectedCity} ещё нет зарегистрированных мастеров</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {masters.map((master) => (
                <div
                  key={master.id}
                  className="rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {master.avatar ? (
                        <img src={master.avatar} alt={master.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-7 h-7 text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-bold text-base truncate">{master.name || 'Мастер'}</h3>
                        {master.status === 'online' && (
                          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                        )}
                        <VerificationBadge status={master.verification_status} size="sm" />
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-yellow-500 text-xs font-bold">{master.rating || 0}</span>
                        <span className="text-white/20 text-xs ml-1">{master.city}</span>
                      </div>
                      {master.description && (
                        <p className="text-white/30 text-xs line-clamp-2 mb-3">{master.description}</p>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {master.phone && (
                          <button
                            onClick={() => handleCall(master.phone)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'rgb(74,222,128)' }}
                          >
                            <Phone className="w-3 h-3" />
                            Позвонить
                          </button>
                        )}
                        {master.whatsapp_phone && (
                          <button
                            onClick={() => handleWhatsApp(master.whatsapp_phone)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'rgb(74,222,128)' }}
                          >
                            <MessageCircle className="w-3 h-3" />
                            Написать
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/customer/master?id=${master.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                          style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: 'rgb(234,179,8)' }}
                        >
                          <User className="w-3 h-3" />
                          Профиль
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
