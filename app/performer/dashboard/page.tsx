'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  Power, Wallet, ClipboardList, MapPin, Phone, CheckCircle, CheckCircle2, 
  ShieldCheck, Star, Trash2, User, Edit, Camera, Plus, Save, 
  X as CloseIcon, Eye, EyeOff, Image as ImageIcon, Settings, 
  AlertCircle, Clock, Calendar, MessageSquare, Loader2, Send, RefreshCw, LogOut
} from 'lucide-react';
import { cn, formatPrice } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ChatDialog from '../../../components/ChatDialog';
import ChatList from '../../../components/ChatList';
import ContactUnlockedModal from '../../../components/ContactUnlockedModal';

interface Order {
  id: string;
  description: string;
  type: string;
  from_address: string;
  to_address: string;
  price_estimate: number;
  city: string;
  status: string;
  user_id: string;
  accepted_by?: string;
  created_at: string;
  date?: string;
  time?: string;
  phone?: string;
  client_name?: string;
  comment?: string;
  movers_count?: number;
  details?: any;
  price_type?: string;
  myBid?: number;
  bidStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  users?: {
    phone: string;
  };
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={cn(
      "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300",
      type === 'success' && "bg-yellow-500 text-black",
      type === 'error' && "bg-red-500 text-white",
      type === 'info' && "bg-yellow-500 text-black"
    )}>
      {message}
    </div>
  );
}

