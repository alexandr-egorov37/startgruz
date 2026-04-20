"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  X, 
  MessageSquare, 
  Phone, 
  Trash2, 
  User, 
  Loader2, 
  Package, 
  Star,
  CheckCircle2
} from "lucide-react";
import { cn } from "../lib/utils";
import ChatDialog from "./ChatDialog";
import MasterProfilePreview from "./MasterProfilePreview";

interface CustomerMastersListProps {
  onClose: () => void;
  onlineUsers?: Set<string>;
  city?: string;
}

interface MasterData {
  id: string;
  status: string;
  created_at: string;
  order_id: string;
  executors: {
    id: string;
    name: string;
    phone: string;
    avatar_url: string;
  };
}

export default function CustomerMastersList({ onClose, onlineUsers }: CustomerMastersListProps) {
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<any[]>([]);
  const [chatOpenedFor, setChatOpenedFor] = useState<any | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewModalFor, setReviewModalFor] = useState<any | null>(null);
  const [profileModalFor, setProfileModalFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());

  const fetchMasters = useCallback(async () => {
    setLoading(true);
    
    // 3. FIX userId: Support both Supabase Auth and Anonymous users
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      userId = user.id;
    } else {
      userId = localStorage.getItem('user_id');
    }
    
    console.log('ACTIVE USER ID for Masters List:', userId);
    
    if (!userId) {
      console.log('[MASTERS] No user ID found in Auth or LocalStorage');
      setLoading(false);
      setMasters([]);
      return;
    }

    setCurrentUserId(userId);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        executors (
          id,
          name,
          phone,
          avatar
        )
      `)
      .eq('user_id', userId)
      .in('status', ['accepted', 'contact_purchased', 'matched', 'completed'])
      .order('created_at', { ascending: false });

    // 5. LOGGING (REQUIRED)
    console.log('MASTERS RAW:', data);

    if (error) {
      console.error("[MASTERS] Fetch error:", error);
      setMasters([]);
    } else {
      // 4. SAFE DATA LOOP with protection against null executors
      const uniqueMastersMap = new Map();
      const rawData = data as unknown as MasterData[];

      (rawData || []).forEach(item => {
        // 2. PROTECT FROM NULL executors
        if (!item.executors) return;

        if (!uniqueMastersMap.has(item.executors.id)) {
          uniqueMastersMap.set(item.executors.id, {
            id: item.id, // primary order ID
            executor_id: item.executors.id,
            name: item.executors.name,
            phone: item.executors.phone,
            avatar: item.executors.avatar_url,
            orderId: item.id,
            status: item.status,
            created_at: item.created_at
          });
        }
      });
      
      setMasters(Array.from(uniqueMastersMap.values()));

      // Fetch reviews to hide buttons for already reviewed orders
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('order_id')
        .eq('client_id', userId);
      
      if (reviewsData) {
        setReviewedOrders(new Set(reviewsData.map(r => r.order_id)));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить контакт этого мастера? (Заявка будет помечена как завершенная)")) return;
    
    // Optimistic UI
    setMasters(prev => prev.filter(m => m.id !== id));
    
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', id);
      
    if (error) {
      alert("Ошибка при сохранении: " + error.message);
      fetchMasters();
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModalFor || !currentUserId) return;
    setIsSubmittingReview(true);
    
    const { error } = await supabase.from('reviews').insert({
      client_id: currentUserId,
      executor_id: reviewModalFor.executor_id,
      order_id: reviewModalFor.orderId,
      rating,
      comment
    });

    setIsSubmittingReview(false);
    
    if (error) {
      if (error.code === '23505') {
         alert("Вы уже оставляли отзыв на этот заказ!");
      } else {
         alert("Ошибка: " + error.message);
      }
    } else {
      alert("Спасибо за отзыв! Он успешно опубликован.");
      setReviewedOrders(prev => new Set(prev).add(reviewModalFor.orderId));
      setReviewModalFor(null);
      setComment("");
      setRating(5);
    }
  };

  const openChat = (master: any) => {
    setChatOpenedFor(master);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/90 flex items-start justify-center font-[Inter] overflow-y-auto p-4 md:p-8 backdrop-blur-xl pointer-events-auto scrollbar-hide">
      
      <div className="masters-wrapper w-full max-w-2xl relative mt-10 mb-20 animate-in fade-in zoom-in duration-300">
        
        {/* Header Container */}
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Ваши мастера</h2>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Все исполнители, с которыми у вас есть контакт</p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-white/20">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-yellow-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Синхронизация контактов...</p>
            </div>
          ) : masters.length > 0 ? (
            <div className="space-y-3">
              {masters.map((master, idx) => {
                const isOnline = onlineUsers?.has(master.executor_id);
                
                return (
                  <motion.div
                    key={master.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative overflow-hidden rounded-[24px] bg-white/[0.03] border border-white/5 p-4 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      {/* Clickable Area for Profile Preview */}
                      <button 
                        onClick={() => setProfileModalFor(master.executor_id)}
                        className="flex items-center gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                      >
                        {/* Avatar with Presence Indicator */}
                        <div className="relative shrink-0">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-yellow-500/20 transition-all">
                            {master.avatar ? (
                              <img 
                                src={master.avatar} 
                                className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                                alt={master.name}
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <User className="w-6 h-6 text-white/20" />
                              </div>
                            )}
                          </div>
                          {isOnline && (
                            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-[#22C55E] rounded-full border-[3px] border-[#0a0a0a] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                          )}
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight truncate">
                              {master.name || "Мастер"}
                            </h3>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                             <p className="text-[#888] text-xs font-bold font-mono tracking-wider">{master.phone}</p>
                           <p className={cn(
                             "text-[9px] font-black uppercase tracking-widest",
                             isOnline ? "text-green-500" : "text-white/20"
                           )}>
                             {isOnline ? "В сети" : "Был недавно"}
                           </p>
                        </div>
                      </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openChat(master)}
                          className="w-10 h-10 rounded-xl bg-yellow-500 text-black flex items-center justify-center hover:bg-white transition-all hover:scale-110 active:scale-95 shadow-lg shadow-yellow-500/10"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <a 
                          href={`tel:${master.phone}`}
                          className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => handleDelete(master.id)}
                          className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Review Button for Completed Orders */}
                    {master.status === 'completed' && !reviewedOrders.has(master.orderId) && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <button 
                          onClick={() => setReviewModalFor(master)}
                          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Star className="w-4 h-4 fill-current" />
                          Оценить мастера и оставить отзыв
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-32 space-y-6"
            >
              <div className="w-24 h-24 bg-white/5 rounded-[32px] mx-auto flex items-center justify-center border border-white/5">
                <Package className="w-10 h-10 text-white/10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white/60 uppercase tracking-tighter">У вас пока нет активных контактов</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] max-w-[240px] mx-auto leading-relaxed">
                  После выбора исполнителя и оплаты контактов они появятся здесь
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {chatOpenedFor && (
          <ChatDialog
            orderId={chatOpenedFor.orderId}
            participantId={localStorage.getItem("user_id") || ""}
            receiverId={chatOpenedFor.executor_id}
            isExecutor={false}
            participantName={chatOpenedFor.name}
            onClose={() => setChatOpenedFor(null)}
            onlineUsers={onlineUsers}
          />
        )}
        {profileModalFor && (
          <MasterProfilePreview 
            executorId={profileModalFor} 
            onClose={() => setProfileModalFor(null)} 
          />
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalFor && (
          <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl"
            >
              <button 
                onClick={() => setReviewModalFor(null)} 
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Оцените работу</h3>
              <p className="text-white/40 text-sm mb-6">Мастер: <span className="text-white font-bold">{reviewModalFor.name}</span></p>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 block">Ваша оценка</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button 
                        key={s}
                        onClick={() => setRating(s)}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          rating >= s ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-white/5 text-white/20 hover:bg-white/10"
                        )}
                      >
                        <Star className={cn("w-6 h-6", rating >= s && "fill-current")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 block">Комментарий</label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Расскажите, как все прошло..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:border-yellow-500/50 outline-none resize-none h-32 transition-all"
                  />
                </div>

                <button 
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || !comment.trim()}
                  className="w-full py-4 bg-yellow-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : "Отправить отзыв"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        
        .masters-wrapper {
          position: relative;
          z-index: 10;
        }

        .masters-wrapper::before {
          content: "";
          position: absolute;
          inset: -40px;
          background: radial-gradient(circle at 50% 50%, rgba(234,179,8,0.05), transparent 70%);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
