"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  CheckCircle2, Loader2, X, Users, Star, Check, Wallet, MessageCircle, Info, Send, Clock, ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "../lib/utils";
import ChatDialog from "./ChatDialog";
import ContactUnlockedModal from "./ContactUnlockedModal";

interface SearchingScreenProps {
  orderData: any;
  candidates?: any[];
  onCancel?: () => void;
}

export default function SearchingScreen({ orderData, candidates: initialCandidates = [], onCancel }: SearchingScreenProps) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>(initialCandidates);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<'sent' | 'searching' | 'matched'>('sent');
  const [offers, setOffers] = useState<any[]>([]);
  const [dispatchStatus, setDispatchStatus] = useState<'new' | 'viewed' | 'rejected' | 'accepted'>('new');
  const [countdown, setCountdown] = useState(15); 
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [chatOpened, setChatOpened] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [viewingPortfolio, setViewingPortfolio] = useState<any[] | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [viewingReviews, setViewingReviews] = useState<any[] | null>(null);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  const executorCache = useRef<Map<string, any>>(new Map());
  const [orderStatus, setOrderStatus] = useState(orderData?.status || 'searching');
  const [acceptedExecutorId, setAcceptedExecutorId] = useState<string | null>(null);
  const acceptedExecutorIdRef = useRef<string | null>(null);
  const [declineNotif, setDeclineNotif] = useState<string | null>(null);
  const [contactModalData, setContactModalData] = useState<any>(null);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
       return localStorage.getItem('user_id') || orderData?.user_id || null;
    }
    return orderData?.user_id || null;
  });

  // Resolve client's user_id from phone number so chat has a valid participantId
  useEffect(() => {
    if (!orderData?.phone) return;
    const resolveUser = async () => {
      const cleanPhone = orderData.phone.replace(/\D/g, ''); // 7961...
      console.log(">>> [RESOLVE USER] Testing for phone:", cleanPhone);
      
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .in('phone', [orderData.phone, cleanPhone])
        .limit(1);

      let finalId = (existingUsers && existingUsers.length > 0) ? existingUsers[0].id : null;
      if (!finalId) {
        console.log(">>> [RESOLVE USER] Creating new client record...");
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({ role: 'client', phone: cleanPhone })
          .select('id')
          .single();
        if (newUser) {
          finalId = newUser.id;
        } else if (insertError?.code === '23505') {
          // Race condition: user created between SELECT and INSERT — fetch it
          console.log(">>> [RESOLVE USER] Duplicate detected, fetching existing");
          const { data: raceUsers } = await supabase
            .from('users')
            .select('id')
            .in('phone', [orderData.phone, cleanPhone])
            .limit(1);
          if (raceUsers && raceUsers.length > 0) finalId = raceUsers[0].id;
        } else if (insertError) {
          console.error(">>> [RESOLVE USER] Error during user creation:", insertError);
        }
      }
      console.log(">>> [RESOLVE USER] Resolved finalId:", finalId);
      
      if (finalId) {
        if (finalId !== resolvedClientId) {
          console.log(">>> [RESOLVE USER] Overriding stale local ID to:", finalId);
          localStorage.setItem('user_id', finalId);
          setResolvedClientId(finalId);
        }
        if (orderData.id) {
          await supabase.from('orders').update({ user_id: finalId }).eq('id', orderData.id);
        }
      } else {
        console.warn(">>> [RESOLVE USER] FATAL: Could not resolve participantId");
      }
    };
    resolveUser();
  }, [orderData?.phone, orderData?.id]);

  // FALLBACK LOGIC: If no candidates, try to expand search after 8 seconds
  useEffect(() => {
    if (stage !== 'searching' || (candidates && candidates.length > 0) || orderStatus !== 'searching') return;
    
    const fallbackTimer = setTimeout(async () => {
      console.log('>>> [SEARCHING_SCREEN] Triggering fallback search...');
      const { findCandidatesWithFallback } = await import('../lib/notifications');
      const expanded = await findCandidatesWithFallback(orderData);
      if (expanded && expanded.length > 0) {
        setCandidates(expanded);
        console.log('>>> [SEARCHING_SCREEN] Fallback found candidates:', expanded.length);
      }
    }, 8000);

    return () => clearTimeout(fallbackTimer);
  }, [stage, candidates?.length, orderData, orderStatus]);

  // If page loads and order is already contact_purchased, fetch executor info
  useEffect(() => {
    if (orderStatus !== 'contact_purchased' || contactModalData) return;
    const execId = acceptedExecutorId || orderData?.accepted_by;
    const userId = resolvedClientId || orderData?.user_id;
    if (!execId) return;

    supabase.from('executors').select('*').eq('id', execId).single().then(({ data: execInfo }) => {
      if (!execInfo) return;
      const [u1, u2] = [userId, execId].sort();
      supabase.from('chats').select('id')
        .eq('user_1', u1)
        .eq('user_2', u2)
        .limit(1).then(({ data: chats }) => {
          setContactModalData({
              executor: {
                id: execInfo.id,
                name: execInfo.name || 'Мастер',
                phone: execInfo.phone || '',
                rating: execInfo.rating || 0,
                reviews: execInfo.reviews_count || 0,
                completed_orders: execInfo.completed_orders || 0,
                cases: execInfo.services || [],
                avatar: execInfo.avatar || null
              },
            chatId: chats?.[0]?.id || null
          });
        });
    });
  }, [orderStatus, acceptedExecutorId, orderData?.accepted_by, orderData?.user_id, resolvedClientId, contactModalData]);

  const currentCandidate = candidates[currentIndex];

  const notify = useCallback(async (candidateId: string) => {
    if (!orderData?.id || notifiedIds.current.has(candidateId)) return;
    notifiedIds.current.add(candidateId);
    console.log('>>> [NOTIFY] Order:', orderData.id, 'Executor:', candidateId);
    const { notifyExecutor } = await import('../lib/notifications');
    await notifyExecutor(orderData.id, candidateId);
  }, [orderData?.id]);

  const handleNext = useCallback(async () => {
    if (currentIndex < candidates.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setDispatchStatus('new');
        setCountdown(15);
        notify(candidates[nextIdx].id);
    }
  }, [currentIndex, candidates, notify]);

  const fetchOfferExecutor = useCallback(async (offer: any, retryCount = 0) => {
    console.log('>>> [OFFER] Fetching executor for offer:', offer.id, 'executor_id:', offer.executor_id, 'retry:', retryCount);
    
    if (!offer.executor_id) {
      console.error('>>> [OFFER] No executor_id in offer!');
      setOffers(prev => {
        if (prev.find(o => o.id === offer.id)) return prev;
        const newOffers = [...prev, { ...offer, executor: null }];
        if (newOffers.length === 1) setShowOffersModal(true);
        return newOffers.sort((a, b) => a.price - b.price);
      });
      return;
    }
    
    // Fetch executor data with fresh check, no cache to ensure we see updated name/avatar
    const t0 = performance.now();
    let exec: any = null;
    const res1 = await supabase.from("executors").select("*").eq("id", offer.executor_id).maybeSingle();
    exec = res1.data;
    
    if (!exec) {
      console.log('>>> [OFFER] Attempt 1 failed:', res1.error?.message, '— trying with limit(1)');
      const res2 = await supabase.from("executors").select("*").eq("id", offer.executor_id).limit(1);
      if (res2.data && res2.data.length > 0) exec = res2.data[0];
    }
    
    // We remove the cache to ensure updates are visible immediately
    console.log(`>>> [OFFER] Executor fetch took ${(performance.now() - t0).toFixed(0)}ms`);
    
    console.log('>>> [OFFER] Executor result:', exec ? `name="${exec.name}", avatar=${!!exec.avatar}, id=${exec.id}` : 'NULL');
    
    // Fetch real rating separately
    let real_rating = null;
    let reviews_count = 0;
    if (exec) {
      try {
        const { data: rd } = await supabase
          .from("executor_rating")
          .select("rating, reviews_count")
          .eq("executor_id", offer.executor_id)
          .maybeSingle();
        real_rating = rd?.rating ?? null;
        reviews_count = rd?.reviews_count ?? 0;
      } catch {}
    }

    const executorData = exec ? {
      ...exec,
      real_rating,
      reviews_count,
    } : null;

    setOffers(prev => {
        const exists = prev.find(o => o.id === offer.id);
        if (exists) {
          if (!exists.executor && executorData) {
            return prev.map(o => o.id === offer.id ? { ...o, executor: executorData } : o);
          }
          return prev;
        }
        const newOffers = [...prev, { ...offer, executor: executorData }];
        if (newOffers.length === 1) setShowOffersModal(true);
        return newOffers.sort((a, b) => a.price - b.price);
    });
    
    // If executor data failed, retry after a delay (up to 2 retries)
    if (!exec && retryCount < 2) {
      setTimeout(() => fetchOfferExecutor(offer, retryCount + 1), 1500);
    }
    
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.play().catch(() => {});
    } catch(e) {}
  }, []);

  // Auto-fill missing executor data for offers that loaded without it
  useEffect(() => {
    const offersWithoutExecutor = offers.filter(o => !o.executor && o.executor_id);
    if (offersWithoutExecutor.length === 0) return;
    
    const fillMissing = async () => {
      for (const off of offersWithoutExecutor) {
        console.log('>>> [AUTO-FILL] Refetching executor for offer:', off.id, 'executor_id:', off.executor_id);
        const { data: exec } = await supabase.from("executors").select("*").eq("id", off.executor_id).limit(1);
        if (exec && exec.length > 0) {
          const { data: rd } = await supabase.from("executor_rating").select("rating, reviews_count").eq("executor_id", off.executor_id).maybeSingle();
          const executorData = { ...exec[0], real_rating: rd?.rating ?? null, reviews_count: rd?.reviews_count ?? 0 };
          setOffers(prev => prev.map(o => o.id === off.id ? { ...o, executor: executorData } : o));
          console.log('>>> [AUTO-FILL] Filled executor:', exec[0].name);
        }
      }
    };
    
    const timer = setTimeout(fillMissing, 2000);
    return () => clearTimeout(timer);
  }, [offers]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setStage('searching');
        if (candidates.length > 0) notify(candidates[0].id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [candidates, notify]);

  // Elapsed search time counter (counts up from 0)
  useEffect(() => {
    if (stage !== 'searching') return;
    setElapsedTime(0);
    const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
     if (currentCandidate) return; // if looking at concrete candidate, don't rotate
     const timer1 = setTimeout(() => setStatusStep(1), 3000);
     const timer2 = setTimeout(() => setStatusStep(2), 6000);
     return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [currentCandidate]);

  useEffect(() => {
    if (!orderData?.id) return;
    const fetchExisting = async () => {
        console.log('>>> [OFFERS] Fetching existing offers for order:', orderData.id);
        const { data, error } = await supabase
          .from('offers')
          .select('id, order_id, executor_id, status, price, comment, options, created_at')
          .eq('order_id', orderData.id)
          .in('status', ['pending', 'accepted']);
        
        console.log('>>> [OFFERS] Found:', data?.length || 0, 'offers', error ? `Error: ${error.message}` : '');
        
        if (data && data.length > 0) {
          for (const off of data) {
            await fetchOfferExecutor(off);
          }
        }
    };
    fetchExisting();
  }, [orderData?.id, fetchOfferExecutor]);

  useEffect(() => {
    if (!orderData?.id) return;

    const channel = supabase.channel(`order-${orderData.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers', filter: `order_id=eq.${orderData.id}` }, (payload) => {
        fetchOfferExecutor(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderData.id}` }, (payload) => {
        console.log(">>> [STATUS UPDATE]", payload.new.status);
        setOrderStatus(payload.new.status);
        if (payload.new.status === 'accepted' || payload.new.status === 'contact_purchased' || payload.new.status === 'waiting_payment') {
          setStage('matched');
        }
        if (payload.new.status === 'searching' && !payload.new.accepted_by && acceptedExecutorIdRef.current) {
          const execId = acceptedExecutorIdRef.current;
          acceptedExecutorIdRef.current = null;
          setAcceptedExecutorId(null);
          setStage('searching');
          setContactModalData(null);
          setOffers(prev => prev.filter((o: any) => o.status === 'pending'));
          supabase.from('executors').select('name').eq('id', execId).single().then(({ data }) => {
            const name = data?.name || 'Исполнитель';
            setDeclineNotif(`${name} отказался от вашего заказа`);
            setTimeout(() => setDeclineNotif(null), 7000);
          });
        }
        if (payload.new.accepted_by) {
          acceptedExecutorIdRef.current = payload.new.accepted_by;
          setAcceptedExecutorId(payload.new.accepted_by);
          // Fetch executor details for the contact modal
          if (payload.new.status === 'contact_purchased') {
            // Create permanent contact (independent of order status)
            supabase.from('contacts').upsert({
              client_id: payload.new.user_id,
              executor_id: payload.new.accepted_by,
              order_id: payload.new.id
            }, { onConflict: 'client_id,executor_id' });

            supabase.from('executors').select('*').eq('id', payload.new.accepted_by).single().then(({ data: execInfo }) => {
              if (execInfo) {
                supabase.from('chats').select('id')
                  .or(`and(user_1.eq.${payload.new.accepted_by},user_2.eq.${payload.new.user_id}),and(user_1.eq.${payload.new.user_id},user_2.eq.${payload.new.accepted_by})`)
                  .limit(1).then(({ data: chats }) => {
                    setContactModalData({
                      executor: {
                        id: execInfo.id,
                        name: execInfo.name || 'Мастер',
                        phone: execInfo.phone || '',
                        rating: execInfo.rating || 0,
                        reviews: execInfo.reviews_count || 0,
                        completed_orders: execInfo.completed_orders || 0,
                        cases: execInfo.services || [],
                        avatar: execInfo.avatar || null
                      },
                      chatId: chats?.[0]?.id || null
                    });
                  });
              }
            });
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executor_orders', filter: `order_id=eq.${orderData.id}` }, (payload) => {
        if (currentCandidate && payload.new.executor_id === currentCandidate.id) {
            setDispatchStatus(payload.new.status);
            if (payload.new.status === 'rejected') handleNext();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderData?.id, fetchOfferExecutor, currentCandidate?.id, handleNext]);

  useEffect(() => {
    if (stage !== 'searching' || !currentCandidate) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { handleNext(); return 15; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, currentCandidate, handleNext]);

  const handleAccept = async (offer: any) => {
    acceptedExecutorIdRef.current = offer.executor_id;
    setAcceptedExecutorId(offer.executor_id);
    setOrderStatus('waiting_payment');
    setStage('matched');
    
    // Update order to matched (master found, master needs to pay)
    await supabase.from("orders").update({ 
      status: "matched", 
      accepted_by: offer.executor_id 
    }).eq("id", orderData.id);

    // Create contact immediately - REMOVED: Contacts only created after purchase by executor
    console.log('[STAGE] Matched, waiting for executor to unlock');

    // Notify executor
    await supabase.from("offers").update({ status: "accepted" }).eq("id", offer.id);
  };

  const handleRejectOffer = async (offerId: string) => {
    await supabase.from("offers").update({ status: "rejected" }).eq("id", offerId);
    setOffers(prev => {
      const remaining = prev.filter(o => o.id !== offerId);
      // Auto-close modal if no offers left — return to search
      if (remaining.length === 0) setShowOffersModal(false);
      return remaining;
    });
  };

  const handleViewPortfolio = async (executorId: string) => {
    setIsPortfolioLoading(true);
    const { data, error } = await supabase
      .from('executor_portfolio')
      .select('id, title, description, photo_url, created_at')
      .eq('executor_id', executorId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setViewingPortfolio(data);
    } else {
      console.error("Error fetching portfolio:", error);
      setViewingPortfolio([]);
    }
    setIsPortfolioLoading(false);
  };

  const handleViewReviews = async (executorId: string) => {
    setIsReviewsLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, client_id, created_at')
      .eq('executor_id', executorId)
      .order('created_at', { ascending: false });
    if (data) {
      setViewingReviews(data);
    } else {
      console.error('Error fetching reviews:', error);
      setViewingReviews([]);
    }
    setIsReviewsLoading(false);
  };

  const [onlineMasters, setOnlineMasters] = useState<any[]>([]);

  useEffect(() => {
    if (stage !== 'searching' || !orderData?.city) return;
    const fetchOnline = async () => {
        // Get online user_ids from presence (single source of truth)
        const twoMinsAgo = new Date(Date.now() - 120 * 1000).toISOString();
        const { data: onlinePresence } = await supabase.from('presence')
            .select('user_id')
            .eq('status', 'online')
            .gt('updated_at', twoMinsAgo);
        
        if (!onlinePresence || onlinePresence.length === 0) {
          setOnlineMasters([]);
          return;
        }

        const onlineIds = onlinePresence.map(p => p.user_id);
        const { data } = await supabase.from('executors')
            .select('*')
            .ilike('city', orderData.city.trim())
            .in('id', onlineIds)
            .limit(10);
        
        // Fetch ratings separately
        const execIds = (data || []).map(ex => ex.id);
        const { data: ratingsData } = execIds.length > 0
          ? await supabase.from('executor_rating').select('executor_id, rating, reviews_count').in('executor_id', execIds)
          : { data: [] };
        const ratingsMap = new Map<string, any>();
        (ratingsData || []).forEach(r => ratingsMap.set(r.executor_id, r));
        
        const processed = (data || []).map(ex => ({
          ...ex,
          real_rating: ratingsMap.get(ex.id)?.rating ?? null,
          reviews_count: ratingsMap.get(ex.id)?.reviews_count ?? 0,
        }));
        
        if (processed.length > 0) setOnlineMasters(processed);
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000);
    return () => clearInterval(interval);
  }, [stage, orderData?.city]);

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center overflow-hidden font-[Inter]">
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/[0.02] blur-[150px] rounded-full" />
      </div>

      {/* Decline notification */}
      <AnimatePresence>
        {declineNotif && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1a0a0a] border border-red-500/30 rounded-2xl px-6 py-4 shadow-2xl shadow-red-500/10 max-w-sm w-full mx-4"
          >
            <p className="text-red-400 font-black text-[11px] uppercase tracking-widest text-center">🚫 {declineNotif}</p>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest text-center mt-1">Продолжаем поиск...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage === 'sent' && (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
             <div className="w-20 h-20 bg-yellow-500 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl shadow-yellow-500/20">
                <Check className="w-10 h-10 text-black" />
             </div>
             <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Поиск запущен</h2>
             <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Оповещаем мастеров рядом с вами</p>
          </motion.div>
        )}

        {stage === 'searching' && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-black overflow-hidden text-center">
            {/* Yandex-Style Radar Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden text-yellow-500/10">
                <motion.div 
                    animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }} 
                    className="absolute w-[400px] h-[400px] border border-current rounded-full" 
                />
                <motion.div 
                    animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 1.33 }} 
                    className="absolute w-[400px] h-[400px] border border-current rounded-full" 
                />
                <motion.div 
                    animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 2.66 }} 
                    className="absolute w-[400px] h-[400px] border border-current rounded-full" 
                />
                
                {/* Rotating Scan Line */}
                <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[1000px] h-[1000px] bg-gradient-to-tr from-yellow-500/10 via-transparent to-transparent rounded-full"
                    style={{ originX: '50%', originY: '50%' }}
                />

                {/* Random POIs (Executors nearby) */}
                {[...Array(6)].map((_, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: [0, 1, 0],
                            scale: [0.5, 1, 0.5],
                            x: [Math.random() * 800 - 400, Math.random() * 800 - 400],
                            y: [Math.random() * 800 - 400, Math.random() * 800 - 400]
                        }}
                        transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                        className="absolute w-2 h-2 bg-yellow-500 rounded-full blur-[2px]"
                    />
                ))}
            </div>

            <div className="relative z-10 max-w-xl w-full space-y-4 text-center">
                <div className="flex flex-col items-center gap-2 pt-8">
                    <motion.div 
                        animate={{ y: [0, -3, 0] }} 
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-yellow-500/10 text-yellow-500 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border border-yellow-500/10 backdrop-blur-md"
                    >
                        Живой поиск в вашем городе
                    </motion.div>
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">Поиск мастеров</h2>
                </div>

                <div className="relative h-[220px] flex items-center justify-center">
                   <AnimatePresence mode="wait">
                    {currentCandidate ? (
                        <motion.div key={currentCandidate.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="space-y-4">
                            <div className="relative w-40 h-40 mx-auto">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-[60px] rounded-full animate-pulse" />
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -inset-3 border border-dashed border-yellow-500/20 rounded-full" />
                                <div className="w-full h-full rounded-[32px] overflow-hidden border-4 border-white/10 relative z-10 shadow-[0_0_50px_rgba(234,179,8,0.2)] bg-[#0a0a0a]">
                                    <img src={currentCandidate.avatar} className="w-full h-full object-cover grayscale-[0.2]" />
                                    <motion.div animate={{ top: ['-10%', '110%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-0.5 bg-yellow-500/50 blur-[2px] z-20" />
                                </div>
                            </div>
                            <div className="space-y-2 relative z-20">
                                <div className="flex items-center gap-2 justify-center">
                                  <h3 className="text-2xl font-black uppercase text-white tracking-tight leading-none">{currentCandidate.name}</h3>
                                  {currentCandidate.verification_status === 'verified' && (
                                    <span className="flex items-center gap-0.5 text-[8px] font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                                      <ShieldCheck className="w-3 h-3" /> Проверен
                                    </span>
                                  )}
                                </div>
                                <div className="bg-white/5 inline-flex px-3 py-1 rounded-full text-[8px] font-black items-center gap-1.5 border border-white/5 mx-auto backdrop-blur-md">
                                    <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                                    {currentCandidate.real_rating ? (
                                      <span>{currentCandidate.real_rating.toFixed(1)}</span>
                                    ) : (
                                      <span className="text-white/40">Новый</span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 py-4 w-full max-w-sm flex flex-col items-center">
                            <div className="text-center space-y-2">
                                <p className="text-yellow-500 font-black uppercase text-base tracking-tighter drop-shadow-md">Подбираем лучших исполнителей...</p>
                                <motion.div 
                                    key={statusStep}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white/40 text-[10px] font-bold uppercase tracking-widest h-4"
                                >
                                    {statusStep === 0 && `${Math.max(3, onlineMasters.length)} мастера уже получили заявку`}
                                    {statusStep === 1 && "Один мастер просматривает заказ"}
                                    {statusStep === 2 && "💰 первые предложения уже формируются"}
                                </motion.div>
                            </div>
                            
                            {/* Online Masters List */}
                            <div className="space-y-3 w-full">
                               <div className="flex flex-wrap justify-center gap-3">
                                  {onlineMasters.map((m, idx) => (
                                      <motion.div 
                                        key={m.id} 
                                        initial={{ opacity: 0, scale: 0 }} 
                                        animate={{ opacity: 1, scale: 1 }} 
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex flex-col items-center gap-1.5"
                                      >
                                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 relative shadow-xl shadow-black group">
                                              <img src={m.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                              <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-black" />
                                          </div>
                                          <span className="text-[8px] font-bold text-white/30 uppercase max-w-[40px] truncate">{m.name.split(' ')[0]}</span>
                                      </motion.div>
                                  ))}
                                  {onlineMasters.length === 0 && (
                                      <div className="flex justify-center gap-3 py-2">
                                          <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
                                          <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2, delay: 0.3 }} className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
                                          <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
                                      </div>
                                  )}
                               </div>
                            </div>
                        </motion.div>
                    )}
                   </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest relative z-20">
                    {dispatchStatus === 'new' ? (
                        <div className="flex items-center gap-2 text-white/40">
                            <div className="flex gap-1">
                                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                            </div>
                            <span className="ml-1 text-left tabular-nums">{String(Math.floor(elapsedTime / 60)).padStart(2, '0')}:{String(elapsedTime % 60).padStart(2, '0')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-yellow-500">
                            <Check className="w-4 h-4" />
                            Изучает ваш заказ...
                        </div>
                    )}
                </div>

                <div className="flex justify-center pt-4 relative z-20">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { if(confirm('Отменить поиск?')) { supabase.from('orders').update({status:'CANCELLED'}).eq('id',orderData.id); onCancel?.(); } }} 
                    className="bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 px-12 py-5 rounded-3xl text-white/30 font-black uppercase text-[10px] tracking-widest transition-all backdrop-blur-md"
                  >
                    Отменить поиск
                  </motion.button>
                </div>
            </div>

            <AnimatePresence>
                {offers.length > 0 && !showOffersModal && (
                    <motion.button 
                        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                        onClick={() => setShowOffersModal(true)}
                        className="fixed bottom-10 bg-yellow-500 text-black px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-4 hover:scale-105 transition-all z-[2050]"
                    >
                        Посмотреть предложения ({offers.length})
                        <MessageCircle className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showOffersModal && (
                    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOffersModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[40px] flex flex-col max-h-[85vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Предложения мастеров</h3>
                                    <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Выберите подходящий вариант</p>
                                </div>
                                <button onClick={() => setShowOffersModal(false)} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                                    <X className="w-6 h-6 text-white/40" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                                {offers.map((off, idx) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        transition={{ delay: idx * 0.1 }}
                                        key={off.id} 
                                        className={cn(
                                            "bg-[#0a0a0a] border-[1px] rounded-[32px] p-8 space-y-6 relative overflow-hidden group transition-all duration-500",
                                            idx === 0 ? "border-green-500/30 shadow-[0_0_60px_rgba(34,197,94,0.1)] shadow-inner" : "border-white/5"
                                        )}
                                    >
                                        {idx === 0 && (
                                            <div className="absolute top-0 right-0 bg-yellow-500 text-black px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest shadow-lg">Лучшее предложение</div>
                                        )}

                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[28px] overflow-hidden border-2 border-white/5 shadow-2xl shrink-0">
                                                <img src={off.executor?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop'} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-black uppercase text-lg md:text-2xl tracking-tighter text-white leading-none">{off.executor?.name || 'Мастер'}</h4>
                                                        {off.executor?.verification_status === 'verified' && (
                                                            <span className="flex items-center gap-0.5 text-[8px] font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                                <ShieldCheck className="w-3 h-3" /> Проверен
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Price — desktop only (top-right) */}
                                                    <div className="text-right shrink-0 hidden md:block">
                                                        <div className="flex items-end justify-end gap-1 leading-none">
                                                            <span className="text-4xl font-black text-yellow-500 tabular-nums">{new Intl.NumberFormat('ru-RU').format(off.price)}</span>
                                                            <span className="text-xl font-black text-yellow-500/40 mb-0.5">₽</span>
                                                        </div>
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Цена</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400/10 border border-yellow-400/10 rounded-full w-fit">
                                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                                        <span className="text-[11px] font-black text-yellow-400">{off.executor?.real_rating?.toFixed(1) || off.executor?.rating || 0}</span>
                                                    </div>
                                                    <button onClick={() => handleViewPortfolio(off.executor_id)} className="text-[9px] font-black uppercase text-white/40 hover:text-yellow-500 transition-colors flex items-center gap-1.5 group/p">
                                                        {isPortfolioLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                                        <span className="border-b border-white/10 group-hover/p:border-yellow-500/50">Кейсы</span>
                                                    </button>
                                                    <button onClick={() => handleViewReviews(off.executor_id)} className="text-[9px] font-black uppercase text-white/40 hover:text-yellow-500 transition-colors flex items-center gap-1.5 group/r">
                                                        {isReviewsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                                        <span className="border-b border-white/10 group-hover/r:border-yellow-500/50">Отзывы ({off.executor?.reviews_count || 0})</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Conditions Chips */}
                                        <div className="flex flex-wrap gap-2.5 pt-2">
                                            {[
                                                { key: 'min2h', label: 'Минимум 2 часа' },
                                                { key: 'careful', label: 'Аккуратная работа' },
                                                { key: 'noExtra', label: 'Без доплат' }
                                            ].map(opt => (
                                              <span key={opt.key} className="bg-white/5 text-white/40 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/5 flex items-center gap-2 group-hover:text-yellow-500 transition-all">
                                                  <Check className="w-3.5 h-3.5" /> {opt.label}
                                              </span>
                                            ))}
                                        </div>

                                        <div className="h-[1px] bg-white/5 w-full" />

                                        {/* Order Details Toggle */}
                                        <div className="flex items-center justify-between">
                                            <button 
                                                onClick={() => setShowOrderDetails(!showOrderDetails)} 
                                                className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition flex items-center gap-2.5"
                                            >
                                                <span>Показать детали заказа</span>
                                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                                                   <Info className="w-3.5 h-3.5" />
                                                </div>
                                            </button>
                                        </div>
                                        
                                        <AnimatePresence>
                                            {showOrderDetails && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }} 
                                                    animate={{ height: 'auto', opacity: 1 }} 
                                                    exit={{ height: 0, opacity: 0 }} 
                                                    className="overflow-hidden bg-[#050505] rounded-3xl border border-white/5"
                                                >
                                                    <div className="p-6 grid grid-cols-2 gap-8">
                                                        <div className="space-y-1.5 font-sans">
                                                            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">Откуда</p>
                                                            <p className="text-xs font-black text-white/60">{orderData.from_address}</p>
                                                        </div>
                                                        <div className="space-y-1.5 font-sans">
                                                            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">Куда</p>
                                                            <p className="text-xs font-black text-white/60">{orderData.to_address}</p>
                                                        </div>
                                                        <div className="space-y-1.5 font-sans">
                                                            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">Параметры</p>
                                                            <p className="text-xs font-black text-white/60">{orderData.movers_count} чел • {orderData.type}</p>
                                                        </div>
                                                        <div className="space-y-1.5 font-sans">
                                                            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">Ваш эстимейт</p>
                                                            <p className="text-xs font-black text-yellow-500/80">{orderData.price_estimate} ₽</p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Price — mobile only, above buttons */}
                                        <div className="md:hidden flex items-center justify-between bg-yellow-500/8 border border-yellow-500/20 rounded-[20px] px-5 py-3">
                                            <span className="text-[10px] font-black text-yellow-500/50 uppercase tracking-widest">Стоимость</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-yellow-500 tabular-nums">{new Intl.NumberFormat('ru-RU').format(off.price)}</span>
                                                <span className="text-lg font-black text-yellow-500/50">₽</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button 
                                                onClick={() => handleAccept(off)} 
                                                className="flex-[2] bg-yellow-500 text-black h-24 rounded-[32px] font-black uppercase text-sm tracking-[0.2em] hover:bg-white transition-all shadow-[0_20px_60px_rgba(234,179,8,0.3)] active:scale-95"
                                            >
                                                ПРИНЯТЬ
                                            </button>
                                            <button 
                                                onClick={() => handleRejectOffer(off.id)} 
                                                className="flex-1 bg-white/5 text-white/20 hover:text-red-500 h-24 rounded-[32px] flex items-center justify-center transition-all border border-white/5 font-black uppercase text-[10px] tracking-widest active:scale-95 group/btn"
                                            >
                                                <span className="group-hover/btn:scale-110 transition-transform">ОТКЛОНИТЬ</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
          </motion.div>
        )}

        {stage === 'matched' && (
          <motion.div key="matched" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm text-center space-y-12 p-8">
            {orderStatus === 'matched' ? (
              <div className="space-y-10">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="relative w-40 h-40 mx-auto"
                >
                  <div className="absolute inset-0 bg-yellow-500 rounded-full animate-ping opacity-10" />
                  <div className="absolute inset-4 bg-yellow-500 rounded-full opacity-20" />
                  <div className="relative w-full h-full bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(234,179,8,0.3)]">
                    <Clock className="w-16 h-16 text-black animate-pulse" />
                  </div>
                </motion.div>
                
                <div className="space-y-4">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Мастер найден!</h2>
                  <p className="text-white/60 text-xs font-bold leading-relaxed">
                    Исполнитель подтвердил заказ. <br/>
                    Ожидаем, пока он откроет контактные данные. Обычно это занимает до 1 минуты.
                  </p>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-[24px] space-y-1 mt-6">
                    <span className="text-[8px] font-black uppercase text-yellow-500 tracking-widest block">Статус</span>
                    <span className="text-xs font-bold text-white uppercase tracking-tighter animate-pulse">ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ МАСТЕРОМ...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="w-40 h-40 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_100px_rgba(34,197,94,0.4)]">
                   <CheckCircle2 className="w-16 h-16 text-black" />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Контакт открыт!</h1>
                  <p className="text-white/60 text-xs font-bold leading-relaxed uppercase tracking-widest">Загрузка данных мастера...</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPortfolio && (
          <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingPortfolio(null)} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-10 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Кейсы мастера</h2>
                   <button onClick={() => setViewingPortfolio(null)} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
                   {viewingPortfolio.map((item, idx) => (
                      <div key={item.id} className="space-y-6 group">
                         <div className="relative aspect-video rounded-[32px] overflow-hidden border border-white/5 bg-white/5">
                            <img src={item.photo_url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                         </div>
                         <div className="space-y-2 px-4 text-left">
                            <h4 className="text-xl font-black uppercase tracking-tight text-white">{item.title}</h4>
                            <p className="text-sm font-bold text-white/40 leading-relaxed">{item.description}</p>
                         </div>
                      </div>
                   ))}
                   {viewingPortfolio.length === 0 && (
                      <div className="py-20 text-center space-y-4">
                         <Star className="w-12 h-12 text-white/5 mx-auto" />
                         <p className="text-white/20 text-sm font-black uppercase tracking-widest">Портфолио пока пусто</p>
                      </div>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingReviews && (
          <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingReviews(null)} className="absolute inset-0 bg-black/98 backdrop-blur-3xl" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-10 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Отзывы</h2>
                   <button onClick={() => setViewingReviews(null)} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-hide">
                   {viewingReviews.map((review, idx) => (
                      <motion.div 
                        key={review.id || idx} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-3"
                      >
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{review.client_name || 'Клиент'}</span>
                            <div className="flex items-center gap-1">
                               {[...Array(5)].map((_, i) => (
                                 <Star key={i} className={cn("w-3.5 h-3.5", i < (review.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-white/10")} />
                               ))}
                            </div>
                         </div>
                         {review.comment && <p className="text-white/60 text-sm leading-relaxed">{review.comment}</p>}
                         <span className="text-[10px] text-white/20">{new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                      </motion.div>
                   ))}
                   {viewingReviews.length === 0 && (
                      <div className="py-20 text-center space-y-4">
                         <Star className="w-12 h-12 text-white/5 mx-auto" />
                         <p className="text-white/20 text-sm font-black uppercase tracking-widest">Отзывов пока нет</p>
                      </div>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contactModalData && !chatOpened && (
          <ContactUnlockedModal
            executor={contactModalData.executor}
            chatId={contactModalData.chatId}
            onOpenChat={() => setChatOpened(true)}
            onClose={() => {
              setContactModalData(null);
              router.push('/');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpened && orderData && (
          <ChatDialog 
            orderId={orderData.id}
            participantId={resolvedClientId || orderData.user_id}
            receiverId={acceptedExecutorId || orderData.accepted_by}
            isExecutor={false}
            participantName={contactModalData?.executor?.name || "Мастер"}
            onClose={() => setChatOpened(false)}
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .active-radar-dot { background: radial-gradient(circle at center, rgba(234, 179, 8, 0.1) 0%, transparent 70%); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
