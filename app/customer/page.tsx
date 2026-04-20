'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Truck, Phone, MessageCircle, User, X, ChevronDown, CheckCircle2, MapPin, Trash2, Star, Camera, Loader2, LayoutGrid, ClipboardList, Settings, Edit3, Save, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthGuard } from '../../components/auth-guard';
import { supabase } from '../../lib/supabase';
import ChatDialog from '../../components/ChatDialog';

const categories = [
  { id: 'workers', title: 'ГРУЗЧИКИ', subtitle: 'ПЕРЕЕЗД, СБОРКА МЕБЕЛИ, ТАКЕЛАЖ', icon: Users },
  { id: 'gazelle', title: 'ГАЗЕЛЬ', subtitle: 'ПО ГОРОДУ И МЕЖГОРОД', icon: Truck },
];


const TYPE_LABELS: Record<string, string> = {
  'Грузчики': 'ГРУЗЧИКИ',
  'Газель': 'ГАЗЕЛЬ',
  'Газель (Межгород)': 'МЕЖГОРОД',
  'Сборка мебели': 'МЕБЕЛЬ',
  'Такелаж': 'ТАКЕЛАЖ',
};

export default function CustomerHome() {
  const router = useRouter();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState('Шуя');
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [showMastersModal, setShowMastersModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatData, setChatData] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [completionNotif, setCompletionNotif] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [reviewedExecutorIds, setReviewedExecutorIds] = useState<Set<string>>(new Set());
  const [historyView, setHistoryView] = useState<{ execId: string; execName: string } | null>(null);
  const [reviewsView, setReviewsView] = useState<{ execId: string; execName: string } | null>(null);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [casesView, setCasesView] = useState<{ execId: string; execName: string } | null>(null);
  const [casesData, setCasesData] = useState<any[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [executorRatings, setExecutorRatings] = useState<Record<string, { rating: number; count: number }>>({}); 
  const [mobileNavTab, setMobileNavTab] = useState<'home' | 'masters' | 'history' | 'profile'>('home');
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [clientAvatar, setClientAvatar] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Get client UUID (resolved from phone during order flow)
  const getClientId = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_id') || null;
  };

  // Get client phone for order queries
  const getClientPhone = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_phone') || null;
  };

  // Load saved city + profile
  useEffect(() => {
    const savedCity = localStorage.getItem('selected_city');
    if (savedCity) setSelectedCity(savedCity);
    setProfileName(localStorage.getItem('client_name') || '');
    setProfileBio(localStorage.getItem('client_bio') || '');
    setClientAvatar(localStorage.getItem('client_avatar') || '');
    // Also load from DB
    const clientId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    if (clientId) {
      supabase.from('users').select('name, avatar, bio').eq('id', clientId).maybeSingle().then(({ data }) => {
        if (data?.name) { setProfileName(data.name); localStorage.setItem('client_name', data.name); }
        if (data?.bio) { setProfileBio(data.bio); localStorage.setItem('client_bio', data.bio); }
        if (data?.avatar) { setClientAvatar(data.avatar); localStorage.setItem('client_avatar', data.avatar); }
      });
    }
  }, []);

  // Load history when tab switches
  useEffect(() => {
    if (mobileNavTab === 'masters' && activeOrders.length === 0 && !mastersLoading) {
      handleOpenMasters();
    }
    if (mobileNavTab === 'history') {
      loadHistory();
    }
  }, [mobileNavTab]);

  const loadHistory = async () => {
    const clientPhone = getClientPhone();
    if (!clientPhone) return;
    setHistoryLoading(true);
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, type, description, city, from_address, to_address, status, accepted_by, created_at')
        .eq('phone', clientPhone)
        .order('created_at', { ascending: false });
      const execIds = Array.from(new Set((orders || []).filter(o => o.accepted_by).map((o: any) => o.accepted_by))) as string[];
      let execs: any[] = [];
      if (execIds.length > 0) {
        const { data } = await supabase.from('executors').select('id, name, avatar').in('id', execIds);
        execs = data || [];
      }
      setHistoryOrders((orders || []).map((o: any) => ({ ...o, executor: execs.find(e => e.id === o.accepted_by) || null })));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    localStorage.setItem('client_name', profileName);
    localStorage.setItem('client_bio', profileBio);
    const clientId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    if (clientId) {
      await supabase.from('users').update({ name: profileName, bio: profileBio }).eq('id', clientId);
    }
    setIsSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const clientId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    setAvatarUploading(true);
    const saveAvatar = async (url: string) => {
      setClientAvatar(url);
      localStorage.setItem('client_avatar', url);
      if (clientId) {
        await supabase.from('users').update({ avatar: url }).eq('id', clientId);
      }
    };
    try {
      if (!clientId) throw new Error('no client id');
      const ext = file.name.split('.').pop();
      const path = `${clientId}.${ext}`;
      const { error: upErr } = await supabase.storage.from('customer-avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('customer-avatars').getPublicUrl(path);
      await saveAvatar(urlData.publicUrl);
    } catch (err) {
      // Fallback: compress & store as base64 locally
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const raw = ev.target?.result as string;
        if (!raw) return;
        // Resize via canvas to keep size reasonable (~200px)
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX = 200;
          const scale = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          await saveAvatar(dataUrl);
        };
        img.src = raw;
      };
      reader.readAsDataURL(file);
    } finally {
      setAvatarUploading(false);
    }
  };


  // ─── ONLINE COUNT: DB polling every 5s ───
  const [isLoadingOnline, setIsLoadingOnline] = useState(true);

  const fetchOnlineExecutors = async (city: string) => {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { data, error } = await supabase
      .from('executors')
      .select('id')
      .ilike('city', `%${city.trim()}%`)
      .eq('online_status', 'online')
      .gte('last_seen', thirtySecondsAgo);
    if (error) { console.error('ONLINE FETCH ERROR:', error); return 0; }
    return data?.length ?? 0;
  };

  useEffect(() => {
    setOnlineCount(null);
    setIsLoadingOnline(true);
    const city = selectedCity.trim();

    const load = async () => {
      const count = await fetchOnlineExecutors(city);
      setOnlineCount(count);
      setIsLoadingOnline(false);
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [selectedCity]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    if (categoryId === 'workers') {
      router.push('/form?type=workers');
    } else {
      router.push(`/form?type=${categoryId}`);
    }
  }, [router]);

  const handleRoleChange = (role: 'customer' | 'executor') => {
    localStorage.setItem('role', role);
    if (role === 'executor') {
      router.push('/performer/auth');
    }
  };

  const handleCityClick = () => {
    setCityInput(selectedCity);
    setShowCityModal(true);
  };

  const handleCitySubmit = () => {
    if (cityInput.trim()) {
      const city = cityInput.trim();
      setSelectedCity(city);
      localStorage.setItem('selected_city', city);
      setShowCityModal(false);
    }
  };

  // ─── Realtime subscription: notify when order becomes completed ───
  useEffect(() => {
    const clientPhone = getClientPhone();
    if (!clientPhone) return;
    const sub = supabase
      .channel('customer-orders-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `phone=eq.${clientPhone}` }, (payload: any) => {
        if (payload.new?.status === 'completed' && payload.old?.status !== 'completed') {
          setNotifCount(n => n + 1);
          const execId = payload.new.accepted_by;
          if (execId) {
            supabase.from('executors').select('name').eq('id', execId).single().then(({ data }) => {
              const name = data?.name || 'Мастер';
              setCompletionNotif(`${name} выполнил ваш заказ`);
              setTimeout(() => setCompletionNotif(null), 5000);
            });
          }
          // Refresh orders if modal open
          setActiveOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: 'completed' } : o));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // ─── OPEN "ВАШИ МАСТЕРА" — load active orders for this client ───
  const handleOpenMasters = async () => {
    setShowMastersModal(true);
    setMastersLoading(true);
    setNotifCount(0);
    setHistoryView(null);
    setReviewsView(null);
    setCasesView(null);
    setExpandedOrder(null);
    try {
      const clientPhone = getClientPhone();
      const clientId = getClientId();
      if (!clientPhone) { setActiveOrders([]); setMastersLoading(false); return; }

      const { data: orders } = await supabase
        .from('orders')
        .select('id, type, description, city, from_address, to_address, status, accepted_by, client_name, phone, created_at')
        .eq('phone', clientPhone)
        .in('status', ['matched', 'contact_purchased', 'waiting_payment', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) { setActiveOrders([]); setMastersLoading(false); return; }

      const execIds = Array.from(new Set(orders.filter(o => o.accepted_by).map(o => o.accepted_by))) as string[];
      let executors: any[] = [];
      if (execIds.length > 0) {
        const { data: execs } = await supabase.from('executors').select('id, name, phone, avatar, city').in('id', execIds);
        executors = execs || [];
      }

      // Fetch ratings
      if (execIds.length > 0) {
        const { data: ratingData } = await supabase
          .from('executor_rating')
          .select('executor_id, rating, reviews_count')
          .in('executor_id', execIds);
        if (ratingData) {
          const ratings: Record<string, { rating: number; count: number }> = {};
          ratingData.forEach(r => { ratings[r.executor_id] = { rating: r.rating, count: r.reviews_count }; });
          setExecutorRatings(ratings);
        }
      }

      // Check existing reviews — by order_id (1 review per order)
      const completedOrderIds = orders.filter(o => o.status === 'completed').map(o => o.id);
      if (completedOrderIds.length > 0) {
        const { data: existingReviews } = await supabase
          .from('reviews')
          .select('executor_id, order_id')
          .in('order_id', completedOrderIds);
        if (existingReviews && existingReviews.length > 0) {
          setReviewedExecutorIds(new Set(existingReviews.map(r => r.executor_id)));
        }
      }

      const enriched = orders.map(order => ({
        ...order,
        executor: executors.find(e => e.id === order.accepted_by) || null,
      }));

      setActiveOrders(enriched);
    } catch (err) {
      console.error('Error fetching active orders:', err);
    } finally {
      setMastersLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    if (phone) window.location.href = `tel:+${phone}`;
  };

  const handleOpenChat = async (order: any) => {
    if (!order.executor || !order.accepted_by) return;
    const clientId = getClientId();
    if (!clientId) return;
    setChatData({
      orderId: order.id,
      participantId: clientId,
      receiverId: order.accepted_by,
      participantName: order.executor.name || 'Мастер',
    });
    setChatOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewModal || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const clientId = getClientId();
      const { error: insertErr } = await supabase.from('reviews').insert({
        executor_id: reviewModal.executor_id,
        client_id: clientId,
        order_id: reviewModal.order_id,
        rating: reviewRating,
        comment: reviewText.trim() || null,
        client_name: reviewModal.client_name || null,
      });
      if (insertErr) { console.error('Review insert error:', insertErr); throw insertErr; }
      // Mark executor as reviewed
      setReviewedExecutorIds(prev => { const s = new Set(Array.from(prev)); s.add(reviewModal.executor_id); return s; });
      // Refresh rating for this executor
      supabase.from('executor_rating').select('rating, reviews_count').eq('executor_id', reviewModal.executor_id).single().then(({ data }) => {
        if (data) setExecutorRatings(prev => ({ ...prev, [reviewModal.executor_id]: { rating: data.rating, count: data.reviews_count } }));
      });
      setReviewModal(null);
      setReviewRating(5);
      setReviewText('');
    } catch (err) {
      console.error('Review error:', err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ─── GROUP orders by executor ───
  const executorGroups = (() => {
    const map = new Map<string, { executor: any; orders: any[] }>();
    activeOrders.forEach(order => {
      if (!order.accepted_by) return;
      if (!map.has(order.accepted_by)) {
        map.set(order.accepted_by, { executor: order.executor, orders: [] });
      }
      map.get(order.accepted_by)!.orders.push(order);
    });
    return Array.from(map.values());
  })();

  const handleDelete = async (orderId: string) => {
    if (!confirm('Удалить заказ?')) return;
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    if (!error) {
      setActiveOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#08090E' }}>
        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(20, 18, 12, 0.8) 0%, transparent 100%)' }} />

        {/* Main Content — HOME tab (always on desktop, toggled on mobile) */}
        <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-[88px] md:pb-0${mobileNavTab !== 'home' ? ' hidden md:flex' : ''}`}>

          {/* Role Switcher — directly above title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center mb-6"
          >
            <div className="rounded-full p-0.5 flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => handleRoleChange('customer')}
                className="px-5 py-1.5 rounded-full bg-yellow-500 text-black font-bold text-[11px] tracking-wider transition-all duration-200 hover:bg-yellow-400 active:scale-95"
              >
                ЗАКАЗЧИК
              </button>
              <button
                onClick={() => handleRoleChange('executor')}
                className="px-5 py-1.5 rounded-full text-white/50 hover:text-white/70 font-bold text-[11px] tracking-wider transition-all duration-200 active:scale-95"
              >
                Я—ИСПОЛНИТЕЛЬ
              </button>
            </div>
          </motion.div>

          {/* Title — no italic, no skew */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1]">
              ЧТО НУЖНО <span className="text-yellow-400">СДЕЛАТЬ?</span>
            </h1>
            <p className="text-[11px] tracking-[0.35em] text-white/30 mt-5 uppercase">
              ВЫБЕРИТЕ НАПРАВЛЕНИЕ РАБОТЫ
            </p>
          </motion.div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-5 max-w-[640px] w-full">
            {categories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                onClick={() => handleCategoryClick(category.id)}
                className="group relative rounded-2xl p-8 pb-7 text-center cursor-pointer"
                style={{
                  background: 'linear-gradient(180deg, rgba(18,20,32,0.95) 0%, rgba(10,12,20,0.98) 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition: 'all 0.25s ease',
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 30px rgba(200,180,100,0.04)',
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex flex-col items-center">
                  <category.icon
                    className={`w-12 h-12 mb-5 transition-all duration-250 ${index === 0 ? 'text-yellow-400/90 group-hover:text-yellow-400' : 'text-blue-400/90 group-hover:text-blue-400'}`}
                    strokeWidth={1.5}
                  />
                  <h3 className="text-xl font-black text-white mb-1.5 tracking-wide">
                    {category.title}
                  </h3>
                  <p className="text-white/30 text-[10px] tracking-[0.15em] mb-5">
                    {category.subtitle}
                  </p>
                  <span className="text-yellow-500/70 font-bold text-xs tracking-wider underline underline-offset-4 decoration-yellow-500/25 transition-all duration-250 group-hover:text-yellow-400 group-hover:decoration-yellow-400/50">
                    ВЫБРАТЬ →
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* ─── Footer: Online status pill ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-14 mb-3"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Pulsing dot */}
              <span className="relative flex h-2 w-2">
                {onlineCount !== null && onlineCount > 0 ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                  </>
                ) : isLoadingOnline ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white/20" />
                )}
              </span>

              <span className="text-white/40">В городе</span>

              {/* Clickable city — opens input modal */}
              <button
                onClick={handleCityClick}
                className="inline-flex items-center gap-1 text-yellow-500 font-bold hover:text-yellow-400 transition-colors duration-200"
              >
                {selectedCity.toUpperCase()}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Online status */}
              {isLoadingOnline ? (
                <span className="inline-flex gap-[3px] items-center text-yellow-500/60 text-[11px]">
                  <span className="w-1 h-1 rounded-full bg-yellow-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-yellow-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-yellow-500 animate-bounce [animation-delay:300ms]" />
                </span>
              ) : onlineCount !== null && onlineCount > 0 ? (
                <>
                  <span className="text-white/40">сейчас</span>
                  <motion.span
                    key={onlineCount}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="font-bold text-green-400"
                  >
                    {onlineCount}
                  </motion.span>
                  <span className="text-white/40">онлайн</span>
                </>
              ) : (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-white/30 text-[11px]"
                >
                  ищем исполнителей...
                </motion.span>
              )}
            </div>
          </motion.div>

          {/* ─── "ВАШИ МАСТЕРА" — real button with badge ─── */}
          <motion.div className="mb-8 relative inline-block hidden md:inline-block">
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              onClick={handleOpenMasters}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-full text-[11px] tracking-[0.3em] font-black uppercase transition-all duration-300 cursor-pointer"
              style={{
                background: notifCount > 0 ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.04)',
                border: notifCount > 0 ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: notifCount > 0 ? 'rgb(234,179,8)' : 'rgba(255,255,255,0.5)',
                boxShadow: notifCount > 0 ? '0 0 20px rgba(234,179,8,0.2)' : 'none',
              }}
            >
              <MessageCircle className="w-3.5 h-3.5 inline mr-2 -mt-0.5" />
              ВАШИ МАСТЕРА
            </motion.button>
            {notifCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 text-black text-[9px] font-black flex items-center justify-center shadow-lg"
              >
                {notifCount}
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* ─── Masters Modal ─── */}
        <AnimatePresence>
          {showMastersModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
              onClick={() => { setShowMastersModal(false); setHistoryView(null); setReviewsView(null); setCasesView(null); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 30 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="rounded-[24px] max-w-lg w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden"
                style={{ background: '#0D0E14', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3">
                    {(historyView || reviewsView || casesView) ? (
                      <button onClick={() => { setHistoryView(null); setReviewsView(null); setCasesView(null); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-yellow-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-tight">
                        {historyView ? `История · ${historyView.execName}` : reviewsView ? `Отзывы · ${reviewsView.execName}` : casesView ? `Кейсы · ${casesView.execName}` : 'Ваши мастера'}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowMastersModal(false); setHistoryView(null); setReviewsView(null); setCasesView(null); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                  {mastersLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    </div>

                  /* ── REVIEWS VIEW ── */
                  ) : reviewsView ? (
                    <div className="space-y-3">
                      {reviewsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : reviewsData.length === 0 ? (
                        <div className="text-center py-12">
                          <Star className="w-10 h-10 text-white/10 mx-auto mb-3" />
                          <p className="text-white/30 font-bold text-sm">Пока нет отзывов</p>
                        </div>
                      ) : reviewsData.map((review, i) => (
                        <motion.div
                          key={review.id || i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-2xl p-4 space-y-2"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'}`} />
                              ))}
                            </div>
                            <span className="text-white/20 text-xs">
                              {new Date(review.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {(review.comment || review.text) && (
                            <p className="text-white/60 text-sm leading-relaxed">{review.comment || review.text}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>

                  /* ── CASES VIEW ── */
                  ) : casesView ? (
                    <div className="space-y-3">
                      {casesLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : casesData.length === 0 ? (
                        <div className="text-center py-12">
                          <Camera className="w-10 h-10 text-white/10 mx-auto mb-3" />
                          <p className="text-white/30 font-bold text-sm">Кейсов пока нет</p>
                        </div>
                      ) : casesData.map((item, i) => (
                        <motion.div
                          key={item.id || i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-2xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {item.photo_url && (
                            <img src={item.photo_url} alt={item.title} className="w-full h-36 object-cover" />
                          )}
                          <div className="p-3 space-y-1">
                            {item.title && <p className="text-white font-bold text-sm">{item.title}</p>}
                            {item.description && <p className="text-white/40 text-xs leading-relaxed">{item.description}</p>}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                  /* ── HISTORY VIEW ── */
                  ) : historyView ? (
                    <div className="space-y-2">
                      {activeOrders.filter(o => o.accepted_by === historyView.execId).map((order) => (
                        <div key={order.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          >
                            <div>
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 mr-2">
                                {TYPE_LABELS[order.type] || order.type}
                              </span>
                              <span className="text-white/50 text-xs">
                                {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${ order.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500' }`}>
                                {order.status === 'completed' ? 'Выполнен' : 'В работе'}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${ expandedOrder === order.id ? 'rotate-180' : '' }`} />
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedOrder === order.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-2 text-xs text-white/40">
                                  {order.description && <p>{order.description}</p>}
                                  {(order.from_address || order.city) && (
                                    <p className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {order.from_address && order.to_address ? `${order.from_address} → ${order.to_address}` : order.city}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                  /* ── MAIN VIEW — executor cards ── */
                  ) : executorGroups.length === 0 ? (
                    <div className="text-center py-16">
                      <User className="w-12 h-12 text-white/10 mx-auto mb-3" />
                      <p className="text-white/30 font-bold mb-1">У вас пока нет активных заказов</p>
                      <p className="text-white/15 text-xs">Оформите заказ, и здесь появятся ваши мастера</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {executorGroups.map(({ executor, orders: execOrders }, idx) => {
                        const execId = executor?.id || execOrders[0]?.accepted_by;
                        const hasCompleted = execOrders.some(o => o.status === 'completed');
                        const hasActive = execOrders.some(o => o.status !== 'completed');
                        const isReviewed = reviewedExecutorIds.has(execId);
                        const latestOrder = execOrders[0];
                        const rating = executorRatings[execId];
                        const firstActiveOrder = execOrders.find(o => o.status !== 'completed') || latestOrder;

                        return (
                          <motion.div
                            key={execId}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06, duration: 0.3 }}
                            className="rounded-2xl p-5 space-y-4 relative"
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: hasCompleted && !isReviewed
                                ? '1px solid rgba(234,179,8,0.35)'
                                : '1px solid rgba(255,255,255,0.07)'
                            }}
                          >
                            {/* Status badge — top-right corner */}
                            {hasActive && (
                              <span className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
                                </span>
                                В работе
                              </span>
                            )}
                            {!hasActive && hasCompleted && !isReviewed && (
                              <span className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Выполнен
                              </span>
                            )}

                            {/* Executor header */}
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                                {executor?.avatar
                                  ? <img src={executor.avatar} alt={executor.name} className="w-full h-full object-cover" />
                                  : <User className="w-5 h-5 text-white/20" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-black text-sm truncate">{executor?.name || 'Мастер'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {executor?.city && <p className="text-white/30 text-xs">{executor.city}</p>}
                                  {rating && (
                                    <span className="flex items-center gap-1 text-yellow-400 text-xs font-black">
                                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                      {Number(rating.rating).toFixed(1)}
                                      <span className="text-white/40 font-normal">({rating.count})</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Latest order info — hide when all orders are completed */}
                            {hasActive && (
                            <div className="flex items-start gap-2 flex-wrap">
                              {latestOrder.type && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                  {TYPE_LABELS[latestOrder.type] || latestOrder.type}
                                </span>
                              )}
                              {latestOrder.description && (
                                <span className="text-white/25 text-xs">
                                  {latestOrder.description.slice(0, 50)}{latestOrder.description.length > 50 ? '...' : ''}
                                </span>
                              )}
                              {(latestOrder.from_address || latestOrder.city) && (
                                <span className="flex items-center gap-1 text-white/20 text-xs">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {latestOrder.from_address && latestOrder.to_address
                                    ? `${latestOrder.from_address} → ${latestOrder.to_address}`
                                    : latestOrder.city}
                                </span>
                              )}
                            </div>
                            )}

                            {/* Action row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Always: Phone + Chat */}
                              {executor?.phone && (
                                <button
                                  onClick={() => handleCall(executor.phone)}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:brightness-125 active:scale-90"
                                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                                >
                                  <Phone className="w-4 h-4 text-green-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenChat(firstActiveOrder)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:brightness-125 active:scale-90"
                                style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}
                              >
                                <MessageCircle className="w-4 h-4 text-yellow-500" />
                              </button>


                              {/* Completed, not reviewed yet */}
                              {hasCompleted && !isReviewed && (
                                <>
                                  <button
                                    onClick={() => {
                                      const completedOrder = execOrders.find(o => o.status === 'completed')!;
                                      setReviewModal({ order_id: completedOrder.id, executor_id: execId, executor_name: executor?.name || 'Мастер', client_name: completedOrder.client_name || '' });
                                      setReviewRating(5);
                                      setReviewText('');
                                    }}
                                    className="flex items-center gap-1.5 px-3 h-10 rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:brightness-110 active:scale-95"
                                    style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: 'rgb(234,179,8)' }}
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    Оставить отзыв
                                  </button>
                                </>
                              )}


                              {/* Отзывы — always, disabled if no reviews */}
                              <button
                                disabled={!rating || rating.count === 0}
                                onClick={async () => {
                                  if (!rating || rating.count === 0) return;
                                  setReviewsView({ execId, execName: executor?.name || 'Мастер' });
                                  setHistoryView(null);
                                  setCasesView(null);
                                  setReviewsLoading(true);
                                  const { data } = await supabase
                                    .from('reviews')
                                    .select('id, rating, comment, created_at')
                                    .eq('executor_id', execId)
                                    .order('created_at', { ascending: false });
                                  setReviewsData(data || []);
                                  setReviewsLoading(false);
                                }}
                                className="flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                                style={(!rating || rating.count === 0) ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                              >
                                <Star className="w-3 h-3" />
                                {(!rating || rating.count === 0) ? 'Отзывов нет' : 'Отзывы'}
                              </button>

                              {/* Кейсы — always */}
                              <button
                                onClick={async () => {
                                  setCasesView({ execId, execName: executor?.name || 'Мастер' });
                                  setHistoryView(null);
                                  setReviewsView(null);
                                  setCasesLoading(true);
                                  const { data } = await supabase
                                    .from('executor_portfolio')
                                    .select('id, title, photo_url, description')
                                    .eq('executor_id', execId)
                                    .order('created_at', { ascending: false });
                                  setCasesData(data || []);
                                  setCasesLoading(false);
                                }}
                                className="flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all hover:bg-white/10 active:scale-95 whitespace-nowrap"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                              >
                                Кейсы
                              </button>

                              {/* История — only when completed */}
                              {hasCompleted && (
                                <button
                                  onClick={() => { setHistoryView({ execId, execName: executor?.name || 'Мастер' }); setExpandedOrder(null); setReviewsView(null); setCasesView(null); }}
                                  className="flex items-center gap-1.5 px-2.5 h-9 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all hover:bg-white/10 active:scale-95 whitespace-nowrap"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                                >
                                  История
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── City Input Modal ─── */}
        <AnimatePresence>
          {showCityModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
              onClick={() => setShowCityModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="rounded-2xl p-6 max-w-sm w-full mx-4"
                style={{ background: '#12141E', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-white mb-4">Введите город</h3>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-medium focus:outline-none focus:border-yellow-500/50 transition-colors"
                  placeholder="Шуя"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleCitySubmit}
                    className="flex-1 px-4 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-all duration-200 active:scale-95"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setShowCityModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all duration-200 active:scale-95"
                  >
                    Отмена
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Review Modal ─── */}
        <AnimatePresence>
          {reviewModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60]"
              onClick={() => !reviewSubmitting && setReviewModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="rounded-[24px] p-8 max-w-sm w-full mx-4"
                style={{ background: '#0D0E14', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <Star className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Оставить отзыв</h3>
                  <p className="text-white/30 text-xs mt-1">Мастер: {reviewModal.executor_name}</p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-all hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${star <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'}`}
                      />
                    </button>
                  ))}
                </div>

                {/* Comment */}
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Комментарий (необязательно)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50 transition-colors resize-none placeholder:text-white/20"
                />

                {/* Submit */}
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Отправить
                  </button>
                  <button
                    onClick={() => !reviewSubmitting && setReviewModal(null)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all duration-200 active:scale-95"
                  >
                    Отмена
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Completion Notification ─── */}
        <AnimatePresence>
          {completionNotif && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] px-6 py-4 rounded-2xl bg-green-500 text-black font-black text-sm uppercase tracking-widest shadow-2xl"
            >
              <CheckCircle2 className="w-4 h-4 inline mr-2 -mt-0.5" />
              {completionNotif}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Chat Dialog ─── */}
        {chatOpen && chatData && (
          <ChatDialog
            orderId={chatData.orderId}
            participantId={chatData.participantId}
            receiverId={chatData.receiverId}
            isExecutor={false}
            participantName={chatData.participantName}
            onClose={() => { setChatOpen(false); setChatData(null); }}
          />
        )}

        {/* ══════════════════════════════════════════════
            MOBILE ONLY: tab content panels
            ══════════════════════════════════════════════ */}

        {/* ── ВАШИ МАСТЕРА TAB ── */}
        {mobileNavTab === 'masters' && (
          <div className="md:hidden relative z-10 flex flex-col" style={{ minHeight: 'calc(100dvh - 72px)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
            <div className="px-4 pt-5 pb-2 flex items-center justify-between">
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Ваши мастера</h2>
              {notifCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500 text-black text-[9px] font-black">{notifCount} новых</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
              {mastersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : executorGroups.length === 0 ? (
                <div className="text-center py-20">
                  <User className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 font-bold">У вас пока нет активных заказов</p>
                  <p className="text-white/15 text-xs mt-1">Оформите заказ, и здесь появятся мастера</p>
                </div>
              ) : executorGroups.map(({ executor, orders: execOrders }, idx) => {
                const execId = executor?.id || execOrders[0]?.accepted_by;
                const hasCompleted = execOrders.some(o => o.status === 'completed');
                const hasActive = execOrders.some(o => o.status !== 'completed');
                const isReviewed = reviewedExecutorIds.has(execId);
                const latestOrder = execOrders[0];
                const rating = executorRatings[execId];
                const firstActiveOrder = execOrders.find(o => o.status !== 'completed') || latestOrder;
                return (
                  <motion.div key={execId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                    className="rounded-2xl p-4 space-y-3 relative"
                    style={{ background: 'rgba(255,255,255,0.02)', border: hasCompleted && !isReviewed ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {hasActive && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />В работе
                      </span>
                    )}
                    <div className="flex items-center gap-3 pr-16">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                        {executor?.avatar ? <img src={executor.avatar} alt={executor.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-white/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm truncate">{executor?.name || 'Мастер'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {executor?.city && <p className="text-white/30 text-xs">{executor.city}</p>}
                          {rating && <span className="flex items-center gap-1 text-yellow-400 text-xs font-black"><Star className="w-3 h-3 fill-yellow-400" />{Number(rating.rating).toFixed(1)}<span className="text-white/30 font-normal">({rating.count})</span></span>}
                        </div>
                        {latestOrder?.type && <span className="inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">{TYPE_LABELS[latestOrder.type] || latestOrder.type}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {executor?.phone && (
                        <button onClick={() => handleCall(executor.phone)} className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <Phone className="w-4 h-4 text-green-400" />
                        </button>
                      )}
                      <button onClick={() => handleOpenChat(firstActiveOrder)} className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <MessageCircle className="w-4 h-4 text-yellow-500" />
                      </button>
                      {hasCompleted && !isReviewed && (
                        <button onClick={() => { const co = execOrders.find(o => o.status === 'completed')!; setReviewModal({ order_id: co.id, executor_id: execId, executor_name: executor?.name || 'Мастер', client_name: co.client_name || '' }); setReviewRating(5); setReviewText(''); }}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-xl font-bold text-xs uppercase active:scale-95"
                          style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: 'rgb(234,179,8)' }}>
                          <Star className="w-3 h-3" />Отзыв
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ИСТОРИЯ TAB ── */}
        {mobileNavTab === 'history' && (
          <div className="md:hidden relative z-10 flex flex-col" style={{ minHeight: 'calc(100dvh - 72px)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
            <div className="px-4 pt-5 pb-3">
              <h2 className="text-lg font-black text-white uppercase tracking-tight">История заказов</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="text-center py-20">
                  <ClipboardList className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 font-bold">История пуста</p>
                </div>
              ) : historyOrders.map((order, i) => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <button className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        {TYPE_LABELS[order.type] || order.type}
                      </span>
                      <span className="text-white/40 text-xs">{new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        order.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {order.status === 'completed' ? 'Выполнен' : order.status === 'cancelled' ? 'Отменён' : 'В процессе'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2 text-xs text-white/40">
                          {order.description && <p>{order.description}</p>}
                          {(order.from_address || order.city) && (
                            <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />
                              {order.from_address && order.to_address ? `${order.from_address} → ${order.to_address}` : order.from_address || order.city}
                            </p>
                          )}
                          {order.executor && (
                            <p className="flex items-center gap-1"><User className="w-3 h-3" />{order.executor.name}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── ПРОФИЛЬ TAB ── */}
        {mobileNavTab === 'profile' && (
          <div className="md:hidden relative z-10 flex flex-col px-4 pt-5" style={{ minHeight: 'calc(100dvh - 72px)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
            <h2 className="text-lg font-black text-white uppercase tracking-tight mb-6">Профиль</h2>
            <div className="space-y-4">
              {/* Avatar — clickable upload */}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="flex justify-center">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-3xl overflow-hidden group active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {clientAvatar ? (
                    <img src={clientAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                    {avatarUploading
                      ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                      : <Camera className="w-6 h-6 text-white" />}
                  </div>
                </button>
              </div>
              <p className="text-center text-[9px] text-white/20 -mt-2">Нажмите для загрузки фото</p>
              {/* Phone (read-only) */}
              {getClientPhone() && (
                <div className="rounded-2xl p-4 space-y-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Телефон</p>
                  <p className="text-white font-bold">{getClientPhone()}</p>
                </div>
              )}
              {/* Name */}
              <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Имя</p>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Введите ваше имя"
                  className="w-full bg-transparent text-white font-bold placeholder:text-white/15 focus:outline-none text-sm"
                />
              </div>
              {/* Bio */}
              <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">О себе</p>
                <textarea
                  value={profileBio}
                  onChange={e => setProfileBio(e.target.value)}
                  placeholder="Расскажите о себе..."
                  rows={3}
                  className="w-full bg-transparent text-white/70 text-sm font-medium placeholder:text-white/15 focus:outline-none resize-none"
                />
              </div>
              {/* Save button */}
              <button onClick={handleSaveProfile} disabled={isSavingProfile}
                className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: profileSaved ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', border: profileSaved ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(234,179,8,0.3)', color: profileSaved ? 'rgb(34,197,94)' : 'rgb(234,179,8)' }}
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : profileSaved ? <><CheckCircle2 className="w-4 h-4" />Сохранено</> : <><Save className="w-4 h-4" />Сохранить</>}
              </button>
              {/* Role switch */}
              <button onClick={() => router.push('/select-role')}
                className="w-full py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest text-white/30 border border-white/5 active:scale-[0.98] transition-all"
              >
                <Settings className="w-3.5 h-3.5 inline mr-2 -mt-0.5" />Сменить роль
              </button>
            </div>
          </div>
        )}

        {/* ══ MOBILE BOTTOM NAV ══ */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center" style={{
          background: 'rgba(8,9,14,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          height: 'calc(72px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {([
            { id: 'home',    icon: LayoutGrid,   label: 'Заказать' },
            { id: 'masters', icon: Users,         label: 'Мастера',  badge: notifCount },
            { id: 'history', icon: ClipboardList, label: 'История' },
            { id: 'profile', icon: User,          label: 'Профиль' },
          ] as const).map(tab => {
            const Icon = tab.icon;
            const isActive = mobileNavTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => {
                  try { navigator.vibrate(15); } catch(e) {}
                  setMobileNavTab(tab.id);
                }}
                className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative transition-all"
              >
                {(tab as any).badge > 0 && (
                  <span className="absolute top-3 right-[calc(50%-16px)] w-4 h-4 rounded-full bg-green-500 text-black text-[8px] font-black flex items-center justify-center">
                    {(tab as any).badge}
                  </span>
                )}
                <Icon className={`w-5 h-5 transition-all ${isActive ? 'text-yellow-500' : 'text-white/25'}`} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[9px] font-black uppercase tracking-wide transition-all ${isActive ? 'text-yellow-500' : 'text-white/25'}`}>{tab.label}</span>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-yellow-500" />}
              </button>
            );
          })}
        </div>

      </div>
    </AuthGuard>
  );
}