export default function ExecutorDashboard() {
  const router = useRouter();
  const [executor, setExecutor] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [services, setServices] = useState<any>({ loaders: true, gazelle: true, furniture: true, rigging: false });
  const [biddingOrder, setBiddingOrder] = useState<Order | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidOptions, setBidOptions] = useState<any>({
    min2h: true,
    gazelle: false,
    noExtra: true,
    urgent: false,
    careful: true
  });
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [lastBidTime, setLastBidTime] = useState(0); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', photo: '', description: '' });
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [matchedOffer, setMatchedOffer] = useState<any | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSavingServices, setIsSavingServices] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  
  // Live dashboard stats
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [liveEvent, setLiveEvent] = useState<{type: 'order'|'nearby'|'scanning', title?: string, price?: number, description?: string} | null>(null);
  const [showLiveCard, setShowLiveCard] = useState(false);
  const liveEventTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ordersChannelRef = useRef<any>(null);
  
  // Archive and Details states
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isInWorkOpen, setIsInWorkOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Profile edit states
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPassport, setEditPassport] = useState('');
  const [editSelfie, setEditSelfie] = useState('');
  const editPassportRef = useRef<HTMLInputElement>(null);
  const editSelfieRef = useRef<HTMLInputElement>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedIndicator, setProfileSavedIndicator] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const profileAutoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const [balanceAnimation, setBalanceAnimation] = useState(false);
  const [mobileTab, setMobileTab] = useState<'orders' | 'balance' | 'profile'>('orders');
  const [activeOrderTab, setActiveOrderTab] = useState<'active' | 'working' | 'archive'>('active');
  const [swipeX, setSwipeX] = useState(0);
  const swipeStartRef = useRef(0);
  const isDraggingRef = useRef(false);
  const swipeTrackRef = useRef<HTMLDivElement>(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatDetails, setChatDetails] = useState<any>(null);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [contactModalData, setContactModalData] = useState<any>(null);
  
  const handleLogout = () => {
    localStorage.removeItem('executor_id');
    localStorage.removeItem('role');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_id');
    localStorage.removeItem('pending_role');
    localStorage.removeItem('user_city');
    localStorage.removeItem('selected_city');
    router.push('/');
  };

  // Rating and Reviews state
  const [executorRating, setExecutorRating] = useState<{ rating: number | null; reviews_count: number }>({ rating: null, reviews_count: 0 });
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [unreadReviewsCount, setUnreadReviewsCount] = useState(0);

  // Verification & Trust
  const [trustScore, setTrustScore] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<string>('unverified');
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const verifyPassportRef = useRef<HTMLInputElement>(null);
  const verifySelfieRef = useRef<HTMLInputElement>(null);
  const [verifyPassport, setVerifyPassport] = useState('');
  const [verifySelfie, setVerifySelfie] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Complete order + case creation modal
  const [completeOrderTarget, setCompleteOrderTarget] = useState<Order | null>(null);
  const [caseForm, setCaseForm] = useState({ title: '', photo: '', description: '' });
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);
  const casePhotoInputRef = useRef<HTMLInputElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!executor?.id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', executor.id)
        .in('status', ['sent', 'delivered']);
      setUnreadCount(count || 0);
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);

    const channel = supabase.channel(`executor-messages-${executor.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${executor.id}` }, (payload) => {
        setUnreadCount(prev => prev + 1);
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch(e) {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${executor.id}` }, () => {
         fetchUnread();
      })
      .subscribe();

    return () => { 
      clearInterval(interval);
      supabase.removeChannel(channel); 
    };
  }, [executor?.id, isChatListOpen]);

  // Realtime subscription for new reviews
  useEffect(() => {
    if (!executor?.id) return;

    const reviewsChannel = supabase
      .channel(`executor-reviews-${executor.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'reviews', 
        filter: `executor_id=eq.${executor.id}` 
      }, async (payload) => {
        // Fetch updated rating
        const { data: ratingData } = await supabase
          .from('executor_rating')
          .select('rating, reviews_count')
          .eq('executor_id', executor.id)
          .maybeSingle();
        
        if (ratingData) {
          setExecutorRating({
            rating: ratingData.rating,
            reviews_count: ratingData.reviews_count
          });
        }

        // Add new review to list
        const newReview = payload.new;
        const { data: clientData } = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', newReview.client_id)
          .maybeSingle();
        
        setReviews(prev => [{
          ...newReview,
          client_name: clientData?.name || 'Заказчик'
        }, ...prev]);

        // Show notification toast
        showToast(`Новая оценка: ${newReview.rating} ⭐`, 'success');
        
        // Increment unread counter if modal is not open
        if (!isReviewsOpen) {
          setUnreadReviewsCount(prev => prev + 1);
        }

        // Play notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch(e) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
    };
  }, [executor?.id, isReviewsOpen]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    let formatted = "";
    const firstDigit = digits[0];
    if (firstDigit === "8" || firstDigit === "7") {
      formatted = "+7 ";
    } else {
      formatted = "+7 " + firstDigit;
    }
    if (digits.length > 1) {
      const remaining = firstDigit === "8" || firstDigit === "7" ? digits.substring(1) : digits;
      if (remaining.length > 0) formatted += "(" + remaining.substring(0, 3);
      if (remaining.length > 3) formatted += ") " + remaining.substring(3, 6);
      if (remaining.length > 6) formatted += "-" + remaining.substring(6, 8);
      if (remaining.length > 8) formatted += "-" + remaining.substring(8, 10);
    }
    return formatted.trim().substring(0, 18);
  };

  const normalizePhone = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = "7" + digits.substring(1);
    if (digits.length === 10) digits = "7" + digits;
    return digits;
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // Calculate today's stats from orders
  const calculateTodayStats = useCallback(async () => {
    if (!executor) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Today's orders count
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .ilike('city', executor.city || '%');
    setTodayOrdersCount(count || 0);
    
    // Today's earnings from completed orders
    const { data: completed } = await supabase
      .from('orders')
      .select('price_estimate')
      .eq('status', 'completed')
      .eq('accepted_by', executor.id)
      .gte('updated_at', today);
    const earned = (completed || []).reduce((sum, o) => sum + (o.price_estimate || 0), 0);
    setTodayEarnings(earned);
  }, [executor]);

  useEffect(() => {
    const executorId = typeof window !== 'undefined' ? localStorage.getItem('executor_id') : null;
    if (!executorId) { router.push('/performer/auth'); return; }

    setLoadError(null);

    // Timeout guard: if executor doesn't load within 12s, show error state
    const loadTimeout = setTimeout(() => {
      setLoadError('Превышено время ожидания. Проверьте соединение.');
    }, 12000);

    async function fetchExecutor() {
      try {
      // 1. Fetch main executor data with all columns (*) to avoid missing column errors
      const { data: execData, error: execError } = await supabase
        .from('executors')
        .select('*')
        .eq('id', executorId)
        .single();
      
      if (execError || !execData) {
        if (execError?.code === 'PGRST116' || execError?.code === '22P02') {
          clearTimeout(loadTimeout);
          localStorage.removeItem('executor_id');
          router.push('/performer/auth');
        } else {
          setLoadError(execError?.message || 'Не удалось загрузить профиль');
        }
        return;
      }
      clearTimeout(loadTimeout);

      // 2. Fetch verification documents from separate table if missing in main table
      const { data: docsData } = await supabase
        .from('verification_documents')
        .select('passport_url, selfie_url')
        .eq('user_id', executorId)
        .maybeSingle();

      if (docsData) {
        execData.passport_photo = execData.passport_photo || docsData.passport_url;
        execData.selfie_photo = execData.selfie_photo || docsData.selfie_url;
      }
      
      setExecutor(execData);
      
      // Fetch real rating from executor_rating view
      const { data: ratingData } = await supabase
        .from('executor_rating')
        .select('rating, reviews_count')
        .eq('executor_id', execData.id)
        .maybeSingle();
      
      if (ratingData) {
        setExecutorRating({
          rating: ratingData.rating,
          reviews_count: ratingData.reviews_count
        });
      }
      
      // Fetch reviews list
      const { data: reviewsRaw } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, client_id, client_name, order_id')
        .eq('executor_id', execData.id)
        .order('created_at', { ascending: false });
      
      // Enrich with client names — use stored client_name first, then orders, then users
      const enrichedReviews = await Promise.all((reviewsRaw || []).map(async (r) => {
        if (r.client_name) return r;
        if (r.order_id) {
          const { data: orderData } = await supabase.from('orders').select('client_name').eq('id', r.order_id).maybeSingle();
          if (orderData?.client_name) return { ...r, client_name: orderData.client_name };
        }
        const { data: userData } = await supabase.from('users').select('name').eq('id', r.client_id).maybeSingle();
        return { ...r, client_name: userData?.name || 'Заказчик' };
      }));
      
      setReviews(enrichedReviews);
      
      // Fetch verification status & trust score
      setVerificationStatus(execData.verification_status || 'unverified');
      
      // Calculate trust score client-side
      const rVal = ratingData?.rating || 0;
      const rCount = ratingData?.reviews_count || 0;
      const isVerified = execData.verification_status === 'verified';
      const hasPort = !!(await supabase.from('executor_portfolio').select('id').eq('executor_id', execData.id).limit(1)).data?.length;
      const ts = Math.round(
        (Math.min(rVal, 5) / 5 * 40) +
        (isVerified ? 30 : 0) +
        (Math.min(rCount, 10) / 10 * 20) +
        (hasPort ? 10 : 0)
      );
      setTrustScore(ts);
      console.log('>>> [AUTH DEBUG] Executor ID:', execData.id);
      console.log('>>> [AUTH DEBUG] Services Active:', execData.services);
      
      setExecutor(execData);

      // Restore online status from localStorage (soft restore after page reload)
      const storedOnline = localStorage.getItem(`executor_online_${execData.id}`) === 'true';
      const canRestoreOnline = isApproved(execData.status);
      if (storedOnline && canRestoreOnline) {
        setIsOnline(true);
        setOnlineInDB(execData.id, true).catch(() => {});
      } else {
        setIsOnline(false);
      }

      if (execData.services) {
        if (Array.isArray(execData.services)) {
            const srvObj: any = { loaders: false, gazelle: false, furniture: false, rigging: false };
            execData.services.forEach((k: string) => srvObj[k] = true);
            setServices(srvObj);
        } else {
            setServices(execData.services);
        }
      }
      const { data: portData } = await supabase.from('executor_portfolio').select('id, title, description, photo_url, is_visible, created_at, order_id').eq('executor_id', execData.id).order('created_at', { ascending: false });
      setPortfolio(portData || []);
      
      // Calculate today's stats - moved to separate useEffect to avoid loops
      } catch (err: any) {
        clearTimeout(loadTimeout);
        setLoadError(err?.message || 'Ошибка загрузки профиля');
        console.error('[fetchExecutor] exception:', err);
      }
    }
    fetchExecutor();
    return () => clearTimeout(loadTimeout);
  }, [router, fetchKey]); 


  // Separate effect for statistics
  useEffect(() => {
    if (executor?.id) {
      calculateTodayStats();
    }
  }, [executor?.id, calculateTodayStats]);

  // Sync edit states ONLY ONCE when the profile modal is opened
  const lastOpenRef = useRef(false);
  useEffect(() => {
    // We already moved the initialization to openProfile()
    // This effect now only tracks the ref
    lastOpenRef.current = isProfileOpen;
  }, [isProfileOpen]);

  const openProfile = () => {
    if (!executor) return;
    setEditName(executor.name || '');
    setEditPhone(formatPhoneNumber(executor.phone || ''));
    setEditCity(executor.city || '');
    setEditAvatar(executor.avatar || '');
    setEditBio(executor.description || '');
    setEditPassport(executor.passport_photo || '');
    setEditSelfie(executor.selfie_photo || '');
    setVerificationStatus(executor.verification_status || 'unverified');
    setIsProfileOpen(true);
  };

  // ─── PRESENCE: DB online_status + last_seen heartbeat ───
  const heartbeatRef = useRef<any>(null);
  const isOnlineRef = useRef(false);

  const setOnlineInDB = async (execId: string, online: boolean) => {
    await supabase
      .from('executors')
      .update({
        online_status: online ? 'online' : 'offline',
        last_seen: online ? new Date().toISOString() : null,
      })
      .eq('id', execId);
  };

  // Heartbeat: update last_seen every 10s while online
  useEffect(() => {
    if (!executor?.id) return;
    if (isOnline) {
      isOnlineRef.current = true;
      heartbeatRef.current = setInterval(async () => {
        await supabase
          .from('executors')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', executor.id);
      }, 10000);
    } else {
      isOnlineRef.current = false;
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    }
    return () => { if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; } };
  }, [isOnline, executor?.id]);

  // Restore last_seen when tab becomes visible (switching tabs won't kill online)
  // Primary offline mechanism = heartbeat stops → last_seen expires after 30s
  useEffect(() => {
    if (!executor?.id) return;
    const handleVisibilityChange = async () => {
      // ONLY restore last_seen when becoming visible again — never go offline on hide
      if (!document.hidden && isOnlineRef.current) {
        await supabase
          .from('executors')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', executor.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [executor?.id]);

  // Track seen order IDs during this session to avoid repeated notifications/sounds
  const seenOrderIds = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!executor?.id || !isOnline) return;
    const t0 = performance.now();
    
    // 1. Buffer for clock skew
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    
    // 2. Parallel fetch for speed
    const [assignmentsRes, myOffersRes] = await Promise.all([
      supabase.from('executor_orders')
        .select('order_id, created_at')
        .eq('executor_id', executor.id)
        .eq('status', 'new')
        .gte('created_at', fiveMinsAgo),
      supabase.from('offers')
        .select('id, order_id, executor_id, status, price, comment')
        .eq('executor_id', executor.id)
    ]);

    const assignments = assignmentsRes.data;
    const myOffers = myOffersRes.data;
    const offerMap = new Map((myOffers || []).map(o => [o.order_id, o]));
    
    // 3. Merge IDs to fetch full order data
    const visibleOrderIds = Array.from(new Set([
      ...(assignments || []).map(a => a.order_id),
      ...(myOffers || []).map(o => o.order_id)
    ]));

    let cityOrdersRaw: any[] = [];
    if (visibleOrderIds.length > 0) {
      const { data: fetchedOrders, error } = await supabase.from('orders')
        .select('*')
        .in('id', visibleOrderIds)
        .eq('status', 'searching')
        .order('created_at', { ascending: false });
      
      if (error) {
          showToast('Ошибка загрузки заявок', 'error');
          return;
      }
      cityOrdersRaw = fetchedOrders || [];
    }
    
    // 4. Filter active orders based on selected services
    const cityOrders = cityOrdersRaw.filter(o => {
        if (o.type === 'Такелаж' && !services.rigging) return false;
        return true;
    });

    const final = cityOrders.map(order => {
      const myOffer = offerMap.get(order.id);
      return {
        ...order,
        myBid: myOffer?.price || undefined,
        bidStatus: myOffer ? myOffer.status : 'none'
      };
    });

    setOrders(final);

    // 5. ROBUST "NEW ORDER" DETECTION 
    const nowMs = Date.now();
    const YANDEX_EXPIRY = 25000;
    
    const relevantForNotification = final.filter(o => {
      const assignment = (assignments || []).find(a => a.order_id === o.id);
      if (!assignment) return false; 
      
      let dStr = assignment.created_at;
      if (!dStr.endsWith('Z') && !dStr.includes('+')) dStr += 'Z';
      const createdMs = new Date(dStr).getTime();
      
      (o as any).dispatched_at = createdMs;
      
      const age = nowMs - createdMs;
      return age < YANDEX_EXPIRY && age > -10000;
    });

    if (relevantForNotification.length > 0) {
      setRecentOrders(prev => {
        const trulyNewToNotify = relevantForNotification.filter(o => !seenOrderIds.current.has(o.id));
        trulyNewToNotify.forEach(o => seenOrderIds.current.add(o.id));

        if (trulyNewToNotify.length > 0) {
          try { 
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); 
          } catch(e) {}
          showToast(`Новые заказы: ${trulyNewToNotify.length}`, 'success');
        }

        // Return current relevant assignments
        return relevantForNotification;
      });
    } else {
      setRecentOrders([]);
    }

    // 4. Fetch active (accepted/confirmed) orders
    const { data: activeData } = await supabase.from('orders')
      .select('*')
      .or('status.eq.accepted,status.eq.matched,status.eq.contact_purchased')
      .eq('accepted_by', executor.id);
    setActiveOrders((activeData as any) || []);

    // 5. PERSISTENCE: Fetch matched (pending confirmation) offer if exists
    const { data: pendingOffer } = await supabase.from('offers')
      .select('*, orders(*)')
      .eq('executor_id', executor.id)
      .eq('status', 'accepted')
      .eq('contact_unlocked', false)
      .maybeSingle();
    
    if (pendingOffer && !contactModalData) setMatchedOffer(pendingOffer as any);

    // 6. Archived orders fetch (optimized)
    const allArchivedIds = new Set<string>();
    (myOffers || [])
        .filter(off => ['rejected', 'completed', 'expired'].includes(off.status))
        .map(off => off.order_id)
        .forEach(id => allArchivedIds.add(id));

    const { data: completedOrders } = await supabase.from('orders')
      .select('id')
      .eq('accepted_by', executor.id)
      .eq('status', 'completed');
    (completedOrders || []).forEach(o => allArchivedIds.add(o.id));
    
    if (allArchivedIds.size > 0) {
      const { data: archOrders } = await supabase.from('orders')
        .select('id, type, description, city, from_address, to_address, date, time, price_estimate, price_type, status, user_id, accepted_by, created_at, client_name, phone, comment')
        .in('id', Array.from(allArchivedIds))
        .order('created_at', { ascending: false });
      setArchivedOrders(archOrders || []);
    } else {
      setArchivedOrders([]);
    }
    console.log(`[PERF] fetchOrders took ${(performance.now() - t0).toFixed(0)}ms`);
  }, [executor?.id, executor?.city, isOnline, showToast, services.rigging]);


  useEffect(() => {
    fetchOrders();
    // Fallback poll every 60s
    const interval = setInterval(fetchOrders, 60000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Local Yandex.Taxi expiry loop: automatically hide orders 25s after dispatch
  useEffect(() => {
    const expiryInterval = setInterval(() => {
      setTick(t => t + 1); // Trigger re-render for UI timers
      const now = Date.now();
      const YANDEX_EXPIRY = 25000;
      setRecentOrders(prev => {
        const next = prev.filter(o => {
          const dispatchedMs = (o as any).dispatched_at || new Date(o.created_at).getTime();
          return now - dispatchedMs < YANDEX_EXPIRY;
        });
        return next.length !== prev.length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(expiryInterval);
  }, []);

  // Real-time subscription for specifically assigned orders (Yandex Taxi style)
  useEffect(() => {
    if (!isOnline || !executor?.id) return;

    const channel = supabase.channel(`executor-dispatch-${executor.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'executor_orders', 
        filter: `executor_id=eq.${executor.id}` 
      }, async (payload) => {
        console.log('>>> [REALTIME] New dispatch received!', payload.new);
        
        // Fetch the full order data for this dispatch
        const { data: newOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('id', payload.new.order_id)
          .single();

        if (newOrder && newOrder.status === 'searching') {
          // Filter out locally if service is disabled
          if (newOrder.type === 'Такелаж' && !services.rigging) return;

          // Sound notification (moved to continuous loop effect, but play first one here)
          try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch(e) {}
          vibrate([50, 100, 50]);
          showToast('Новый заказ назначен вам!', 'success');
          
          // FAST-TRACK UI Update: Add to recent list immediately
          const decoratedOrder = { 
            ...newOrder, 
            dispatched_at: new Date(payload.new.created_at).getTime(),
            bidStatus: 'none'
          };
          
          setRecentOrders(prev => {
            if (prev.find(x => x.id === decoratedOrder.id)) return prev;
            return [decoratedOrder, ...prev];
          });
          
          seenOrderIds.current.add(newOrder.id);
          
          // Trigger glow animation on radar
          setShowLiveCard(true);
          setLiveEvent({ type: 'order', title: `📍 ${newOrder.type || 'Заказ'}`, price: newOrder.price_estimate, description: newOrder.from_address });
          setTimeout(() => setShowLiveCard(false), 4000);
        }
        
        // Background refresh for everything else (chats, offers, archived)
        fetchOrders();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'offers',
        filter: `executor_id=eq.${executor.id}`
      }, async (payload: any) => {
        if (payload.new.status === 'accepted' && !payload.new.contact_unlocked) {
          showToast('Ваше предложение принято!', 'success');
          setActiveOrderTab('working');
          const { data: fullOffer } = await supabase.from('offers').select('id, order_id, executor_id, price, status, contact_unlocked, created_at, orders(id, type, description, city, from_address, to_address, price_estimate, status, user_id, details)').eq('id', payload.new.id).single();
          if (fullOffer && !(fullOffer as any).contact_unlocked) setMatchedOffer(fullOffer as any);
        }
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOnline, executor?.id, fetchOrders, showToast, services.rigging]);

  // Real-time: watch admin approval of executor's own profile
  useEffect(() => {
    if (!executor?.id) return;

    const approvalChannel = supabase.channel(`executor-approval-${executor.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'executors',
        filter: `id=eq.${executor.id}`,
      }, (payload: any) => {
        const updated = payload.new;
        setExecutor((prev: any) => {
          const wasApproved = isApproved(prev?.status);
          if (isApproved(updated.status) && !wasApproved) {
            showToast('🎉 Профиль одобрен! Можно выходить на линию', 'success');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
          }
          return { ...prev, ...updated };
        });
        if (updated.verification_status) setVerificationStatus(updated.verification_status);
      })
      .subscribe();

    return () => { supabase.removeChannel(approvalChannel); };
  }, [executor?.id, showToast]);

  // CONTINUOUS NOTIFICATION LOOP (Yandex Style)
  useEffect(() => {
    if (recentOrders.length === 0 || !isOnline) return;
    
    const playAlert = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch(e) {}
    };

    playAlert(); // Immediate
    const interval = setInterval(playAlert, 3000); // Every 3 seconds
    
    return () => clearInterval(interval);
  }, [recentOrders.length, isOnline]);

  const isApproved = (status?: string) => status === 'active' || status === 'approved';

  const toggleOnline = async () => {
    if (!executor) return;
    if (!isApproved(executor.status)) {
      showToast('Дождитесь одобрения профиля администратором', 'error');
      return;
    }
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    localStorage.setItem(`executor_online_${executor.id}`, String(newStatus));
    await setOnlineInDB(executor.id, newStatus);
  };

  // Pseudo-live events - creates feeling of activity
  useEffect(() => {
    if (!isOnline || !executor) return;
    
    const pseudoEvents = [
      { type: 'scanning' as const, title: 'Сканирование города...' },
      { type: 'nearby' as const, title: '🔔 Новый заказ поблизости', description: 'Ищем заявки рядом с вами' },
      { type: 'order' as const, title: '📦 Переезд • 2 грузчика • 1500 ₽', price: 1500, description: 'Шуя, Центр' },
      { type: 'nearby' as const, title: '💡 Совет дня', description: 'Отвечайте быстрее — получайте больше заказов' },
    ];
    
    const scheduleEvent = () => {
      const delay = 5000 + Math.random() * 5000; // 5-10 seconds
      liveEventTimerRef.current = setTimeout(() => {
        const event = pseudoEvents[Math.floor(Math.random() * pseudoEvents.length)];
        setLiveEvent(event);
        setShowLiveCard(true);
        
        // Hide after 3-4 seconds
        setTimeout(() => setShowLiveCard(false), 3500);
        
        // Schedule next
        scheduleEvent();
      }, delay);
    };
    
    scheduleEvent();
    
    return () => {
      if (liveEventTimerRef.current) clearTimeout(liveEventTimerRef.current);
    };
  }, [isOnline, executor]);

  // Vibration feedback helper
  const vibrate = (pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const submitBid = async () => {
    if (!executor || !biddingOrder || !bidPrice) return;
    
    setIsSubmittingBid(true);
    const price = parseInt(bidPrice.replace(/\s/g, ''), 10);
    const { error } = await supabase.from('offers').upsert({
      order_id: biddingOrder.id, executor_id: executor.id, price, options: bidOptions, status: 'pending'
    }, { onConflict: 'order_id,executor_id' });

    if (error) { showToast('Ошибка: ' + error.message, 'error'); } 
    else {
      showToast('Предложение отправлено!', 'success');
      await supabase.from('orders').update({ status: 'offer_received' }).eq('id', biddingOrder.id);
      await supabase.from('executor_orders').update({ status: 'accepted' }).eq('order_id', biddingOrder.id).eq('executor_id', executor.id);
    }
    setBiddingOrder(null);
    setIsSubmittingBid(false);
    fetchOrders();
  };

  const handleSwipeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    swipeStartRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleSwipeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const track = swipeTrackRef.current;
    if (!track) return;
    const thumbSize = track.offsetHeight - 12;
    const maxX = track.offsetWidth - thumbSize - 12;
    const delta = e.clientX - swipeStartRef.current;
    setSwipeX(Math.max(0, Math.min(delta, maxX)));
  };
  const handleSwipeEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const track = swipeTrackRef.current;
    if (track) {
      const thumbSize = track.offsetHeight - 12;
      const maxX = track.offsetWidth - thumbSize - 12;
      if (swipeX >= maxX * 0.72) {
        toggleOnline();
        try { navigator.vibrate(50); } catch(e) {}
      }
    }
    setSwipeX(0);
  };

  function getContactPrice(type?: string, details?: any): number {
    if (type === 'Переезд') {
      return details?.vehicleType === 'Газель' ? 149 : 99;
    }
    switch (type) {
      case 'Грузчики': return 99;
      case 'Газель': return 99;
      case 'Газель Межгород': return 99;
      case 'Грузчики + Газель': return 149;
      case 'Такелаж': return 199;
      case 'Сборка': return 149;
      case 'Сборка мебели': return 149;
      default: return 99;
    }
  }

  const declineMatchedOffer = async () => {
    if (!matchedOffer) { setMatchedOffer(null); return; }
    await Promise.all([
      supabase.from('offers').update({ status: 'rejected' }).eq('id', matchedOffer.id),
      supabase.from('orders').update({ status: 'searching', accepted_by: null }).eq('id', matchedOffer.order_id),
    ]);
    setRecentOrders(prev => prev.filter(o => o.id !== matchedOffer.order_id));
    setActiveOrders(prev => prev.filter(o => o.id !== matchedOffer.order_id));
    setMatchedOffer(null);
    showToast('Заказ отклонён', 'info');
  };

  const handleReject = async (orderId: string) => {
    if (!confirm('Вы уверены?')) return;
    await supabase.from('executor_orders').update({ status: 'rejected' }).eq('order_id', orderId).eq('executor_id', executor.id);
    fetchOrders();
  };

  const unlockContact = async () => {
    if (!executor || !matchedOffer) return;
    
    console.log(">>> [UNLOCK] Starting process for offer:", matchedOffer.id);
    
    // Support both 'orders' and 'order' keys (Supabase join variations)
    let orderData = (matchedOffer as any).orders || (matchedOffer as any).order;
    
    if (Array.isArray(orderData)) {
      orderData = orderData[0];
    }
    
    if (!orderData && matchedOffer.order_id) {
       console.log(">>> [UNLOCK] Order data missing in join, fetching directly for ID:", matchedOffer.order_id);
       const { data: directOrder } = await supabase.from('orders').select('id, type, description, city, from_address, to_address, date, time, price_estimate, price_type, status, user_id, accepted_by, created_at, client_name, phone, comment').eq('id', matchedOffer.order_id).single();
       if (directOrder) orderData = directOrder;
    }
    
    let customerId = orderData?.user_id;
    console.log(">>> [UNLOCK] Data Context:", { 
      hasOrder: !!orderData, 
      orderId: matchedOffer.order_id,
      customerId,
      orderPhone: orderData?.phone
    });
    
    // If no user_id on order (anonymous orders), resolve from phone
    if (!customerId && orderData?.phone) {
      const normalizedPhone = orderData.phone.replace(/\D/g, '');
      console.log(">>> [UNLOCK] user_id missing, resolving from phone:", orderData.phone, "normalized:", normalizedPhone);
      
      // Step 1: Try to find existing user by BOTH phone formats
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .in('phone', [orderData.phone, normalizedPhone])
        .limit(1);
      
      if (existingUsers && existingUsers.length > 0) {
        customerId = existingUsers[0].id;
        console.log(">>> [UNLOCK] Found existing user:", customerId);
      } else {
        // Step 2: Create with normalized phone
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({ phone: normalizedPhone, role: 'client' })
          .select('id')
          .single();
        
        if (newUser) {
          customerId = newUser.id;
          console.log(">>> [UNLOCK] Created new user:", customerId);
        } else if (userError?.code === '23505') {
          // Step 3: Race condition — fetch the user that was just created
          console.log(">>> [UNLOCK] Duplicate detected, fetching existing user");
          const { data: raceUsers } = await supabase
            .from('users')
            .select('id')
            .in('phone', [orderData.phone, normalizedPhone])
            .limit(1);
          if (raceUsers && raceUsers.length > 0) {
            customerId = raceUsers[0].id;
          }
        } else {
          console.error(">>> [UNLOCK] Failed to create user:", userError);
        }
      }
      
      console.log(">>> [UNLOCK] Resolved customerId:", customerId);
      
      // Update order with resolved user_id for future lookups
      if (customerId) {
        await supabase.from('orders').update({ user_id: customerId }).eq('id', matchedOffer.order_id);
        console.log(">>> [UNLOCK] Updated order with user_id:", customerId);
      }
    }
    
    if (!orderData || !customerId) {
      console.error(">>> [UNLOCK ERROR] Missing critical data:", { matchedOffer, orderData, customerId });
      showToast('Ошибка данных: обратитесь в поддержку', 'error');
      return;
    }

    // Resolve primary data from order
    const clientPhone = orderData?.phone;
    const clientNameRaw = orderData?.client_name || orderData?.name || 'Клиент';

    if (!clientPhone) {
      console.error(">>> [UNLOCK ERROR] NO PHONE - BLOCK CONTACT CREATION");
      showToast('Ошибка: у заказа отсутствует номер телефона', 'error');
      return;
    }

    const contactPrice = getContactPrice(orderData?.type, orderData?.details);
    const newBalance = executor.balance - contactPrice;
    const { error: balError } = await supabase.from('executors').update({ balance: newBalance }).eq('id', executor.id);
    if (balError) { 
      showToast(`Ошибка баланса (нужно ${contactPrice} ₽)`, 'error'); 
      return; 
    }
    setExecutor({ ...executor, balance: newBalance });
    
    // 1. Update order status permanently
    const { error: orderUpdateError } = await supabase.from('orders').update({ 
      status: 'contact_purchased', 
      accepted_by: executor.id
    }).eq('id', matchedOffer.order_id);

    if (orderUpdateError) {
      console.error(">>> [UNLOCK ERROR] Failed to update order status:", orderUpdateError);
      await supabase.from('executors').update({ balance: executor.balance }).eq('id', executor.id);
      setExecutor({ ...executor, balance: executor.balance });
      showToast('Ошибка при обновлении заказа', 'error');
      return;
    }

    // Create contact immediately - REMOVED: Contacts only created after purchase by executor
    // (This ensures full client data persistence in the contacts table)
    const clientId = localStorage.getItem('client_user_id');
    console.log('[STAGE] Matched, waiting for executor to unlock');

    const [, chatResult] = await Promise.all([
      supabase.from('offers').update({ contact_unlocked: true }).eq('id', matchedOffer.id),
      supabase.from('chats').select('id')
        .or(`and(user_1.eq.${executor.id},user_2.eq.${customerId}),and(user_1.eq.${customerId},user_2.eq.${executor.id})`)
        .limit(1),
      supabase.from('contacts').upsert({
        client_id: customerId,
        executor_id: executor.id,
        order_id: matchedOffer.order_id,
        client_phone: clientPhone,
        client_name: clientNameRaw
      }, { onConflict: 'client_id,executor_id' })
    ]);

    let cid = chatResult.data?.[0]?.id;
    if (!cid) {
      const { data: newChat } = await supabase.from('chats').insert({ user_1: executor.id, user_2: customerId, last_message: 'Контакт открыт' }).select('id').single();
      cid = newChat?.id;
    }
    
    if (cid) {
      // Run participants + message insert in parallel
      await Promise.all([
        supabase.from('chat_participants').upsert([
          { chat_id: cid, user_id: executor.id, last_read_at: new Date().toISOString() },
          { chat_id: cid, user_id: customerId, last_read_at: new Date().toISOString() }
        ], { onConflict: 'chat_id,user_id' }),
        supabase.from('messages').insert({ 
          chat_id: cid, 
          sender_id: executor.id, 
          receiver_id: customerId,
          text: '💡 Контакт открыт. Вы можете начать общение.',
          type: 'text',
          status: 'sent'
        })
      ]);
    }

    // Resolve client name from multiple sources
    let clientName = orderData?.client_name || '';
    if (!clientName && orderData?.description) {
      // Extract name from description (format: "Имя: Иван Иванов\n...")
      const nameMatch = orderData.description.match(/^Имя:\s*(.+?)(\n|$)/);
      if (nameMatch) clientName = nameMatch[1].trim();
    }
    if (!clientName && customerId) {
      // Try fetching from users table
      const { data: userData } = await supabase.from('users').select('name').eq('id', customerId).maybeSingle();
      if (userData?.name) clientName = userData.name;
    }

    // Show contact modal instead of auto-opening chat
    setContactModalData({
      chatId: cid,
      receiverId: customerId,
      orderId: matchedOffer.order_id,
      executor: {
        id: customerId,
        name: clientName || 'Заказчик',
        phone: orderData?.phone || '',
        rating: 0,
        reviews: 0,
        completed_orders: 0,
        cases: [],
        avatar: null
      }
    });
    setMatchedOffer(null);
    showToast('Контакт открыт!', 'success');
    fetchOrders();
  };

  const toggleService = async (key: string) => {
    const ns = { ...services, [key]: !services[key] };
    const srvArr = Object.keys(ns).filter(k => ns[k]);
    await supabase.from('executors').update({ services: srvArr }).eq('id', executor.id);
    setServices(ns);
  };

  const archiveOrder = async (id: string) => {
    await supabase.from('orders').update({ status: 'closed' }).eq('id', id);
    fetchOrders();
  };

  const handleCasePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Файл слишком большой. Макс 5МБ', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setCaseForm(prev => ({ ...prev, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const completeOrderWithCase = async () => {
    if (!completeOrderTarget || !executor) return;
    setIsCompletingOrder(true);
    try {
      const title = caseForm.title || completeOrderTarget.description || 'Выполненный заказ';
      const description = caseForm.description || '';
      const photoUrl = caseForm.photo || '';

      // Run all operations in parallel instead of RPC to avoid statement timeout
      const results = await Promise.all([
        // 1. Update order status
        supabase.from('orders').update({ status: 'completed' }).eq('id', completeOrderTarget.id).neq('status', 'completed'),
        // 2. Create case
        supabase.from('cases').upsert({
          order_id: completeOrderTarget.id,
          executor_id: executor.id,
          title,
          description,
          photo_url: photoUrl
        }, { onConflict: 'order_id' }),
        // 3. Add to executor portfolio (with order_id for dedup)
        supabase.from('executor_portfolio').upsert({
          executor_id: executor.id,
          order_id: completeOrderTarget.id,
          title,
          description,
          photo_url: photoUrl
        }, { onConflict: 'order_id,executor_id' }),
      ]);

      // Log all results
      console.log('[COMPLETE] order update:', results[0].error ? 'FAIL ' + results[0].error.message : 'OK');
      console.log('[COMPLETE] case upsert:', results[1].error ? 'FAIL ' + results[1].error.message : 'OK');
      console.log('[COMPLETE] portfolio upsert:', results[2].error ? 'FAIL ' + results[2].error.message : 'OK');

      // Check for critical errors (order update)
      if (results[0].error) throw results[0].error;

      showToast('Заказ завершён!', 'success');
      setCompleteOrderTarget(null);
      setCaseForm({ title: '', photo: '', description: '' });
      fetchOrders();
      // Обновляем портфолио чтобы новый кейс сразу появился
      const { data: portData } = await supabase.from('executor_portfolio').select('id, title, description, photo_url, is_visible, created_at, order_id').eq('executor_id', executor.id).order('created_at', { ascending: false });
      setPortfolio(portData || []);
    } catch (err: any) {
      showToast('Ошибка: ' + (err.message || 'Не удалось завершить'), 'error');
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const saveProfile = async () => {
    if (!executor) return;
    setIsSavingProfile(true);
    const cleanPhone = normalizePhone(editPhone);

    // Check if docs were newly added or changed
    const docsChanged = (editPassport !== (executor.passport_photo || '')) || (editSelfie !== (executor.selfie_photo || ''));
    const hasNewDocs = !!(editPassport && editSelfie);

    const updatePayload: any = {
      name: editName,
      phone: cleanPhone,
      city: editCity,
      avatar: editAvatar,
      description: editBio,
      passport_photo: editPassport || null,
      selfie_photo: editSelfie || null,
    };

    // If docs were added/changed, send for admin review
    if (docsChanged && hasNewDocs) {
      const now = new Date().toLocaleString('ru-RU');
      const prevComment = (executor.admin_comment || '').replace(/\n\n✅ Исправлено:[\s\S]*$/, '');
      const newComment = (prevComment ? prevComment + '\n\n' : '') + `✅ Исправлено: ${now}`;
      updatePayload.status = 'pending';
      updatePayload.admin_comment = newComment;
      updatePayload.verification_status = 'pending';
    }

    try {
      let { error } = await supabase.from('executors').update(updatePayload).eq('id', executor.id);

      // Fallback: if verification_status column doesn't exist yet, retry without it
      if (error && error.message?.includes('verification_status')) {
        const { verification_status, ...fallbackPayload } = updatePayload;
        ({ error } = await supabase.from('executors').update(fallbackPayload).eq('id', executor.id));
      }

      if (error) throw error;

      // Sync to verification_documents table for consistency
      if (docsChanged && hasNewDocs) {
        await supabase.from('verification_documents').upsert({
          user_id: executor.id,
          passport_url: editPassport,
          selfie_url: editSelfie,
          status: 'pending'
        }, { onConflict: 'user_id' });
      }

      const updatedExec = { ...executor, ...updatePayload };
      setExecutor(updatedExec);
      
      if (docsChanged && hasNewDocs) {
        showToast('Профиль обновлен. Документы отправлены на проверку!', 'success');
      } else {
        showToast('Профиль обновлен', 'success');
      }
      setIsProfileOpen(false);
    } catch (err: any) {
      showToast('Ошибка при сохранении: ' + err.message, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Auto-save: debounced silent save (no modal close, no doc resubmission logic)
  const triggerAutoSave = useCallback((fields: { name?: string; phone?: string; city?: string; avatar?: string; bio?: string }) => {
    if (!executor) return;
    if (profileAutoSaveRef.current) clearTimeout(profileAutoSaveRef.current);
    profileAutoSaveRef.current = setTimeout(async () => {
      const cleanPhone = normalizePhone(fields.phone ?? editPhone);
      const payload: any = {
        name: fields.name ?? editName,
        phone: cleanPhone,
        city: fields.city ?? editCity,
        avatar: fields.avatar ?? editAvatar,
        description: fields.bio ?? editBio,
      };
      const { error } = await supabase.from('executors').update(payload).eq('id', executor.id);
      if (!error) {
        setExecutor((prev: any) => prev ? { ...prev, ...payload } : prev);
        setProfileSavedIndicator(true);
        setTimeout(() => setProfileSavedIndicator(false), 1500);
      }
    }, 500);
  }, [executor, editName, editPhone, editCity, editAvatar, editBio]);

  const savePortfolioItem = async () => {
    if (!executor || !newCase.title || !newCase.photo) return;
    setIsAddingCase(true);
    
    if (editingCaseId) {
       const { data, error } = await supabase.from('executor_portfolio')
        .update({
          title: newCase.title,
          description: newCase.description,
          photo_url: newCase.photo
        })
        .eq('id', editingCaseId)
        .select().single();

       if (error) {
         showToast('Ошибка обновления: ' + error.message, 'error');
       } else {
         setPortfolio(portfolio.map(p => p.id === editingCaseId ? data : p));
         showToast('Кейс обновлен', 'success');
         setEditingCaseId(null);
         setIsAddingCase(false);
         setNewCase({ title: '', photo: '', description: '' });
       }
    } else {
       const { data, error } = await supabase.from('executor_portfolio').insert({
         executor_id: executor.id,
         title: newCase.title,
         description: newCase.description,
         photo_url: newCase.photo
       }).select().single();

       if (error) {
         showToast('Ошибка: ' + error.message, 'error');
       } else {
         setPortfolio([data, ...portfolio]);
         setNewCase({ title: '', photo: '', description: '' });
         setIsAddingCase(false);
         showToast('Кейс добавлен', 'success');
       }
    }
    setIsAddingCase(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('Файл слишком большой. Макс 5МБ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setNewCase(prev => ({ ...prev, photo: result }));
      showToast('Фото загружено', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Аватар слишком большой. Макс 2МБ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setEditAvatar(result);
      showToast('Аватар загружен', 'success');
    };
    reader.readAsDataURL(file);
  };

  const deletePortfolioItem = async (id: string) => {
    if (!confirm('Удалить этот кейс?')) return;
    const { error } = await supabase.from('executor_portfolio').delete().eq('id', id);
    if (error) {
      showToast('Ошибка удаления', 'error');
    } else {
      setPortfolio(portfolio.filter(p => p.id !== id));
      showToast('Кейс удален', 'success');
    }
  };

  // ─── LOADING / ERROR STATE ───
  if (!executor) {
    if (loadError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-6 font-[Inter]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-white font-black text-lg">Не удалось загрузить профиль</p>
            <p className="text-white/40 text-sm">{loadError}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => { setLoadError(null); setFetchKey(k => k + 1); }}
              className="w-full py-3.5 rounded-2xl bg-yellow-500 text-black font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Повторить
            </button>
            <button
              onClick={() => router.push('/performer/auth')}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm"
            >
              ← Выйти
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-[Inter]">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-2 border-yellow-500/20 rounded-full animate-ping" />
          <div className="absolute inset-0 border border-yellow-500/30 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse" />
          </div>
        </div>
        <p className="text-white/40 text-sm animate-pulse">Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white font-[Inter]">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* ══ DESKTOP LAYOUT ══ */}
      <div className="hidden md:block min-h-screen p-10">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* ─── NEW HEADER: Telegram-style ─── */}
        <header className="flex items-center justify-between py-6">
          {/* LEFT: Avatar + Info */}
          <div className="flex items-center gap-4">
            <div 
              className="relative w-14 h-14 rounded-full overflow-hidden bg-white/5 ring-2 ring-white/[0.06] cursor-pointer active:scale-95 transition-transform" 
              onClick={openProfile}
            >
              <img 
                src={executor?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop'} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="cursor-pointer" onClick={openProfile}>
              <h1 className="text-[19px] font-semibold text-white tracking-tight">
                {executor?.name || 'Исполнитель'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-white/60">{executor?.city || 'Город'}</span>
                {executorRating.rating ? (
                  <>
                    <span className="text-[12px] text-white/30">·</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-[12px] text-white/60">{executorRating.rating.toFixed(1)}</span>
                      <span className="text-[12px] text-white/40">({executorRating.reviews_count})</span>
                    </div>
                  </>
                ) : null}
              </div>
              {(executor?.passport_photo && executor?.selfie_photo) ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-green-500">Документы проверены</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-red-500">Документы не проверены</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Balance + Reviews + Chats + Status */}
          <div className="flex items-center gap-3">
            {/* Balance + Topup */}
            <div className="flex items-center gap-2">
              <div 
                className={cn(
                  "flex flex-col items-end px-4 py-2 rounded-xl transition-all duration-300",
                  balanceAnimation ? "bg-yellow-500/10" : "bg-white/[0.03]"
                )}
                onAnimationEnd={() => setBalanceAnimation(false)}
              >
                <span className="text-[10px] text-white/40 uppercase">Баланс</span>
                <span className={cn(
                  "text-lg font-bold text-white transition-all duration-300",
                  balanceAnimation && "text-yellow-400 scale-110"
                )}>
                  {(executor?.balance || 0).toLocaleString()} ₽
                </span>
              </div>
              <button
                onClick={() => setShowTopupModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider bg-yellow-500 text-black hover:bg-yellow-400 hover:scale-105 transition-all shadow-lg shadow-yellow-500/20 whitespace-nowrap"
              >
                💳 Пополнить
              </button>
            </div>

            {/* Reviews Button */}
            <button 
              onClick={() => setIsReviewsOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all active:scale-95 group"
            >
              <span className="text-[10px] text-white/40 group-hover:text-white/60 uppercase transition-colors">Отзывы</span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-[13px] font-semibold text-white">{executorRating.reviews_count}</span>
              </div>
              {unreadReviewsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadReviewsCount}
                </span>
              )}
            </button>

            {/* Chats Button */}
            <button 
              onClick={() => setIsChatListOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all active:scale-95 group"
            >
              <span className="text-[10px] text-white/40 group-hover:text-white/60 uppercase transition-colors">Чаты</span>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-[13px] font-semibold text-white">{unreadCount || 0}</span>
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Status Indicator (not button) */}
            <div className="flex items-center gap-2 px-4 py-2">
              <span className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                isOnline ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-white/20"
              )} />
              <span className={cn(
                "text-[13px] font-medium transition-colors",
                isOnline ? "text-green-400" : "text-white/40"
              )}>
                {isOnline ? 'Онлайн' : 'Офлайн'}
              </span>
            </div>
          </div>
        </header>

        {/* Trust Level + Verification Banner (hide when approved) */}
        {executor?.status !== 'approved' && <div className="space-y-4">
          {/* Trust Score Bar */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("w-4 h-4", verificationStatus === 'verified' ? "text-green-500" : verificationStatus === 'pending' ? "text-yellow-500" : "text-white/20")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Уровень доверия</span>
              </div>
              <span className={cn("text-lg font-black", trustScore >= 70 ? "text-green-500" : trustScore >= 40 ? "text-yellow-500" : "text-white/30")}>{trustScore}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", trustScore >= 70 ? "bg-gradient-to-r from-green-500 to-emerald-400" : trustScore >= 40 ? "bg-gradient-to-r from-yellow-500 to-amber-400" : "bg-white/20")}
                style={{ width: `${trustScore}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                {verificationStatus === 'verified' && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Проверен
                  </span>
                )}
                {verificationStatus === 'pending' && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> На проверке
                  </span>
                )}
                {verificationStatus === 'unverified' && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Не проверен
                  </span>
                )}
                {verificationStatus === 'rejected' && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Отклонено
                  </span>
                )}
              </div>
              <span className="text-[9px] text-white/20">рейтинг 40% + верификация 30% + отзывы 20% + активность 10%</span>
            </div>
          </div>

          {/* Verification Invite Banner */}
          {(verificationStatus === 'unverified' || verificationStatus === 'skipped') && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-black text-white">+500 ₽ за подтверждение личности</p>
                  <p className="text-[11px] text-white/35 leading-relaxed">
                    Загрузите паспорт и селфи — это повысит доверие заказчиков и даст приоритет в выдаче.
                  </p>
                  <button
                    onClick={openProfile}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black text-xs font-black rounded-xl hover:brightness-110 transition-all active:scale-[0.97] shadow-lg shadow-yellow-500/20"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Пройти проверку
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Verified Banner */}
          {verificationStatus === 'verified' && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-green-400">Документы проверены</p>
                <p className="text-[11px] text-white/30">Заказчики видят значок верификации в вашем профиле</p>
              </div>
            </div>
          )}

          {/* Pending Banner */}
          {verificationStatus === 'pending' && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-yellow-400">Документы на проверке</p>
                <p className="text-[11px] text-white/30">Обычно занимает до 24 часов</p>
              </div>
            </div>
          )}

          {/* Revision Banner — admin sent profile back for fixes */}
          {executor?.status === 'revision' && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-400">Профиль отправлен на доработку</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Внесите исправления и отправьте повторно</p>
                </div>
              </div>
              {executor.admin_comment && (
                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Комментарий администратора:</p>
                  <p className="text-sm text-white/70 leading-relaxed">{executor.admin_comment}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={openProfile}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Редактировать профиль
                </button>
                <button
                  onClick={async () => {
                    if (!executor?.id) return;
                    const now = new Date().toLocaleString('ru-RU');
                    const prevComment = (executor.admin_comment || '').replace(/\n\n✅ Исправлено:[\s\S]*$/, '');
                    const newComment = prevComment + `\n\n✅ Исправлено: ${now}`;
                    const { error } = await supabase.from('executors').update({ status: 'pending', admin_comment: newComment }).eq('id', executor.id);
                    if (!error) {
                      setExecutor({ ...executor, status: 'pending', admin_comment: newComment });
                      showToast('Профиль отправлен на повторную проверку!', 'success');
                    } else {
                      showToast('Ошибка: ' + error.message, 'error');
                    }
                  }}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                >
                  Отправить на проверку
                </button>
              </div>
            </div>
          )}

          {/* Pending Review Banner */}
          {executor?.status === 'pending' && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-yellow-400">Профиль на модерации</p>
                <p className="text-[10px] text-white/30 mt-0.5">Администратор проверит ваш профиль. Обычно это занимает 1 час.</p>
              </div>
            </div>
          )}

          {/* Rejected Banner */}
          {executor?.status === 'rejected' && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400">Профиль отклонён</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Свяжитесь с поддержкой для уточнения</p>
                </div>
              </div>
              {executor.admin_comment && (
                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Причина:</p>
                  <p className="text-sm text-white/70 leading-relaxed">{executor.admin_comment}</p>
                </div>
              )}
            </div>
          )}

          {/* Bonus Verification Banner (only for unverified / rejected) */}
          {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
            <button
              onClick={() => setIsVerificationOpen(true)}
              className="w-full bg-gradient-to-r from-green-500/10 via-yellow-500/5 to-amber-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4 hover:border-yellow-500/40 hover:shadow-[0_0_30px_rgba(234,179,8,0.05)] transition-all group"
            >
              <div className="w-12 h-12 bg-green-500/15 border border-green-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💰</span>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-white">Получите +500 ₽ за верификацию</p>
                <p className="text-[10px] text-white/30 mt-0.5">Займёт ~30 секунд</p>
              </div>
              <span className="text-green-400 text-xs font-black bg-green-500/10 px-3 py-1.5 rounded-full group-hover:bg-green-500/20 transition-all">500 ₽</span>
            </button>
          )}
        </div>}

        {isOnline ? (
          <div className="space-y-12">
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide items-center">
              {['loaders', 'gazelle', 'furniture', 'rigging'].map(k => (
                <button key={k} onClick={() => toggleService(k)} className={cn("px-6 py-3 rounded-xl border text-[10px] font-black uppercase whitespace-nowrap transition-all", services[k] ? "bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-white/5 border-white/5 text-white/40")}>
                  {k === 'loaders' ? 'Грузчики' : k === 'gazelle' ? 'Газель' : k === 'furniture' ? 'Сборка' : 'Такелаж'}
                </button>
              ))}
              
              <div className="w-px h-6 bg-white/10 mx-2 shrink-0" />
              
              <button 
                onClick={() => setIsInWorkOpen(true)}
                className={cn("px-6 py-3 rounded-xl border text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-2", 
                  isInWorkOpen ? "bg-yellow-500 border-yellow-500 text-black" : "bg-white/5 border-white/5 text-yellow-500 hover:bg-yellow-500/10"
                )}
              >
                <CheckCircle className="w-3.5 h-3.5" /> В работе
                {activeOrders.length > 0 && <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded-full text-[8px]">{activeOrders.length}</span>}
              </button>

              <button 
                onClick={() => setIsArchiveOpen(true)}
                className={cn("px-6 py-3 rounded-xl border text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-2", 
                  isArchiveOpen ? "bg-yellow-500 border-yellow-500 text-black" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                )}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Архив
                {archivedOrders.length > 0 && <span className="bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full text-[8px] font-black">{archivedOrders.length}</span>}
              </button>

              <div className="w-px h-6 bg-white/10 mx-2 shrink-0" />

              <button 
                onClick={toggleOnline}
                className="px-6 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-[10px] font-black uppercase whitespace-nowrap transition-all text-red-400 hover:bg-red-500/20 hover:border-red-500/40 active:scale-95"
              >
                Остановить поиск
              </button>
            </div>

            <div className="space-y-6">
              {/* 🟢 NEW LIVE ORDERS SECTION (Now fully at the top) */}
              <AnimatePresence>
                {recentOrders.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between px-2">
                       <h2 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3 text-yellow-500">
                         <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /> НОВЫЕ ЗАЯВКИ
                       </h2>
                       <button onClick={() => setRecentOrders([])} className="text-[10px] font-black text-white/20 uppercase hover:text-white transition">Очистить</button>
                    </div>

                    {recentOrders.map(o => {
                      const descLines = (o.description || '').split('\n').map(l => l.trim()).filter(Boolean);
                      const nameLine = descLines.find(l => /^имя:/i.test(l))?.replace(/^имя:\s*/i, '');
                      const titleLine = descLines.find(l => !/^имя:/i.test(l)) || descLines[0] || o.type;
                      return (
                      <div key={`recent-${o.id}`} className="bg-yellow-500/10 border-2 border-yellow-500/40 p-4 rounded-[24px] relative overflow-hidden group hover:bg-yellow-500/20 transition-all shadow-[0_0_40px_rgba(234,179,8,0.1)]">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                            <div className="flex-1 min-w-0 space-y-1.5">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <span className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">{o.type}</span>
                                 <span className="text-[9px] font-black text-yellow-500 uppercase flex items-center gap-1">
                                   <Clock className="w-3 h-3" /> ТОЛЬКО ЧТО
                                 </span>
                               </div>
                               {nameLine && <div className="text-xs font-bold text-yellow-500/80">{nameLine}</div>}
                               <h3 className="text-base font-black uppercase text-white tracking-tight leading-tight truncate">{titleLine}</h3>
                               <p className="text-white/50 text-[11px] font-bold flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-yellow-500/60 shrink-0" />
                                  <span className="truncate">
                                    {o.from_address}{o.to_address ? ` → ${o.to_address}` : ''}
                                    {(o.details?.fromFloor || o.details?.toFloor) && ` • ${o.details?.fromFloor || 1}→${o.details?.toFloor || 1} эт.`}
                                    {o.details?.vehicleType && (
                                       <span className={cn("ml-2 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider", o.details.vehicleType === 'Газель' ? "bg-yellow-500/20 text-yellow-500" : "bg-white/10 text-white/30")}>
                                         {o.details.vehicleType === 'Газель' ? 'ГАЗЕЛЬ' : 'БЕЗ ГАЗЕЛИ'}
                                       </span>
                                    )}
                                  </span>
                               </p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-right">
                                   {o.price_type === 'request' ? (
                                     <>
                                       <p className="text-yellow-500 text-sm font-black uppercase leading-none">Цена по запросу</p>
                                       <p className="text-[8px] font-black text-yellow-500/40 uppercase mt-0.5">Введите вашу цену</p>
                                     </>
                                   ) : (
                                     <>
                                       <p className="text-yellow-500 text-xl font-black tabular-nums leading-none">{o.price_estimate.toLocaleString()} ₽</p>
                                       <p className="text-[8px] font-black text-yellow-500/40 uppercase mt-0.5">Бюджет</p>
                                     </>
                                   )}
                                </div>
                                <div className="relative group/accept">
                                   {/* Circular Progress (Yandex Style) */}
                                   <div className="absolute -inset-2 pointer-events-none">
                                      <svg className="w-16 h-16 transform -rotate-90">
                                         <circle
                                            cx="32" cy="32" r="28"
                                            stroke="currentColor" strokeWidth="2" fill="transparent"
                                            className="text-white/5"
                                         />
                                         {(() => {
                                            const TOTAL = 25000;
                                            const startMs = (o as any).dispatched_at || new Date(o.created_at).getTime();
                                            const elapsed = Date.now() - startMs;
                                            const progress = Math.max(0, 1 - (elapsed / TOTAL));
                                            return (
                                               <motion.circle
                                                  cx="32" cy="32" r="28"
                                                  stroke="currentColor" strokeWidth="2" fill="transparent"
                                                  strokeDasharray="175.9 175.9"
                                                  strokeDashoffset={175.9 - (progress * 175.9)}
                                                  className="text-yellow-500"
                                                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                                               />
                                            );
                                         })()}
                                      </svg>
                                   </div>
                                   
                                   <button 
                                     onClick={() => { setBiddingOrder(o); setBidPrice(o.price_type === 'request' ? '' : new Intl.NumberFormat('ru-RU').format(o.price_estimate)); setRecentOrders(prev => prev.filter(x => x.id !== o.id)); }} 
                                     className="relative z-10 bg-yellow-500 text-black px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
                                   >
                                     ОТКЛИКНУТЬСЯ
                                     <span className="bg-black/10 px-2 py-0.5 rounded-md text-[10px] tabular-nums">
                                        {Math.max(0, Math.ceil((25000 - (Date.now() - ((o as any).dispatched_at || new Date(o.created_at).getTime()))) / 1000))}
                                     </span>
                                   </button>
                                </div>
                             </div>
                         </div>
                         <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shine" />
                         </div>
                      </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── ACTIVITY COUNTERS ─── */}
              <div className="flex items-center justify-center gap-6 py-4">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white/40 uppercase">Найдено сегодня</span>
                  <span className="text-xl font-bold text-yellow-500">{todayOrdersCount}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white/40 uppercase">Заработано</span>
                  <span className="text-xl font-bold text-green-400">{todayEarnings.toLocaleString()} ₽</span>
                </div>
              </div>

              {/* LIVE SEARCH RADAR — Enhanced with pulsing animation */}
              {recentOrders.length === 0 && (
                <div className="relative bg-[#0b0b0c] border border-white/[0.06] rounded-[32px] p-12 text-center overflow-hidden">
                  {/* Floating live event card */}
                  <AnimatePresence>
                    {showLiveCard && liveEvent && (
                      <motion.div
                        initial={{ opacity: 0, y: -30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white/[0.08] backdrop-blur-md border border-white/[0.1] rounded-2xl px-4 py-3 shadow-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{liveEvent.type === 'order' ? '📦' : liveEvent.type === 'nearby' ? '🔔' : '🔍'}</span>
                          <div className="text-left">
                            <p className="text-[13px] font-semibold text-white">{liveEvent.title}</p>
                            {liveEvent.description && (
                              <p className="text-[11px] text-white/50">{liveEvent.description}</p>
                            )}
                            {liveEvent.price && (
                              <p className="text-[13px] font-bold text-yellow-500">{liveEvent.price.toLocaleString()} ₽</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Radar animation container */}
                  <div className="relative z-10 space-y-8">
                    {/* Pulsing radar with expanding waves */}
                    <div className="relative w-32 h-32 mx-auto">
                      {/* Expanding waves */}
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 border border-yellow-500/20 rounded-full animate-[ping_2s_ease-out_infinite]" />
                        <div className="absolute inset-0 border border-yellow-500/15 rounded-full animate-[ping_2s_ease-out_infinite_0.4s]" />
                        <div className="absolute inset-0 border border-yellow-500/10 rounded-full animate-[ping_2s_ease-out_infinite_0.8s]" />
                      </div>
                      
                      {/* Sweep line effect */}
                      <div className="absolute inset-0 rounded-full overflow-hidden animate-sweep">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-yellow-500/15 to-transparent" />
                      </div>
                      
                      {/* Pulsing center dot */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.6)] animate-[pulse_1.2s_ease-in-out_infinite]" />
                          <div className="absolute inset-0 w-4 h-4 bg-yellow-400 rounded-full animate-[ping_1.2s_ease-out_infinite] opacity-50" />
                        </div>
                      </div>
                    </div>

                    {/* Text content */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white tracking-tight">Живой поиск заказов</h3>
                      <p className="text-[13px] text-white/40">Идёт поиск заявок в {executor?.city || 'вашем городе'}...</p>
                    </div>
                  </div>

                  {/* Decorative ambient glow */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-yellow-500/5 blur-[60px] rounded-full pointer-events-none" />
                </div>
              )}


            </div>
          </div>
        ) : (
          <>
            {/* Verification nudge — shown when active but docs not submitted */}
            {isApproved(executor?.status) && verificationStatus === 'unverified' && (
              <button
                onClick={() => setIsVerificationOpen(true)}
                className="w-full mb-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/25 rounded-2xl p-5 flex items-center gap-4 hover:border-yellow-500/50 transition-all group animate-in fade-in duration-500"
              >
                <div className="w-12 h-12 bg-yellow-500/15 border border-yellow-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl">🆔</div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-yellow-300">Пройдите верификацию</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Получите +500 ₽ и значок «Проверен» — займёт ~30 сек</p>
                </div>
                <span className="text-yellow-400 text-xs font-black bg-yellow-500/10 px-3 py-1.5 rounded-full group-hover:bg-yellow-500/20 transition-all shrink-0">+500 ₽</span>
              </button>
            )}

            <div className="py-32 text-center space-y-8">
              <Power className={cn("w-20 h-20 mx-auto", isApproved(executor?.status) ? "text-white/10" : "text-yellow-500/10")} />
              {!isApproved(executor?.status) ? (
                <>
                  <h2 className="text-3xl font-black uppercase text-yellow-500/40">На одобрении</h2>
                  <p className="text-white/25 text-sm max-w-xs mx-auto">Администратор проверяет ваш профиль. Обычно это занимает 1 час.</p>
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-400 font-bold text-sm">Ожидайте одобрения</span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-black uppercase opacity-20">Вы вне смены</h2>
                  <button onClick={toggleOnline} className="bg-white text-black px-12 py-5 rounded-[32px] font-black uppercase text-xs hover:bg-yellow-500 transition-all">Заступить</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      </div>

      {/* ══════════════════════════════════════
          MOBILE LAYOUT  (md:hidden)
      ══════════════════════════════════════ */}
      <div className="md:hidden flex flex-col bg-black" style={{ minHeight: '100dvh' }}>

        {/* ── Mobile Header ── */}
        <div className="flex items-center justify-between px-4 pt-14 pb-3 flex-shrink-0">
          <button className="flex items-center gap-3" onClick={openProfile}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 ring-2 ring-white/10 flex-shrink-0">
              <img src={executor?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=80&h=80&fit=crop'} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm leading-tight">{executor?.name || 'Исполнитель'}</p>
              <p className="text-white/30 text-[11px]">{executor?.city || 'Город'}</p>
            </div>
          </button>
          <button
            onClick={toggleOnline}
            className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95', isOnline ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/10')}
          >
            <span className={cn('w-2 h-2 rounded-full transition-colors', isOnline ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)] animate-pulse' : 'bg-white/20')} />
            <span className={cn('text-xs font-bold', isOnline ? 'text-green-400' : 'text-white/40')}>
              {isOnline ? 'Онлайн' : 'Офлайн'}
            </span>
          </button>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(78px + env(safe-area-inset-bottom))' }}>
          <AnimatePresence mode="wait">

            {/* ────────── ЗАКАЗЫ ────────── */}
            {mobileTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                className="flex flex-col px-4 pt-2"
                style={{ height: 'calc(100dvh - 148px)' }}
              >
                {/* ══ ТАБЫ — всегда сверху ══ */}
                <div className="flex gap-1.5 p-1.5 rounded-2xl flex-shrink-0 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {([
                    { id: 'active',  label: 'Активные', count: recentOrders.length },
                    { id: 'working', label: 'В работе',  count: activeOrders.length },
                    { id: 'archive', label: 'Архив',     count: archivedOrders.length },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => { try { navigator.vibrate(20); } catch(e) {} setActiveOrderTab(t.id); }}
                      className={cn(
                        'flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-1.5',
                        activeOrderTab === t.id ? 'bg-yellow-500 text-black' : 'text-white/30'
                      )}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[7px] font-black min-w-[16px] text-center', activeOrderTab === t.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/40')}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ══ LIVE BLOCK — заполняет оставшееся пространство ══ */}
                <div
                  className="rounded-3xl overflow-hidden flex-1 mb-3 min-h-0"
                  style={{ background: '#0a0a0b', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <AnimatePresence mode="wait">

                    {/* ── АКТИВНЫЕ: онлайн ── */}
                    {activeOrderTab === 'active' && isOnline && (
                      <motion.div key="la-on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
                        {recentOrders.length > 0 ? (
                          <div className="h-full overflow-y-auto p-4 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />Новые заявки
                              </span>
                              <button onClick={() => setRecentOrders([])} className="text-[9px] text-white/20 uppercase font-black">Очистить</button>
                            </div>
                            {recentOrders.map(o => (
                              <div key={`ml-${o.id}`} onClick={() => setBiddingOrder(o)} className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-3 space-y-1.5 active:scale-[0.98] transition-transform cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <span className="text-yellow-500 text-[10px] font-black uppercase">{o.type}</span>
                                  <span className="text-white/25 text-[9px]">⚡ только что</span>
                                </div>
                                <p className="text-white font-bold text-sm leading-snug">{o.from_address}{o.to_address ? ` → ${o.to_address}` : ''}</p>
                                {o.price_estimate > 0 && <p className="text-yellow-400 font-black text-lg">{o.price_estimate.toLocaleString()} ₽</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="relative w-28 h-28 mb-4">
                              <div className="absolute inset-0 border border-yellow-500/20 rounded-full animate-[ping_2s_ease-out_infinite]" />
                              <div className="absolute inset-0 border border-yellow-500/15 rounded-full animate-[ping_2s_ease-out_infinite_0.4s]" />
                              <div className="absolute inset-0 border border-yellow-500/10 rounded-full animate-[ping_2s_ease-out_infinite_0.8s]" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-5 h-5 bg-yellow-500 rounded-full shadow-[0_0_24px_rgba(234,179,8,0.7)] animate-[pulse_1.2s_ease-in-out_infinite]" />
                              </div>
                            </div>
                            <h3 className="text-sm font-bold text-white">Живой поиск заказов</h3>
                            <p className="text-[11px] text-white/25 mt-1">Идёт поиск в {executor?.city || 'вашем городе'}...</p>
                            <button onClick={toggleOnline} className="mt-4 px-5 py-2 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400/60 font-black text-[9px] uppercase tracking-widest">
                              Остановить
                            </button>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-yellow-500/5 blur-[40px] rounded-full pointer-events-none" />
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ── АКТИВНЫЕ: офлайн — только статичный круг ── */}
                    {activeOrderTab === 'active' && !isOnline && (
                      <motion.div key="la-off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full flex items-center justify-center">
                        {isApproved(executor?.status) ? (
                          <div className="relative w-36 h-36">
                            <div className="absolute inset-0 border border-white/[0.07] rounded-full" />
                            <div className="absolute inset-5 border border-white/[0.05] rounded-full" />
                            <div className="absolute inset-10 border border-white/[0.03] rounded-full" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 bg-white/10 rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-2 px-8">
                            <Clock className="w-10 h-10 mx-auto text-yellow-500/20" />
                            <p className="text-yellow-500/40 font-black uppercase text-sm">На одобрении</p>
                            <p className="text-white/20 text-xs">Администратор проверяет ваш профиль</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ── В РАБОТЕ ── */}
                    {activeOrderTab === 'working' && (
                      <motion.div key="lw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full overflow-y-auto p-4 space-y-3">
                        {activeOrders.length > 0 ? activeOrders.map(o => (
                          <div key={o.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-yellow-500">{o.type}</span>
                              <span className="text-[9px] text-green-400 font-black bg-green-500/10 px-2 py-0.5 rounded-full uppercase">В работе</span>
                            </div>
                            <p className="text-white font-bold text-sm">{o.from_address}{o.to_address ? ` → ${o.to_address}` : ''}</p>
                            {o.price_estimate > 0 && <p className="text-yellow-400 font-black text-lg">{o.price_estimate.toLocaleString()} ₽</p>}
                            <button onClick={() => setCompleteOrderTarget(o)} className="w-full py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 font-black text-[10px] uppercase rounded-xl active:scale-[0.98] transition-all tracking-wider">
                              ✓ Завершить заказ
                            </button>
                          </div>
                        )) : (
                          <div className="h-full flex flex-col items-center justify-center gap-3 min-h-[120px]">
                            <CheckCircle className="w-10 h-10 text-white/10" />
                            <p className="text-white/25 font-black uppercase text-xs tracking-wider">У вас нет активных заказов</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ── АРХИВ ── */}
                    {activeOrderTab === 'archive' && (
                      <motion.div key="lar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full overflow-y-auto p-4 space-y-2">
                        {archivedOrders.length > 0 ? archivedOrders.map(o => (
                          <div key={o.id} onClick={() => setSelectedOrderDetails(o)} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3 flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[9px] font-black uppercase text-white/25">{o.type}</span>
                                {o.status === 'completed'
                                  ? <span className="text-[8px] font-black text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">Выполнен</span>
                                  : <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">Отклонён</span>
                                }
                              </div>
                              <p className="text-white/60 text-xs truncate">{o.from_address}</p>
                              <p className="text-white/20 text-[9px]">{new Date(o.created_at).toLocaleDateString('ru-RU')}</p>
                            </div>
                            {o.price_estimate > 0 && <span className="text-yellow-400 font-black text-sm flex-shrink-0">{o.price_estimate.toLocaleString()} ₽</span>}
                          </div>
                        )) : (
                          <div className="h-full flex flex-col items-center justify-center gap-3 min-h-[120px]">
                            <ClipboardList className="w-10 h-10 text-white/10" />
                            <p className="text-white/25 font-black uppercase text-xs tracking-wider">Архив пуст</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* ══ КАТЕГОРИИ — для вкладки Активные (онлайн: всегда; офлайн: над кнопкой) ══ */}
                {activeOrderTab === 'active' && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 flex-shrink-0">
                    {(['loaders', 'gazelle', 'furniture', 'rigging'] as const).map(k => (
                      <button key={k} onClick={() => toggleService(k)} className={cn('px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase whitespace-nowrap flex-shrink-0 transition-all active:scale-95', services[k] ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-white/5 border-white/5 text-white/40')}>
                        {k === 'loaders' ? 'Грузчики' : k === 'gazelle' ? 'Газель' : k === 'furniture' ? 'Сборка' : 'Такелаж'}
                      </button>
                    ))}
                  </div>
                )}

                {/* ══ ВЫЙТИ НА ЛИНИЮ — только офлайн + активный таб ══ */}
                {!isOnline && activeOrderTab === 'active' && isApproved(executor?.status) && (
                  <div className="flex-shrink-0 mb-2 space-y-2">
                    <div
                      ref={swipeTrackRef}
                      className="relative h-[58px] rounded-full overflow-hidden select-none touch-none w-full"
                      style={{ background: 'rgba(234,179,8,0.08)', border: '1.5px solid rgba(234,179,8,0.18)' }}
                      onPointerDown={handleSwipeStart}
                      onPointerMove={handleSwipeMove}
                      onPointerUp={handleSwipeEnd}
                      onPointerCancel={handleSwipeEnd}
                    >
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `calc(${swipeX}px + 58px)`, background: 'linear-gradient(90deg,rgba(234,179,8,0.28),rgba(234,179,8,0.06))', transition: isDraggingRef.current ? 'none' : 'width 0.3s ease' }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] pl-12">Выйти на линию</span>
                      </div>
                      <div className="absolute top-[5px] bottom-[5px] aspect-square rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(234,179,8,0.45)] pointer-events-none" style={{ left: `calc(5px + ${swipeX}px)`, background: 'linear-gradient(135deg,#FFD700,#F59E0B)', transition: isDraggingRef.current ? 'none' : 'left 0.3s ease' }}>
                        <span className="text-black font-black text-lg leading-none">→</span>
                      </div>
                    </div>
                    <p className="text-center text-white/15 text-[9px] font-bold uppercase tracking-[0.18em]">Проведите вправо чтобы начать поиск</p>
                  </div>
                )}

              </motion.div>
            )}

            {/* ────────── БАЛАНС ────────── */}
            {mobileTab === 'balance' && (
              <motion.div key="balance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-4 space-y-4 pb-4">

                {/* Balance card */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-3xl p-8 text-center space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Ваш баланс</p>
                  <p className="text-5xl font-black text-white tabular-nums">{(executor?.balance || 0).toLocaleString()} ₽</p>
                  <button
                    onClick={() => setShowTopupModal(true)}
                    className="mt-3 inline-flex items-center gap-2 px-7 py-3 bg-yellow-500 text-black font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
                  >
                    💳 Пополнить
                  </button>
                </div>

                {/* Price list */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">Стоимость контактов</p>
                  {[['Грузчики', 99], ['Газель', 99], ['Переезд с газелью', 149], ['Сборка мебели', 149], ['Такелаж', 199]].map(([label, price]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span className="text-white/50 text-sm">{label}</span>
                      <span className="text-yellow-400 font-black text-sm">{price} ₽</span>
                    </div>
                  ))}
                </div>

                {/* Purchase history from archived orders */}
                {archivedOrders.filter(o => o.status === 'contact_purchased' || o.status === 'completed').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 px-1">История покупок</p>
                    {archivedOrders.filter(o => o.status === 'contact_purchased' || o.status === 'completed').slice(0, 20).map(o => (
                      <div key={o.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                        <div>
                          <p className="text-white/60 text-xs font-bold">{o.type || 'Заказ'}</p>
                          <p className="text-white/20 text-[10px]">{new Date(o.created_at).toLocaleDateString('ru-RU')}</p>
                        </div>
                        <span className="text-red-400 font-black text-sm">−{getContactPrice(o.type, o.details)} ₽</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ────────── ПРОФИЛЬ ────────── */}
            {mobileTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-4 space-y-4 pb-4">

                {/* Profile card */}
                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0">
                    <img src={executor?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=80&h=80&fit=crop'} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-base truncate">{executor?.name || 'Исполнитель'}</p>
                    <p className="text-white/40 text-xs mt-0.5">{executor?.city || 'Город'}</p>
                    {executorRating.rating ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold">{executorRating.rating.toFixed(1)}</span>
                        <span className="text-white/30 text-xs">({executorRating.reviews_count})</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Doc status */}
                {(executor?.passport_photo && executor?.selfie_photo) ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/5 border border-green-500/15">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-green-400 font-bold text-sm">Документы проверены</p>
                      <p className="text-white/25 text-[11px]">Заказчики видят значок верификации</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/15">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-red-400 font-bold text-sm">Документы не проверены</p>
                      <p className="text-white/25 text-[11px]">Добавьте паспорт и селфи</p>
                    </div>
                  </div>
                )}

                {/* Trust score */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Уровень доверия</span>
                    <span className={cn('text-base font-black', trustScore >= 70 ? 'text-green-400' : trustScore >= 40 ? 'text-yellow-500' : 'text-white/30')}>{trustScore}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700', trustScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : trustScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-white/20')} style={{ width: `${trustScore}%` }} />
                  </div>
                </div>

                {/* Action buttons */}
                <button onClick={openProfile} className="w-full py-4 bg-yellow-500 text-black font-black text-xs uppercase rounded-2xl tracking-widest hover:bg-yellow-400 transition-all active:scale-[0.97] shadow-lg shadow-yellow-500/20">
                  Редактировать профиль
                </button>
                <button onClick={() => setIsReviewsOpen(true)} className="w-full py-4 bg-white/[0.03] border border-white/[0.08] text-white/60 font-black text-xs uppercase rounded-2xl tracking-widest active:scale-[0.97] transition-all">
                  ★ Отзывы ({executorRating.reviews_count})
                </button>
                {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
                  <button onClick={() => setIsVerificationOpen(true)} className="w-full py-4 bg-green-500/5 border border-green-500/15 text-green-400 font-black text-xs uppercase rounded-2xl tracking-widest active:scale-[0.97] transition-all">
                    💰 Пройти верификацию (+500 ₽)
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full py-4 bg-red-500/[0.06] border border-red-500/20 text-red-400 font-black text-xs uppercase rounded-2xl tracking-widest active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Bottom Navigation ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#080808]/95 backdrop-blur-xl border-t border-white/[0.07]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(70px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-stretch h-[70px]">
            {([
              { id: 'orders', icon: <ClipboardList className="w-[22px] h-[22px]" />, label: 'Заказы', badge: recentOrders.length },
              { id: 'balance', icon: <Wallet className="w-[22px] h-[22px]" />, label: 'Баланс', badge: 0 },
              { id: 'chats', icon: <MessageSquare className="w-[22px] h-[22px]" />, label: 'Чаты', badge: unreadCount },
              { id: 'profile', icon: <User className="w-[22px] h-[22px]" />, label: 'Профиль', badge: unreadReviewsCount },
            ] as const).map(item => {
              const active = mobileTab === (item.id as any) && item.id !== 'chats';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    try { navigator.vibrate(30); } catch(e) {}
                    if (item.id === 'chats') { setIsChatListOpen(true); return; }
                    setMobileTab(item.id as any);
                  }}
                  className={cn('relative flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90', active ? 'text-yellow-400' : 'text-white/25')}
                >
                  {item.badge > 0 && (
                    <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center z-10">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {item.icon}
                  <span className={cn('text-[9px] font-black uppercase tracking-wide', active ? 'text-yellow-400' : 'text-white/20')}>
                    {item.label}
                  </span>
                  {active && <div className="absolute bottom-0 w-6 h-0.5 bg-yellow-400 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* BID & ORDER DETAIL MODAL (PREMIUM COMPACT) */}
      <AnimatePresence>
        {biddingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBiddingOrder(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 100 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 100 }} 
              className="relative bg-[#0d0d0d] border-t sm:border border-white/10 w-full max-w-lg sm:rounded-[48px] overflow-hidden shadow-2xl h-screen sm:h-auto sm:max-h-[85vh] flex flex-col"
            >
               <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between items-center text-center gap-8 overflow-hidden">
                  {/* Close button */}
                  <button onClick={() => setBiddingOrder(null)} className="absolute top-8 right-8 text-white/20 hover:text-white p-2">
                    <CloseIcon className="w-8 h-8" />
                  </button>

                  {/* 1. Header & Title */}
                  <div className="space-y-4 pt-4">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white">🔥 Новый заказ</h2>
                    <div className="space-y-2">
                       <div className="flex flex-col items-center gap-1 text-2xl font-black text-white/90">
                          <div className="flex items-center justify-center gap-3">
                            <span>{biddingOrder.from_address}</span>
                            {biddingOrder.to_address && (
                              <>
                                <span className="text-yellow-500">→</span>
                                <span>{biddingOrder.to_address}</span>
                              </>
                            )}
                          </div>
                          {(biddingOrder.details?.fromFloor || biddingOrder.details?.toFloor) && (
                            <span className="text-lg text-yellow-500/80">({biddingOrder.details?.fromFloor || 1}/{biddingOrder.details?.toFloor || 1} этаж)</span>
                          )}
                       </div>
                       <div className="text-sm font-black text-white/30 uppercase tracking-widest">
                          {biddingOrder.movers_count || 0} чел • {biddingOrder?.details?.vehicleType ? 'газель' : 'без авто'} • {biddingOrder?.details?.selectedTime || '11:00'}
                       </div>
                    </div>
                  </div>

                  {/* 2. Recommended Price — hidden for request type */}
                  {biddingOrder.price_type !== 'request' && (
                  <div className="space-y-2">
                     <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Рекомендуемая цена</p>
                     <p className="text-4xl font-black text-white tabular-nums tracking-tight">{formatPrice(biddingOrder.price_estimate)}</p>
                  </div>
                  )}
                  {biddingOrder.price_type === 'request' && (
                  <div className="space-y-1 text-center">
                     <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">⚡ Заказчик ждёт вашу цену</p>
                     <p className="text-base font-bold text-yellow-500/70">Введите стоимость за эту работу</p>
                  </div>
                  )}

                  {/* 3. Bid Input */}
                  <div className="w-full max-w-[280px] space-y-4">
                      <p className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Назови свою цену за заказ</p>
                      <div className="relative group">
                         <div className="absolute inset-0 bg-yellow-500/5 blur-3xl rounded-full" />
                         <input 
                            type="tel" 
                            inputMode="numeric"
                            value={bidPrice} 
                            onFocus={(e) => {
                              if (bidPrice.replace(/\s/g, '') === biddingOrder.price_estimate.toString()) {
                                setBidPrice('');
                              }
                            }}
                            onChange={e => {
                               const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                               if (!val) { setBidPrice(''); return; }
                               setBidPrice(new Intl.NumberFormat('ru-RU').format(parseInt(val, 10)));
                            }} 
                            className="relative z-10 w-full bg-white/[0.03] border-2 border-white/10 rounded-[28px] py-6 pr-12 text-4xl font-black text-white text-center focus:border-yellow-500 outline-none transition-all shadow-2xl tabular-nums" 
                            placeholder={new Intl.NumberFormat('ru-RU').format(biddingOrder.price_estimate)}
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-black text-yellow-500 z-20">₽</span>
                      </div>
                      
                      <div className="flex items-center justify-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                         <MessageSquare className="w-4 h-4" />
                         <span>Потом можно обсудить цену в чате</span>
                      </div>
                  </div>

                  {/* 4. Action Footer */}
                  <div className="w-full space-y-6 pt-4">
                    <button 
                       onClick={() => {
                         submitBid();
                         if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                           navigator.vibrate([30, 50, 30]);
                         }
                       }} 
                       disabled={isSubmittingBid || !bidPrice} 
                       className="w-full bg-yellow-500 text-black h-24 rounded-[32px] font-black uppercase text-lg tracking-widest shadow-[0_20px_60px_rgba(234,179,8,0.3)] hover:bg-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                    >
                       {isSubmittingBid ? (
                         <Loader2 className="w-6 h-6 animate-spin" />
                       ) : (
                         'ОТПРАВИТЬ ПРЕДЛОЖЕНИЕ'
                       )}
                    </button>
                    <button onClick={() => setBiddingOrder(null)} className="w-full text-white/20 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Пропустить заказ</button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MATCHED & CONTACT PURCHASE MODAL */}
      <AnimatePresence>
        {matchedOffer && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 30 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.9, opacity: 0, y: 30 }}
               className="relative bg-[#0a0a0a] border-2 border-yellow-500/30 w-full max-w-sm rounded-[48px] p-10 text-center space-y-8 shadow-[0_0_100px_rgba(234,179,8,0.2)]"
             >
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20 animate-pulse" />
                  <div className="relative w-24 h-24 bg-yellow-500 rounded-full mx-auto flex items-center justify-center shadow-2xl">
                    <CheckCircle2 className="w-12 h-12 text-black" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-tighter">🎉 ЗАКАЗ ПОДТВЕРЖДЁН</h3>
                  <div className="bg-yellow-500/10 py-2 rounded-xl border border-yellow-500/10">
                    <p className="text-yellow-500 text-xs font-black uppercase tracking-widest">Цель принята: {formatPrice(matchedOffer.price)}</p>
                  </div>
                </div>

                {(() => {
                  const _orderData = (matchedOffer as any)?.orders || (matchedOffer as any)?.order;
                  const _type = Array.isArray(_orderData) ? _orderData[0]?.type : _orderData?.type;
                  const _details = Array.isArray(_orderData) ? _orderData[0]?.details : _orderData?.details;
                  const _price = getContactPrice(_type, _details);
                  const _hasBalance = (executor?.balance || 0) >= _price;
                  return (
                    <>
                      <div className="bg-white/5 p-6 rounded-3xl space-y-4 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">🔓 Открыть контакт клиента?</p>
                        <div className="flex justify-between items-center px-2">
                          <div className="text-left">
                            <span className="text-[8px] font-black text-white/20 uppercase block">Стоимость</span>
                            <span className="text-xl font-black text-yellow-500">{_price} ₽</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-black text-white/20 uppercase block">Ваш баланс</span>
                            <span className={cn("text-xl font-black", !_hasBalance ? "text-red-500" : "text-white")}>{executor?.balance || 0} ₽</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={unlockContact}
                          disabled={!_hasBalance}
                          className="w-full bg-yellow-500 text-black h-20 rounded-[32px] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl disabled:opacity-30 disabled:grayscale"
                        >
                          КУПИТЬ КОНТАКТ
                        </button>
                        <button onClick={declineMatchedOffer} className="w-full py-2 text-white/20 font-black uppercase text-[10px] tracking-widest hover:text-white transition">Отказаться</button>
                        {!_hasBalance && (
                          <p className="text-red-500 text-[9px] font-black uppercase tracking-widest animate-pulse">Недостаточно средств. Пополните баланс.</p>
                        )}
                      </div>
                    </>
                  );
                })()}
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROFILE MODAL — Telegram-style */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative bg-[#0b0b0c] w-full max-w-lg md:rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Saved indicator */}
              <AnimatePresence>
                {profileSavedIndicator && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-green-500/90 text-black text-[11px] font-bold px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Сохранено
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* ─── HEADER ─── */}
                <div className="px-5 pt-5 pb-4 flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white/5 ring-2 ring-white/[0.06]">
                      <img src={editAvatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop'} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4 text-white/70" />
                    </div>
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => { handleAvatarUpload(e); const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => { const res = r.result as string; triggerAutoSave({ avatar: res }); }; r.readAsDataURL(file); }}} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{editName || 'Исполнитель'}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{editCity || 'Город'} · Исполнитель</p>
                  </div>
                  <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-white/[0.06] rounded-xl transition-all active:scale-90">
                    <CloseIcon className="w-5 h-5 text-white/30" />
                  </button>
                </div>

                <div className="h-px bg-white/[0.08] mx-5" />

                {/* ─── ОСНОВНЫЕ ДАННЫЕ ─── */}
                <div className="px-5 py-4 space-y-1">
                  <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest px-1 pb-2">Основные данные</p>
                  
                  {/* ФИО */}
                  <div className="group rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-colors duration-200 active:scale-[0.98]">
                    <label className="text-[11px] text-white/40 block">ФИО</label>
                    <input 
                      value={editName} 
                      onChange={e => { setEditName(e.target.value); triggerAutoSave({ name: e.target.value }); }}
                      className="w-full bg-transparent text-[16px] font-medium text-white outline-none mt-0.5 placeholder:text-white/20"
                      placeholder="Введите имя"
                    />
                  </div>

                  {/* Телефон */}
                  <div className="group rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-colors duration-200 active:scale-[0.98]">
                    <label className="text-[11px] text-white/40 block">Телефон</label>
                    <input 
                      value={editPhone} 
                      onChange={e => { setEditPhone(e.target.value); triggerAutoSave({ phone: e.target.value }); }}
                      className="w-full bg-transparent text-[16px] font-medium text-white outline-none mt-0.5 placeholder:text-white/20"
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>

                  {/* Город */}
                  <div className="group rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-colors duration-200 active:scale-[0.98]">
                    <label className="text-[11px] text-white/40 block">Город</label>
                    <input 
                      value={editCity} 
                      onChange={e => { setEditCity(e.target.value); triggerAutoSave({ city: e.target.value }); }}
                      className="w-full bg-transparent text-[16px] font-medium text-white outline-none mt-0.5 placeholder:text-white/20"
                      placeholder="Введите город"
                    />
                  </div>
                </div>

                <div className="h-px bg-white/[0.08] mx-5" />

                {/* ─── О СЕБЕ ─── */}
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest px-1 pb-2">О себе</p>
                  <div 
                    onClick={() => setIsBioModalOpen(true)}
                    className="rounded-xl px-3 py-3 hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer active:scale-[0.98] group"
                  >
                    <p className={cn("text-[15px] leading-relaxed line-clamp-3", editBio ? "text-white/80" : "text-white/20")}>
                      {editBio || 'Расскажите о себе, опыте и навыках...'}
                    </p>
                    <span className="text-[10px] text-white/20 mt-1 block group-hover:text-yellow-500/50 transition-colors">Нажмите для редактирования</span>
                  </div>
                </div>

                <div className="h-px bg-white/[0.08] mx-5" />

                {/* ─── УСЛУГИ ─── */}
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest px-1 pb-3">Услуги</p>
                  <div className="flex flex-wrap gap-2 px-1">
                    {[
                      { key: 'loaders', label: 'Грузчики' },
                      { key: 'gazelle', label: 'Газель' },
                      { key: 'furniture', label: 'Сборка' },
                      { key: 'rigging', label: 'Такелаж' },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => toggleService(s.key)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95",
                          services[s.key]
                            ? "bg-yellow-500 text-black"
                            : "bg-white/[0.06] text-white/30 hover:bg-white/[0.1]"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/[0.08] mx-5" />

                {/* ─── СТАТУСЫ ─── */}
                <div className="px-5 py-4 space-y-1">
                  <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest px-1 pb-2">Статусы</p>
                  <div className="rounded-xl px-3 py-3 flex items-center justify-between">
                    <span className="text-[11px] text-white/40">Баланс</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[16px] font-bold text-white">{executor?.balance || 0} ₽</span>
                      {(executor?.balance > 500) && (
                        <button 
                          onClick={async () => {
                            const { error } = await supabase.from('executors').update({ balance: 500 }).eq('id', executor.id);
                            if (!error) {
                              setExecutor({ ...executor, balance: 500 });
                              showToast('Баланс исправлен на 500 ₽', 'success');
                            }
                          }}
                          className="text-[9px] font-bold text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-md hover:bg-yellow-500/10"
                        >
                          Сбросить до 500
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl px-3 py-3 flex items-center justify-between">
                    <span className="text-[11px] text-white/40">Отзывы</span>
                    <span className="text-[16px] font-bold text-white">{executorRating.reviews_count} отзыв{executorRating.reviews_count === 1 ? '' : executorRating.reviews_count < 5 ? 'а' : 'ов'}</span>
                  </div>
                  <div className="rounded-xl px-3 py-3 flex items-center justify-between">
                    <span className="text-[11px] text-white/40">Статус</span>
                    <span className={cn("text-[14px] font-bold flex items-center gap-1.5", isOnline ? "text-green-400" : "text-white/30")}>
                      <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-400" : "bg-white/20")} />
                      {isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-white/[0.08] mx-5" />

                {/* ─── ДОКУМЕНТЫ ─── */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 px-1 pb-3">
                    <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest">Документы</p>
                    {editPassport && editSelfie && (
                      <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Загружены</span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/25 px-1 pb-3">Паспорт и селфи нужны для верификации. Не публикуются.</p>
                  
                  <div className="grid grid-cols-2 gap-3 px-1">
                    <input type="file" ref={editPassportRef} className="hidden" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      console.log('[UPLOAD] Passport file selected:', file.name, file.size);
                      const reader = new FileReader();
                      reader.onloadstart = () => console.log('[UPLOAD] Started reading passport...');
                      reader.onloadend = () => {
                        const result = reader.result as string;
                        console.log('[UPLOAD] Passport read success, length:', result.length);
                        if (result.length > 7000000) { showToast('Файл очень большой. Может грузиться дольше.', 'info'); }
                        setEditPassport(result);
                      };
                      reader.onerror = (err) => console.error('[UPLOAD] Passport reader error:', err);
                      reader.readAsDataURL(file);
                    }} />
                    <div 
                      onClick={() => editPassportRef.current?.click()}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all aspect-[4/3] overflow-hidden group',
                        editPassport ? 'bg-green-500/[0.1]' : 'bg-white/[0.03] hover:bg-white/[0.06]'
                      )}
                    >
                      {editPassport ? (
                        <>
                          {console.log('[RENDER] Rendering passport image, length:', editPassport.length)}
                          <img src={editPassport} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                          <div className="relative z-10 flex flex-col items-center">
                            <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest shadow-sm">Паспорт выбран</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-white/15 group-hover:text-yellow-500/40 transition-colors mb-1" />
                          <span className="text-[11px] font-medium text-white/25">Паспорт</span>
                        </>
                      )}
                    </div>

                    <input type="file" ref={editSelfieRef} className="hidden" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      console.log('[UPLOAD] Selfie file selected:', file.name, file.size);
                      const reader = new FileReader();
                      reader.onloadstart = () => console.log('[UPLOAD] Started reading selfie...');
                      reader.onloadend = () => {
                        const result = reader.result as string;
                        console.log('[UPLOAD] Selfie read success, length:', result.length);
                        if (result.length > 7000000) { showToast('Файл очень большой. Может грузиться дольше.', 'info'); }
                        setEditSelfie(result);
                      };
                      reader.onerror = (err) => console.error('[UPLOAD] Selfie reader error:', err);
                      reader.readAsDataURL(file);
                    }} />
                    <div 
                      onClick={() => editSelfieRef.current?.click()}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all aspect-[4/3] overflow-hidden group',
                        editSelfie ? 'bg-green-500/[0.1]' : 'bg-white/[0.03] hover:bg-white/[0.06]'
                      )}
                    >
                      {editSelfie ? (
                        <>
                          {console.log('[RENDER] Rendering selfie image, length:', editSelfie.length)}
                          <img src={editSelfie} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                          <div className="relative z-10 flex flex-col items-center">
                            <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest shadow-sm">Селфи выбрано</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-white/15 group-hover:text-yellow-500/40 transition-colors mb-1" />
                          <span className="text-[11px] font-medium text-white/25">Селфи</span>
                        </>
                      )}
                    </div>
                  </div>

                  {(editPassport || editSelfie) && (editPassport !== (executor?.passport_photo || '') || editSelfie !== (executor?.selfie_photo || '')) && (
                    <div className="mt-3 px-1">
                      {!(editPassport && editSelfie) && (
                        <p className="text-[9px] text-yellow-500/60 pb-2 italic">Для полной верификации нужны оба документа</p>
                      )}
                      <p className="text-[11px] text-yellow-500/60 bg-yellow-500/[0.05] rounded-lg p-3">
                        ⚠️ Документы будут отправлены на проверку
                      </p>
                      <button
                        onClick={saveProfile}
                        disabled={isSavingProfile || !(editPassport && editSelfie)}
                        className="w-full mt-2 py-3 bg-yellow-500 text-black font-bold text-xs rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(234,179,8,0.2)]"
                      >
                        {isSavingProfile ? 'Отправка...' : 'Отправить документы на проверку'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/[0.08] mx-5" />

                {/* ─── ПОРТФОЛИО ─── */}
                <div className="px-5 py-4 pb-8">
                  <div className="flex items-center justify-between px-1 pb-3">
                    <p className="text-[10px] font-bold text-yellow-500/70 uppercase tracking-widest">Портфолио</p>
                    <button 
                      onClick={() => setIsAddingCase(!isAddingCase)} 
                      className="text-[11px] font-bold text-yellow-500/70 hover:text-yellow-500 transition-colors flex items-center gap-1"
                    >
                      {isAddingCase ? <CloseIcon className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {isAddingCase ? 'Отмена' : 'Добавить'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {isAddingCase && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white/[0.03] rounded-xl p-4 space-y-3 overflow-hidden mb-3">
                        <input placeholder="Название кейса" value={newCase.title} onChange={e => setNewCase({...newCase, title: e.target.value})} className="w-full bg-transparent border-b border-white/10 pb-2 text-sm font-medium outline-none focus:border-yellow-500/50 placeholder:text-white/20" />
                        <div className="flex gap-2">
                          <input placeholder="URL фото" value={newCase.photo.startsWith('data:') ? 'Фото выбрано' : newCase.photo} onChange={e => setNewCase({...newCase, photo: e.target.value})} className="flex-1 bg-transparent border-b border-white/10 pb-2 text-sm font-medium outline-none focus:border-yellow-500/50 placeholder:text-white/20" />
                          <input type="file" ref={portfolioInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                          <button onClick={() => portfolioInputRef.current?.click()} className="p-2 bg-white/[0.06] rounded-lg hover:bg-white/[0.1] transition-colors">
                            <Camera className={cn("w-4 h-4", newCase.photo.startsWith('data:') ? "text-green-500" : "text-white/30")} />
                          </button>
                        </div>
                        {newCase.photo && (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/40">
                            <img src={newCase.photo} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <textarea placeholder="Описание работ..." value={newCase.description} onChange={e => setNewCase({...newCase, description: e.target.value})} className="w-full bg-transparent border-b border-white/10 pb-2 text-sm font-medium outline-none focus:border-yellow-500/50 h-16 resize-none placeholder:text-white/20" />
                        <button onClick={savePortfolioItem} disabled={!newCase.title || !newCase.photo} className="w-full py-2.5 bg-yellow-500 text-black rounded-lg font-bold text-xs disabled:opacity-30 active:scale-[0.98] transition-all">
                          {editingCaseId ? 'Сохранить' : 'Опубликовать'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {portfolio.length > 0 ? (
                    <div className="space-y-2">
                      {portfolio.map(item => (
                        <div key={item.id} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03] transition-colors">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                            <img src={item.photo_url} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                            <p className="text-[11px] text-white/30 truncate">{item.description || 'Без описания'}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingCaseId(item.id); setNewCase({ title: item.title, description: item.description || '', photo: item.photo_url }); setIsAddingCase(true); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                              <Edit className="w-3.5 h-3.5 text-white/40" />
                            </button>
                            <button onClick={() => deletePortfolioItem(item.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400/50" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-white/10 text-xs font-medium">Портфолио пусто</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BIO EDIT SUB-MODAL */}
      <AnimatePresence>
        {isBioModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBioModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative bg-[#0b0b0c] w-full max-w-lg md:rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">О себе</h4>
                <button onClick={() => { setIsBioModalOpen(false); triggerAutoSave({ bio: editBio }); }} className="text-[11px] font-bold text-yellow-500">Готово</button>
              </div>
              <div className="px-5 pb-5">
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  autoFocus
                  className="w-full bg-white/[0.03] rounded-xl p-4 text-[15px] text-white/80 font-medium outline-none min-h-[180px] resize-none placeholder:text-white/20 focus:ring-1 focus:ring-yellow-500/20"
                  placeholder="Расскажите о себе, опыте и навыках..."
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ARCHIVE MODAL */}
      <AnimatePresence>
        {isArchiveOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsArchiveOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-4xl rounded-[48px] overflow-hidden shadow-2xl h-[80vh] flex flex-col">
              <div className="p-8 md:p-12 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Архив заказов</h2>
                <button onClick={() => setIsArchiveOpen(false)} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide">
                 {archivedOrders.map(o => (
                   <div key={o.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] space-y-3 group hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between gap-6">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">{o.type} • {new Date(o.created_at).toLocaleDateString()}</span>
                            {o.status === 'completed' ? (
                              <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Выполнен</span>
                            ) : (
                              <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Отклонён</span>
                            )}
                          </div>
                          <h4 className="text-xl font-black uppercase tracking-tighter truncate">{o.description}</h4>
                          <p className="text-[10px] text-white/30 truncate max-w-md flex items-center gap-1">
                            {o.from_address} {o.to_address && `→ ${o.to_address}`}
                            {(o.details?.fromFloor || o.details?.toFloor) && ` (${o.details?.fromFloor || 1}/${o.details?.toFloor || 1} этаж)`}
                            {o.details?.vehicleType && (
                              <span className={cn(
                                "ml-3 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                o.details.vehicleType === 'Газель' ? "bg-yellow-500/20 text-yellow-500" : "bg-white/5 text-white/20"
                              )}>
                                {o.details.vehicleType === 'Газель' ? 'НУЖНА ГАЗЕЛЬ' : 'БЕЗ ГАЗЕЛИ'}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-right">
                            <span className="text-[8px] text-white/20 uppercase font-black block">Бюджет</span>
                            <span className="text-xl font-black text-yellow-500">{o.price_estimate} ₽</span>
                          </div>
                          <button onClick={() => setSelectedOrderDetails(o)} className="bg-white/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all">Подробнее</button>
                        </div>
                      </div>
                   </div>
                 ))}
                 {archivedOrders.length === 0 && (
                   <div className="py-20 text-center space-y-4">
                     <ClipboardList className="w-12 h-12 text-white/5 mx-auto" />
                     <p className="text-white/20 text-xs font-black uppercase tracking-widest">Архив пуст</p>
                   </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrderDetails(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Детали заказа</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{selectedOrderDetails.type} • {new Date(selectedOrderDetails.created_at).toLocaleDateString()}</span>
                    {selectedOrderDetails.status === 'completed' ? (
                      <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Выполнен</span>
                    ) : (
                      <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full uppercase">Отклонён</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedOrderDetails(null)} className="bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-5">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Описание</span>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{selectedOrderDetails.description}</p>
                </div>
                {selectedOrderDetails.from_address && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Маршрут</span>
                    <p className="text-sm text-white/60">{selectedOrderDetails.from_address} {selectedOrderDetails.to_address && `→ ${selectedOrderDetails.to_address}`}</p>
                  </div>
                )}
                {selectedOrderDetails.phone && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Телефон заказчика</span>
                    <a href={`tel:${selectedOrderDetails.phone}`} className="text-sm text-yellow-500 font-bold">{selectedOrderDetails.phone}</a>
                  </div>
                )}
                <div className="flex items-center gap-6">
                  {selectedOrderDetails.price_estimate && (
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Бюджет</span>
                      <span className="text-2xl font-black text-yellow-500">{selectedOrderDetails.price_estimate} ₽</span>
                    </div>
                  )}
                  {selectedOrderDetails.movers_count && (
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Грузчики</span>
                      <span className="text-sm font-black text-white/60">{selectedOrderDetails.movers_count} чел</span>
                    </div>
                  )}
                </div>
                {(selectedOrderDetails.details?.fromFloor || selectedOrderDetails.details?.toFloor) && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Этажи</span>
                    <p className="text-sm text-white/60">{selectedOrderDetails.details?.fromFloor || 1} → {selectedOrderDetails.details?.toFloor || 1}</p>
                  </div>
                )}
                {selectedOrderDetails.details?.vehicleType && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">Транспорт</span>
                    <p className="text-sm text-white/60">{selectedOrderDetails.details.vehicleType}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN WORK MODAL */}
      <AnimatePresence>
        {isInWorkOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInWorkOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-4xl rounded-[48px] overflow-hidden shadow-2xl h-[80vh] flex flex-col">
              <div className="p-8 md:p-12 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                   <CheckCircle className="w-8 h-8 text-yellow-500" />
                   В работе
                </h2>
                <button onClick={() => setIsInWorkOpen(false)} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                 {activeOrders.map(o => {
                    // Parse description into structured parts
                    const descLines = (o.description || '').split('\n').map(l => l.trim()).filter(Boolean);
                    const titleLine = descLines.find(l => /грузчик|газель|переезд|такелаж|сборка/i.test(l)) || descLines[0] || o.type || 'Заказ';
                    const nameLine = descLines.find(l => /^имя:/i.test(l))?.replace(/^имя:\s*/i, '') || '';
                    const dateLine = descLines.find(l => /\d{1,2}\s*(янв|фев|мар|апр|мая|июн|июл|авг|сен|окт|ноя|дек)|в\s+\d{1,2}:\d{2}/i.test(l)) || '';
                    
                    return (
                    <div key={o.id} className="bg-yellow-500/[0.03] border border-yellow-500/20 p-6 rounded-3xl space-y-4">
                      {/* Top row: info + actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h3 className="text-lg font-black uppercase tracking-tight text-white leading-tight truncate">{titleLine}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            {nameLine && (
                              <span className="text-xs font-bold text-yellow-500">{nameLine}</span>
                            )}
                            {dateLine && (
                              <span className="text-[10px] font-bold text-white/40 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {dateLine}
                              </span>
                            )}
                            {o.movers_count && (
                              <span className="text-[10px] font-bold text-white/40">{o.movers_count} чел.</span>
                            )}
                            {o.details?.vehicleType && (
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                o.details.vehicleType === 'Газель' ? "bg-yellow-500/20 text-yellow-500" : "bg-white/5 text-white/30"
                              )}>
                                {o.details.vehicleType === 'Газель' ? 'ГАЗЕЛЬ' : 'БЕЗ ГАЗЕЛИ'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-white/30 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-yellow-500/60 flex-shrink-0" />
                            {o.from_address}{o.to_address ? ` → ${o.to_address}` : ''}
                            {(o.details?.fromFloor || o.details?.toFloor) && ` (${o.details?.fromFloor || 1}→${o.details?.toFloor || 1} эт.)`}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={`tel:${o.users?.phone}`} className="h-12 px-4 bg-black/40 border border-white/5 rounded-2xl flex items-center gap-2 text-yellow-500 hover:text-white transition font-black text-sm">
                            <Phone className="w-4 h-4" /> {o.users?.phone}
                          </a>
                          <button onClick={() => { 
                            setChatDetails({ orderId: o.id, name: o.client_name ? `${o.client_name} (заказчик)` : 'Заказчик', receiverId: o.user_id }); 
                            setChatOrderId(o.id);
                            setIsInWorkOpen(false); 
                          }} className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-black">
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCompleteOrderTarget(o); setCaseForm({ title: titleLine, photo: '', description: '' }); }}
                            className="h-12 px-4 bg-green-500 hover:bg-green-400 text-black font-black text-[9px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Выполнен
                          </button>
                          <button onClick={() => {
                            if(confirm('Удалить заказ?')) archiveOrder(o.id);
                          }} className="w-12 h-12 bg-white/5 border border-white/5 hover:bg-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all text-white/20">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {activeOrders.length === 0 && (
                     <div className="py-20 text-center space-y-4">
                        <CheckCircle className="w-12 h-12 text-white/5 mx-auto" />
                        <p className="text-white/20 text-xs font-black uppercase tracking-widest">Нет активных заказов</p>
                     </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complete Order + Case Creation Modal */}
      <AnimatePresence>
        {completeOrderTarget && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { if (!isCompletingOrder) { setCompleteOrderTarget(null); setCaseForm({ title: '', photo: '', description: '' }); } }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_80px_rgba(234,179,8,0.1)]"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                    Завершить заказ
                  </h2>
                  <button onClick={() => { if (!isCompletingOrder) { setCompleteOrderTarget(null); setCaseForm({ title: '', photo: '', description: '' }); } }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <CloseIcon className="w-5 h-5 text-white/50" />
                  </button>
                </div>
                <p className="text-xs text-white/40 font-bold mt-2 uppercase tracking-widest">
                  {completeOrderTarget.description}
                </p>
              </div>

              {/* Form */}
              <div className="p-8 space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Название кейса</label>
                  <input
                    value={caseForm.title}
                    onChange={(e) => setCaseForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: Переезд 3-к квартиры"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-yellow-500/50 transition-colors"
                  />
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Фото работы</label>
                  <input type="file" ref={casePhotoInputRef} className="hidden" accept="image/*" onChange={handleCasePhotoUpload} />
                  <button
                    onClick={() => casePhotoInputRef.current?.click()}
                    className={cn(
                      "w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all",
                      caseForm.photo ? "border-green-500/50 bg-green-500/5" : "border-white/10 bg-white/[0.02] hover:border-yellow-500/50 hover:bg-white/5"
                    )}
                  >
                    {caseForm.photo ? (
                      <div className="flex items-center gap-3">
                        <img src={caseForm.photo} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="text-left">
                          <p className="text-xs font-black text-green-500 uppercase">Фото загружено</p>
                          <p className="text-[10px] text-white/30">Нажмите чтобы заменить</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-white/20" />
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Нажмите для загрузки</p>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Описание работы</label>
                  <textarea
                    value={caseForm.description}
                    onChange={(e) => setCaseForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Опишите что было сделано..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="px-8 pb-8 space-y-3">
                <button
                  onClick={completeOrderWithCase}
                  disabled={isCompletingOrder}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm uppercase tracking-widest rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3"
                >
                  {isCompletingOrder ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Завершение...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Опубликовать кейс</>
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (!completeOrderTarget || !executor) return;
                    setIsCompletingOrder(true);
                    try {
                      await supabase.from('orders').update({ status: 'completed' }).eq('id', completeOrderTarget.id);
                      showToast('Заказ завершён!', 'success');
                      setCompleteOrderTarget(null);
                      setCaseForm({ title: '', photo: '', description: '' });
                      fetchOrders();
                    } catch (err: any) {
                      showToast('Ошибка: ' + (err.message || 'Не удалось завершить'), 'error');
                    } finally {
                      setIsCompletingOrder(false);
                    }
                  }}
                  disabled={isCompletingOrder}
                  className="w-full py-3 text-white/30 hover:text-white/60 font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Пропустить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contactModalData && !chatDetails && (
          <ContactUnlockedModal
            executor={contactModalData.executor}
            chatId={contactModalData.chatId}
            mode="executor"
            onOpenChat={() => {
              setChatDetails({
                chatId: contactModalData.chatId,
                orderId: contactModalData.orderId,
                name: contactModalData.executor?.name ? `${contactModalData.executor.name} (заказчик)` : 'Заказчик',
                receiverId: contactModalData.receiverId
              });
              setContactModalData(null);
            }}
            onClose={() => setContactModalData(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatListOpen && executor && (
          <ChatList 
            currentUserId={executor.id}
            onlineUsers={onlineUsers}
            onOpenChat={(chatId, name, otherId) => {
              setChatDetails({ chatId, name, receiverId: otherId, orderId: 'general' });
              setIsChatListOpen(false);
            }}
            onClose={() => setIsChatListOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatDetails && (
          <ChatDialog 
            orderId={chatDetails.orderId || 'general'} 
            chatId={chatDetails.chatId}
            participantId={executor?.id} 
            receiverId={chatDetails.receiverId}
            isExecutor={true} 
            participantName={chatDetails.name} 
            onClose={() => setChatDetails(null)} 
            onlineUsers={onlineUsers}
          />
        )}
      </AnimatePresence>

      {/* Reviews Modal */}
      <AnimatePresence>
        {isReviewsOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsReviewsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_80px_rgba(234,179,8,0.1)] max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                      <Star className="w-6 h-6 text-yellow-500" />
                      Отзывы
                    </h2>
                    {executorRating.rating && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl font-black text-yellow-500">{executorRating.rating.toFixed(1)}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                "w-4 h-4",
                                s <= Math.round(executorRating.rating || 0)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-white/10"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-white/40">({executorRating.reviews_count} отзывов)</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setIsReviewsOpen(false);
                      setUnreadReviewsCount(0);
                    }}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <CloseIcon className="w-5 h-5 text-white/50" />
                  </button>
                </div>
              </div>

              {/* Reviews List */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-white/20">
                    <Star className="w-10 h-10 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">Пока нет отзывов</p>
                    <p className="text-[10px] text-white/30 mt-2">Завершите заказ, чтобы получить первую оценку</p>
                  </div>
                ) : (
                  reviews.map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-yellow-500" />
                          </div>
                          <span className="text-sm font-bold text-white">
                            {review.client_name || 'Заказчик'}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/30">
                          {new Date(review.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "w-4 h-4",
                              s <= review.rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-white/10"
                            )}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-white/70 leading-relaxed">{review.comment}</p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Verification Modal */}
      <AnimatePresence>
        {isVerificationOpen && (
          <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
              onClick={() => { if (!isSubmittingVerification) setIsVerificationOpen(false); }} 
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md z-10"
            >
              {/* Close */}
              <button 
                onClick={() => { if (!isSubmittingVerification) setIsVerificationOpen(false); }}
                className="absolute -top-12 right-0 text-white/20 hover:text-white/50 transition-colors"
              >
                <CloseIcon className="w-6 h-6" />
              </button>

              <div className="space-y-6">
                {/* Bonus Badge */}
                <div className="flex justify-center">
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-black tracking-wide"
                  >
                    💰 Бонус 500 ₽
                  </motion.span>
                </div>

                {/* Header */}
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-white">Подтвердите профиль</h2>
                  <p className="text-white/30 text-sm">Займёт ~30 секунд</p>
                </div>

                {/* Progress Bar */}
                <div className="max-w-xs mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Прогресс</span>
                    <span className="text-[9px] font-black text-white/30">
                      {(verifyPassport ? 1 : 0) + (verifySelfie ? 1 : 0)} / 2
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${((verifyPassport ? 1 : 0) + (verifySelfie ? 1 : 0)) * 50}%` }}
                    />
                  </div>
                </div>

                {/* Step Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <input type="file" ref={verifyPassportRef} className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const result = reader.result as string;
                      if (result.length > 3000000) { alert('Файл слишком большой. До 2МБ.'); return; }
                      setVerifyPassport(result);
                    };
                    reader.readAsDataURL(file);
                  }} />
                  <div 
                    onClick={() => verifyPassportRef.current?.click()} 
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-3xl p-6 cursor-pointer transition-all duration-300 overflow-hidden aspect-[3/4] group',
                      verifyPassport 
                        ? 'bg-green-500/5 border-2 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]' 
                        : 'bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-yellow-500/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(234,179,8,0.05)] active:scale-[0.97]'
                    )}
                  >
                    {verifyPassport ? (
                      <>
                        <img src={verifyPassport} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }} 
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          className="relative z-10 flex flex-col items-center"
                        >
                          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                          </div>
                          <span className="text-xs font-black text-green-400 uppercase tracking-widest">Готово</span>
                        </motion.div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                          <Camera className="w-7 h-7 text-white/20 group-hover:text-yellow-500/60 transition-colors" />
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Шаг 1</span>
                          <span className="text-sm font-bold text-white/60 mt-1 block">Паспорт</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <input type="file" ref={verifySelfieRef} className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const result = reader.result as string;
                      if (result.length > 3000000) { alert('Файл слишком большой. До 2МБ.'); return; }
                      setVerifySelfie(result);
                    };
                    reader.readAsDataURL(file);
                  }} />
                  <div 
                    onClick={() => verifySelfieRef.current?.click()} 
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-3xl p-6 cursor-pointer transition-all duration-300 overflow-hidden aspect-[3/4] group',
                      verifySelfie 
                        ? 'bg-green-500/5 border-2 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]' 
                        : 'bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-yellow-500/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(234,179,8,0.05)] active:scale-[0.97]'
                    )}
                  >
                    {verifySelfie ? (
                      <>
                        <img src={verifySelfie} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }} 
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          className="relative z-10 flex flex-col items-center"
                        >
                          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                          </div>
                          <span className="text-xs font-black text-green-400 uppercase tracking-widest">Готово</span>
                        </motion.div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                          <User className="w-7 h-7 text-white/20 group-hover:text-yellow-500/60 transition-colors" />
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Шаг 2</span>
                          <span className="text-sm font-bold text-white/60 mt-1 block">Селфи</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Micro text */}
                <p className="text-center text-[11px] text-white/15">🔒 Документы не публикуются</p>

                {/* CTA */}
                <div className="space-y-3">
                  {(verifyPassport && verifySelfie) ? (
                    <button
                      onClick={async () => {
                        if (!executor?.id) return;
                        setIsSubmittingVerification(true);
                        try {
                          // Save verification documents
                          await supabase.from('verification_documents').upsert([{
                            user_id: executor.id,
                            passport_url: verifyPassport,
                            selfie_url: verifySelfie,
                            status: 'pending',
                          }], { onConflict: 'user_id' });

                          // Update executor: save photos, set verification pending, send for admin review
                          const now = new Date().toLocaleString('ru-RU');
                          const prevComment = (executor.admin_comment || '').replace(/\n\n✅ Исправлено:[\s\S]*$/, '');
                          const newComment = (prevComment ? prevComment + '\n\n' : '') + `✅ Исправлено: ${now}`;
                          const verifyPayload: any = { 
                            status: 'pending',
                            passport_photo: verifyPassport,
                            selfie_photo: verifySelfie,
                            admin_comment: newComment,
                            verification_status: 'pending',
                          };
                          
                          // Remove automatic balance +500 to avoid duplicates
                          let vErr = (await supabase.from('executors').update(verifyPayload).eq('id', executor.id)).error;
                          if (vErr && vErr.message?.includes('verification_status')) {
                            const { verification_status, ...vFallback } = verifyPayload;
                            await supabase.from('executors').update(vFallback).eq('id', executor.id);
                          }

                          setVerificationStatus('pending');
                          setExecutor({ ...executor, status: 'pending', admin_comment: newComment, passport_photo: verifyPassport, selfie_photo: verifySelfie });
                          showToast('Документы отправлены на проверку!', 'success');
                          if (navigator.vibrate) navigator.vibrate(200);
                          setIsVerificationOpen(false);
                          setVerifyPassport('');
                          setVerifySelfie('');
                        } catch (err: any) {
                          showToast('Ошибка: ' + (err.message || 'Не удалось отправить'), 'error');
                        } finally {
                          setIsSubmittingVerification(false);
                        }
                      }}
                      disabled={isSubmittingVerification}
                      className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-black text-lg rounded-3xl transition-all shadow-[0_0_40px_rgba(234,179,8,0.2)] hover:shadow-[0_0_60px_rgba(234,179,8,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isSubmittingVerification ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Отправка...</>
                      ) : (
                        'Получить 500 ₽'
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-5 bg-white/5 text-white/20 font-black text-lg rounded-3xl cursor-not-allowed"
                    >
                      Загрузите 2 фото
                    </button>
                  )}
                  <button
                    onClick={() => { setIsVerificationOpen(false); setVerifyPassport(''); setVerifySelfie(''); }}
                    disabled={isSubmittingVerification}
                    className="w-full py-3 text-white/20 hover:text-white/40 font-medium text-sm transition-colors"
                  >
                    Сделать позже
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOPUP MODAL */}
      <AnimatePresence>
        {showTopupModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTopupModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-3xl p-7 space-y-6 shadow-2xl"
              style={{ background: 'rgba(18,18,18,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <button onClick={() => setShowTopupModal(false)} className="absolute top-5 right-5 text-white/20 hover:text-white transition">
                <CloseIcon className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Пополнение баланса</h3>
                <p className="text-[11px] text-white/30 mt-1">Выберите сумму или введите свою</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['500', '1000', '2000'].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(amt)}
                    className={cn(
                      "h-12 rounded-2xl font-black text-sm transition-all",
                      topupAmount === amt ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30" : "bg-white/[0.06] text-white/60 hover:bg-white/10"
                    )}
                  >
                    {parseInt(amt).toLocaleString()} ₽
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="Своя сумма, ₽"
                  className="w-full h-12 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 text-white font-bold text-sm outline-none focus:border-yellow-500/40 placeholder:text-white/20"
                />
              </div>

              <button
                onClick={() => {
                  const amount = parseInt(topupAmount);
                  if (!amount || amount < 100) { return; }
                  // TODO: Integrate with YooKassa payment
                  alert(`Оплата ${amount} ₽ — интеграция с ЮKassa в разработке`);
                  setShowTopupModal(false);
                  setTopupAmount('');
                }}
                disabled={!topupAmount || parseInt(topupAmount) < 100}
                className="w-full h-14 rounded-2xl bg-yellow-500 text-black font-black uppercase text-sm tracking-widest hover:bg-yellow-400 hover:scale-[1.02] transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                💳 Оплатить {topupAmount ? `${parseInt(topupAmount).toLocaleString()} ₽` : ''}
              </button>

              <p className="text-center text-[10px] text-white/20 leading-relaxed">
                Нажимая «Оплатить», вы принимаете{' '}
                <a href="/offer" target="_blank" className="text-yellow-500/60 hover:text-yellow-500 underline underline-offset-2">публичную оферту</a>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
