'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Clock, CheckCircle2, XCircle, RefreshCw, Users, ChevronRight, Phone, MapPin, Calendar, LogOut, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../../lib/utils';

type Status = 'all' | 'pending' | 'approved' | 'rejected' | 'revision';

interface Executor {
  id: string;
  name: string;
  phone: string;
  city: string;
  status: string;
  created_at: string;
  avatar: string;
  balance?: number;
  admin_comment?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: 'Новая заявка',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  approved: { label: 'Одобрен',        color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: CheckCircle2 },
  verified: { label: 'Верифицирован',  color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: ShieldCheck },
  rejected: { label: 'Отклонён',       color: 'text-red-400 bg-red-500/10 border-red-500/20',         icon: XCircle },
  revision: { label: 'На доработке',   color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: RefreshCw },
};

const FILTERS: { key: Status; label: string }[] = [
  { key: 'all',      label: 'Все' },
  { key: 'pending',  label: 'Новые' },
  { key: 'approved', label: 'Одобренные' },
  { key: 'rejected', label: 'Отклонённые' },
  { key: 'revision', label: 'На исправлении' },
];

export default function AdminPage() {
  const router = useRouter();
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [filter, setFilter] = useState<Status>('all');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const prevSnapshotRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (!isAuth) {
      router.replace('/admin/login');
      return;
    }
    setAuthChecked(true);
    fetchExecutors();
  }, []);

  // Polling: check for changes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchExecutorsSilent();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Realtime: also listen if Replication is enabled
  useEffect(() => {
    const channel = supabase.channel('admin-executors-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executors' }, () => {
        fetchExecutorsSilent();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function playNotificationSound() {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function detectResubmissions(newData: Executor[]) {
    const prev = prevSnapshotRef.current;
    for (const exec of newData) {
      const prevComment = prev[exec.id] || '';
      // Detect if admin_comment now has the resubmission marker that wasn't there before
      if (
        exec.admin_comment?.includes('✅ Исправлено:') &&
        !prevComment.includes('✅ Исправлено:') &&
        exec.status === 'pending'
      ) {
        playNotificationSound();
        break;
      }
      // Also detect if the timestamp changed (re-submitted again)
      const prevTime = prevComment.match(/✅ Исправлено: (.+)/)?.[1] || '';
      const newTime = (exec.admin_comment || '').match(/✅ Исправлено: (.+)/)?.[1] || '';
      if (newTime && newTime !== prevTime && exec.status === 'pending') {
        playNotificationSound();
        break;
      }
    }
    // Update snapshot
    const snap: Record<string, string> = {};
    for (const e of newData) snap[e.id] = e.admin_comment || '';
    prevSnapshotRef.current = snap;
  }

  async function fetchExecutors() {
    setLoading(true);
    const { data, error } = await supabase
      .from('executors')
      .select('id, name, phone, city, status, created_at, avatar, balance, admin_comment')
      .order('created_at', { ascending: false });
    if (!error && data) {
      detectResubmissions(data);
      setExecutors(data);
    }
    setLoading(false);
  }

  async function handleQuickApprove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await supabase.from('executors').update({ status: 'approved' }).eq('id', id);
    fetchExecutorsSilent();
  }

  async function handleQuickReject(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await supabase.from('executors').update({ status: 'rejected' }).eq('id', id);
    fetchExecutorsSilent();
  }

  async function fetchExecutorsSilent() {
    const { data, error } = await supabase
      .from('executors')
      .select('id, name, phone, city, status, created_at, avatar, balance, admin_comment')
      .order('created_at', { ascending: false });
    if (!error && data) {
      detectResubmissions(data);
      setExecutors(data);
    }
  }

  const filtered = filter === 'all' ? executors : executors.filter(e => e.status === filter);

  const counts: Record<Status, number> = {
    all:      executors.length,
    pending:  executors.filter(e => e.status === 'pending').length,
    approved: executors.filter(e => e.status === 'approved' || e.status === 'verified').length,
    rejected: executors.filter(e => e.status === 'rejected').length,
    revision: executors.filter(e => e.status === 'revision').length,
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* ════════════════════════════════════════
          DESKTOP LAYOUT (md+)
          ════════════════════════════════════════ */}
      <div className="hidden md:block relative z-10 max-w-6xl mx-auto px-4 py-10 space-y-10">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">Модерация</h1>
              <p className="text-white/30 text-xs uppercase tracking-widest font-bold mt-0.5">Панель администратора</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl">
              <Users className="w-4 h-4 text-white/40" />
              <span className="text-sm font-black">{executors.length}</span>
              <span className="text-white/30 text-xs uppercase tracking-widest">исполнителей</span>
            </div>
            <button onClick={fetchExecutors} className="w-10 h-10 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
              <RefreshCw className="w-4 h-4 text-white/40" />
            </button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); router.replace('/admin/login'); }} className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center hover:bg-red-500/20 transition-all">
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </header>
        <div className="flex gap-3 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn('px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border',
                filter === f.key ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white/60'
              )}>
              {f.label} <span className={cn('ml-2 px-2 py-0.5 rounded-full text-[10px]', filter === f.key ? 'bg-black/20' : 'bg-white/10')}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-40"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-40 space-y-3"><p className="text-4xl font-black text-white/10 uppercase">Пусто</p><p className="text-white/20 text-sm">Заявок по этому фильтру нет</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(exec => {
              const st = STATUS_CONFIG[exec.status] || STATUS_CONFIG['pending'];
              const StatusIcon = st.icon;
              return (
                <div key={exec.id} onClick={() => router.push(`/admin/executor?id=${exec.id}`)}
                  className="group bg-white/[0.03] border border-white/5 hover:border-yellow-500/20 rounded-[28px] p-6 flex items-center gap-6 cursor-pointer transition-all duration-300 hover:bg-white/5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
                    {exec.avatar ? <img src={exec.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white/10">{(exec.name || '?')[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-lg text-white truncate">{exec.name || 'Без имени'}</span>
                      <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border', st.color)}><StatusIcon className="w-3 h-3" />{st.label}</span>
                    </div>
                    <div className="flex items-center gap-5 text-white/30 text-xs font-bold flex-wrap">
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{exec.phone}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{exec.city}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{new Date(exec.created_at).toLocaleDateString('ru-RU')}</span>
                      <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-lg"><span className="text-[10px] opacity-60">Баланс:</span> {exec.balance || 0} ₽</span>
                    </div>
                    {exec.admin_comment && (
                      <div className="flex items-center gap-2">
                        {exec.admin_comment.includes('✅ Исправлено:') && (<span className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-black text-green-400 uppercase tracking-wider flex-shrink-0 animate-pulse"><CheckCircle2 className="w-3 h-3" /> Исправлено</span>)}
                        <p className="text-orange-400/70 text-xs font-medium truncate">💬 {exec.admin_comment.replace(/\n\n✅ Исправлено:[\s\S]*$/, '')}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-yellow-500 transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          MOBILE LAYOUT (<md)
          ════════════════════════════════════════ */}
      <div className="md:hidden relative z-10 flex flex-col" style={{ minHeight: '100dvh', paddingBottom: 'calc(68px + env(safe-area-inset-bottom))' }}>

        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight leading-none">Модерация</h1>
              <p className="text-white/25 text-[9px] uppercase tracking-widest mt-0.5">{executors.length} исполнителей</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchExecutors} className="w-9 h-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center active:scale-90 transition-all">
              <RefreshCw className="w-4 h-4 text-white/40" />
            </button>
            <button onClick={() => { localStorage.removeItem('admin_auth'); router.replace('/admin/login'); }} className="w-9 h-9 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center active:scale-90 transition-all">
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Mobile List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-32"><div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32 space-y-2">
              <p className="text-3xl font-black text-white/10 uppercase">Пусто</p>
              <p className="text-white/20 text-sm">Заявок нет</p>
            </div>
          ) : filtered.map(exec => {
            const st = STATUS_CONFIG[exec.status] || STATUS_CONFIG['pending'];
            const StatusIcon = st.icon;
            const isFixed = exec.status === 'approved' || exec.status === 'verified' || exec.status === 'rejected';
            return (
              <div key={exec.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: exec.admin_comment?.includes('✅ Исправлено:') ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Card main row */}
                <div className="flex items-start gap-3 p-3" onClick={() => router.push(`/admin/executor?id=${exec.id}`)}
                  style={{ cursor: 'pointer' }}>
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
                    {exec.avatar ? <img src={exec.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black text-white/15">{(exec.name || '?')[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm text-white leading-tight">{exec.name || 'Без имени'}</span>
                      <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border flex-shrink-0', st.color)}>
                        <StatusIcon className="w-2.5 h-2.5" />{st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-white/30 text-[11px] font-bold flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{exec.phone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{exec.city}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/20 text-[10px]">
                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{new Date(exec.created_at).toLocaleDateString('ru-RU')}</span>
                      <span className="flex items-center gap-1 text-yellow-500 font-black">� {exec.balance || 0} ₽</span>
                    </div>
                    {exec.admin_comment?.includes('✅ Исправлено:') && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black text-green-400 uppercase animate-pulse">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Исправлено
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0 mt-1" />
                </div>
                {/* Quick action row — only for pending/revision */}
                {(exec.status === 'pending' || exec.status === 'revision') && (
                  <div className="flex border-t border-white/[0.04]">
                    <button onClick={(e) => handleQuickApprove(e, exec.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-green-400 active:bg-green-500/10 transition-all">
                      <ThumbsUp className="w-3.5 h-3.5" /> Одобрить
                    </button>
                    <div className="w-px bg-white/[0.04]" />
                    <button onClick={(e) => handleQuickReject(e, exec.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-red-400 active:bg-red-500/10 transition-all">
                      <ThumbsDown className="w-3.5 h-3.5" /> Отклонить
                    </button>
                    <div className="w-px bg-white/[0.04]" />
                    <button onClick={() => router.push(`/admin/executor?id=${exec.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/30 active:bg-white/5 transition-all">
                      Подробнее <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Bottom Filter Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto scrollbar-hide gap-2 px-3 py-3"
          style={{ background: 'rgba(5,5,5,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border',
                filter === f.key
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'bg-white/5 text-white/35 border-white/5 active:bg-white/10'
              )}>
              {f.label}
              <span className={cn('px-1.5 py-0.5 rounded-full text-[9px]', filter === f.key ? 'bg-black/25' : 'bg-white/10')}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
