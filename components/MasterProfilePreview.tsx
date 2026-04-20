'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// Shared labels (you can abstract this if needed)
const SERVICE_LABELS: Record<string, string> = {
  loaders: 'Грузчики',
  gazelle: 'Газель',
  furniture: 'Сборка мебели',
  rigging: 'Такелаж',
  dismantling: 'Демонтаж',
  cleaning: 'Уборка',
  packing: 'Упаковка',
  lifting: 'Подъём на этаж',
};

interface MasterProfilePreviewProps {
  executorId: string;
  onClose: () => void;
}

export default function MasterProfilePreview({ executorId, onClose }: MasterProfilePreviewProps) {
  const [data, setData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFullProfile() {
      setLoading(true);
      // Fetch executor data
      const { data: execData } = await supabase
        .from('executors')
        .select('*')
        .eq('id', executorId)
        .single();
        
      setData(execData);

      // Fetch reviews
      const { data: revData } = await supabase
        .from('reviews')
        .select('*')
        .eq('executor_id', executorId)
        .order('created_at', { ascending: false });
      setReviews(revData || []);

      // Fetch portfolio
      const { data: portfData } = await supabase
        .from('executor_portfolio')
        .select('*')
        .eq('executor_id', executorId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });
      setPortfolio(portfData || []);
      
      setLoading(false);
    }
    fetchFullProfile();
  }, [executorId]);

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
      />

      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 bg-white/5 shrink-0">
               {(data?.avatar) ? (
                 <img src={data.avatar} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white/20" />
                 </div>
               )}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">
                {data?.name || "Мастер"}
              </h2>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                 {data?.city || 'Город'} • Исполнитель
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 scrollbar-hide">
          {loading ? (
             <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
             </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Основные данные</h3>
                 <div className="bg-white/5 rounded-2xl p-5 space-y-5 border border-white/5">
                    <div>
                       <p className="text-xs text-white/40 mb-1">ФИО</p>
                       <p className="text-sm md:text-base text-white font-bold">{data?.name || 'Не указано'}</p>
                    </div>
                    <div>
                       <p className="text-xs text-white/40 mb-1">Телефон</p>
                       <p className="text-sm md:text-base text-white font-bold">{data?.phone || 'Не указано'}</p>
                    </div>
                    <div>
                       <p className="text-xs text-white/40 mb-1">Город</p>
                       <p className="text-sm md:text-base text-white font-bold">{data?.city || 'Не указано'}</p>
                    </div>
                 </div>
              </div>

              {/* Bio */}
              {(data?.about_me) && (
                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">О себе</h3>
                     <p className="text-white/80 text-sm leading-relaxed">{data.about_me}</p>
                  </div>
              )}

              {/* Services */}
              {(data?.services && data.services.length > 0) && (
                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Услуги</h3>
                     <div className="flex flex-wrap gap-2">
                        {data.services.map((s: string) => (
                           <span key={s} className="bg-yellow-500 text-black px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-wide">
                               {SERVICE_LABELS[s] || s}
                           </span>
                        ))}
                     </div>
                  </div>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="space-y-4 border-t border-white/5 pt-8">
                  <h3 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Отзывы ({reviews.length})</h3>
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-white font-bold text-sm">{r.client_name || 'Клиент'}</span>
                           <div className="flex gap-1">
                             {[...Array(5)].map((_, i) => (
                               <Star key={i} className={cn("w-3 h-3", i < (r.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-white/10")} />
                             ))}
                           </div>
                        </div>
                        {r.comment && <p className="text-white/60 text-xs sm:text-sm">{r.comment}</p>}
                        <p className="text-white/20 text-[10px]">{new Date(r.created_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio (Cases) - Now at the very bottom */}
              {portfolio.length > 0 && (
                <div className="space-y-6 border-t border-white/5 pt-8 pb-10">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Примеры работ (Кейсы)</h3>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Реальные фото выполненных заказов</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {portfolio.map(p => (
                      <div key={p.id} className="group bg-white/5 rounded-[32px] overflow-hidden border border-white/5 hover:border-white/10 transition-all">
                        {p.photo_url && (
                          <div className="relative aspect-video overflow-hidden">
                            <img src={p.photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                          </div>
                        )}
                        <div className="p-6 space-y-2">
                          <h4 className="text-white font-black uppercase text-sm tracking-tight">{p.title}</h4>
                          {p.description && <p className="text-white/40 text-xs leading-relaxed">{p.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
