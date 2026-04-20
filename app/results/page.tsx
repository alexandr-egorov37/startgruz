'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle, 
  Send, 
  ExternalLink,
  Star,
  MapPin,
  X,
  Phone
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PortfolioItem {
  id: string;
  photo: string;
  title: string;
  description: string;
}

interface Executor {
  id: string;
  name: string;
  city: string;
  avatar: string;
  description: string;
  rating: number;
  is_online?: boolean; // deprecated, use online_status from presence
  online_status?: boolean;
  status: string;
  avito_url: string;
  whatsapp_phone: string;
  telegram_username: string;
  max_platform_url: string;
  phone: string;
  portfolio: PortfolioItem[];
}

function ResultsInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const city = searchParams?.get('city') || '';
    const orderId = searchParams?.get('order_id');

    const [executors, setExecutors] = useState<Executor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPerf, setSelectedPerf] = useState<Executor | null>(null);
    const [fullScreenWork, setFullScreenWork] = useState<PortfolioItem | null>(null);

    useEffect(() => {
        const presenceChannel = supabase.channel('online-users');
        
        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const onlineIds = new Set(Object.keys(state));
            setExecutors(prev => prev.map(ex => ({
              ...ex,
              online_status: onlineIds.has(ex.id)
            })));
          })
          .subscribe();

        async function fetchExecutors() {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('executors')
                    .select(`
                        *,
                        portfolio:executor_portfolio(*)
                    `)
                    .eq('status', 'verified')
                    .order('rating', { ascending: false });

                if (error) throw error;

                const filtered = (data as any[] || []).filter(ex => 
                    ex.portfolio && ex.portfolio.length >= 3 && 
                    (!city || ex.city.toLowerCase() === city.toLowerCase())
                );
                
                // Set initial executors (online status will be updated by 'sync' event)
                setExecutors(filtered);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchExecutors();
        return () => { supabase.removeChannel(presenceChannel); };
    }, [city]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                    <p className="text-white/40 uppercase font-black tracking-widest text-xs">Ищем мастеров...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#050505] text-white p-4 md:p-12 relative overflow-x-hidden">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-yellow-500/5 blur-[180px] rounded-full pointer-events-none" />
            
            <div className="max-w-6xl mx-auto space-y-12 z-10 relative">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
                    <div className="space-y-4">
                        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-white/40 hover:text-white transition group uppercase text-[10px] font-black tracking-widest leading-none bg-white/5 px-4 py-2 rounded-full border border-white/5">
                            <ChevronLeft className="w-4 h-4" /> Назад
                        </button>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                            Проверенные <br /> <span className="text-yellow-500">мастера</span>
                        </h1>
                        <div className="flex items-center gap-2 text-white/40 font-bold uppercase text-[10px] tracking-widest">
                            <MapPin className="w-3 h-3 text-yellow-500" /> {city || 'Все города'} • {executors.length} онлайн
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-12">
                    {executors.map((ex) => (
                        <div key={ex.id} className="bg-white/5 border border-white/10 rounded-[48px] overflow-hidden group hover:border-white/20 transition-all duration-500 shadow-2xl">
                            <div className="grid grid-cols-1 lg:grid-cols-12">
                                
                                {/* 1. Profile Sidebar */}
                                <div className="lg:col-span-4 p-10 space-y-8 bg-white/[0.02] border-r border-white/5">
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="relative">
                                            <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white/10 shadow-2xl">
                                                <img src={ex.avatar} alt={ex.name} className="w-full h-full object-cover" />
                                            </div>
                                            {ex.online_status && (
                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-[#050505] rounded-full animate-pulse" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <h2 className="text-2xl font-black tracking-tight">{ex.name}</h2>
                                                {ex.status === 'verified' && <ShieldCheck className="w-6 h-6 text-green-500 fill-green-500/20" />}
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase text-yellow-500 tracking-widest">
                                               <Star className="w-3 h-3 fill-yellow-500" /> {ex.rating || 5.0} • {ex.city}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-white/50 leading-relaxed text-center px-4">
                                        "{ex.description}"
                                    </p>

                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={() => setSelectedPerf(ex)}
                                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-yellow-500/20 uppercase tracking-tighter text-lg"
                                        >
                                            Связаться с мастером
                                        </button>
                                        
                                        <div className="flex items-center justify-center gap-3">
                                            {ex.whatsapp_phone && (
                                                <a href={`https://wa.me/${ex.whatsapp_phone}`} target="_blank" className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center hover:bg-green-500 hover:text-black transition-all group">
                                                    <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                </a>
                                            )}
                                            {ex.telegram_username && (
                                                <a href={`https://t.me/${ex.telegram_username.replace('@','')}`} target="_blank" className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all group">
                                                    <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                </a>
                                            )}
                                            {ex.avito_url && (
                                                <a href={ex.avito_url} target="_blank" className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all group">
                                                    <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Portfolio Slider */}
                                <div className="lg:col-span-8 p-10 flex flex-col justify-center bg-black/20">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Примеры работ</h3>
                                        <div className="flex gap-2">
                                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer">
                                                <ChevronLeft className="w-4 h-4" />
                                            </div>
                                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x no-scrollbar">
                                        {ex.portfolio.map((work) => (
                                            <div 
                                                key={work.id} 
                                                onClick={() => setFullScreenWork(work)}
                                                className="min-w-[280px] md:min-w-[320px] aspect-[4/5] bg-white/5 rounded-[40px] overflow-hidden relative group/work cursor-pointer snap-start"
                                            >
                                                <img src={work.photo} className="w-full h-full object-cover group-hover/work:scale-110 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover/work:opacity-90 transition-opacity" />
                                                <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-4 group-hover/work:translate-y-0 transition-transform duration-500">
                                                    <h4 className="text-xl font-black uppercase leading-none mb-2">{work.title}</h4>
                                                    <p className="text-[10px] font-bold text-white/60 line-clamp-2 uppercase tracking-widest opacity-0 group-hover/work:opacity-100 transition-opacity">
                                                        {work.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FULLSCREEN WORK MODAL */}
            {fullScreenWork && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
                    <button onClick={() => setFullScreenWork(null)} className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors">
                        <X className="w-10 h-10" />
                    </button>
                    <div className="max-w-6xl w-full h-full flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-2/3 h-[60vh] md:h-full rounded-3xl overflow-hidden shadow-2xl">
                             <img src={fullScreenWork.photo} className="w-full h-full object-contain bg-black/50" />
                        </div>
                        <div className="w-full md:w-1/3 space-y-6 text-center md:text-left">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">{fullScreenWork.title}</h2>
                            <p className="text-white/60 text-lg leading-relaxed">{fullScreenWork.description}</p>
                            <button onClick={() => setFullScreenWork(null)} className="py-4 px-10 border border-white/20 rounded-2xl hover:bg-white hover:text-black transition-all font-black uppercase text-xs tracking-widest">
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTACT MODAL */}
            {selectedPerf && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md p-10 rounded-[48px] space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-4">
                            <div className="w-24 h-24 rounded-[32px] overflow-hidden mx-auto border-2 border-yellow-500 shadow-2xl">
                                <img src={selectedPerf.avatar} className="w-full h-full object-cover" />
                            </div>
                            <h2 className="text-3xl font-black">{selectedPerf.name}</h2>
                            <p className="text-white/40 uppercase font-black text-[10px] tracking-widest">Выберите удобный способ связи:</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-center">
                             <a href={`tel:${selectedPerf.phone}`} className="flex items-center justify-center gap-4 bg-white text-black py-6 rounded-3xl font-black text-xl hover:bg-white/90 transition-all group">
                                <Phone className="w-6 h-6" /> {selectedPerf.phone}
                            </a>
                            <div className="grid grid-cols-2 gap-4">
                                <a href={`https://wa.me/${selectedPerf.whatsapp_phone}`} className="flex flex-col items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 py-6 rounded-3xl hover:bg-green-500 hover:text-black transition-all group">
                                    <MessageCircle className="w-6 h-6" />
                                    <span className="text-[8px] font-black uppercase">WhatsApp</span>
                                </a>
                                <a href={`https://t.me/${selectedPerf.telegram_username?.replace('@','')}`} className="flex flex-col items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 py-6 rounded-3xl hover:bg-blue-500 hover:text-white transition-all group">
                                    <Send className="w-6 h-6" />
                                    <span className="text-[8px] font-black uppercase">Telegram</span>
                                </a>
                            </div>
                        </div>

                        <button onClick={() => setSelectedPerf(null)} className="w-full text-white/30 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest">
                            Отмена
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function Results() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" /></div>}>
            <ResultsInner />
        </Suspense>
    );
}
