'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import VerificationBadge from '../../../components/VerificationBadge';
import { 
  ChevronLeft, ShieldCheck, Phone, MapPin, Calendar, CheckCircle2, 
  XCircle, Clock, RefreshCw, AlertTriangle, Wallet, FileText, MessageSquare,
  Pencil, Save, X, ChevronDown, Plus, Trash2, Image
} from 'lucide-react';
import { cn } from '../../../lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: 'Новая заявка',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  approved: { label: 'Одобрен',        color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: CheckCircle2 },
  active:   { label: 'Одобрен',        color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: CheckCircle2 },
  verified: { label: 'Верифицирован',  color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: ShieldCheck },
  rejected: { label: 'Отклонён',       color: 'text-red-400 bg-red-500/10 border-red-500/20',         icon: XCircle },
  revision: { label: 'На доработке',   color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: RefreshCw },
};

const QUICK_REASONS = [
  'Не читается паспорт',
  'Фото обрезано',
  'Плохое качество фото',
  'Нет селфи',
  'Селфи не совпадает',
  'Данные не заполнены',
  'Неверный документ',
];

const SERVICES_MAP: Record<string, string> = {
  loaders: 'Грузчики',
  gazelle: 'Газель',
  furniture: 'Сборка мебели',
  rigging: 'Такелаж',
};

const ALL_SERVICE_KEYS = Object.keys(SERVICES_MAP);

const CITIES = ['Шуя', 'Иваново', 'Кострома', 'Москва', 'Владимир', 'Нижний Новгород'];

function ExecutorDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || null;

  const [executor, setExecutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);

  // Verification documents
  const [verDocs, setVerDocs] = useState<any>(null);

  // Portfolio
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [editPortfolio, setEditPortfolio] = useState<any[]>([]);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBalance, setEditBalance] = useState(0);
  const [editServices, setEditServices] = useState<string[]>([]);
  const [customCity, setCustomCity] = useState('');
  const [showCustomCity, setShowCustomCity] = useState(false);

  // Quick chips
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (!isAuth) {
      router.replace('/admin/login');
      return;
    }
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetchExecutor();
  }, [id]);

  async function fetchExecutor() {
    setLoading(true);
    const [{ data, error }, { data: portData }, { data: docsData }] = await Promise.all([
      supabase.from('executors').select('*').eq('id', id).single(),
      supabase.from('executor_portfolio').select('*').eq('executor_id', id).order('created_at', { ascending: true }),
      supabase.from('verification_documents').select('*').eq('user_id', id).maybeSingle(),
    ]);

    if (error || !data) {
      setNotFound(true);
    } else {
      setExecutor(data);
      setComment(data.admin_comment || '');
      setPortfolio(portData || []);
      setVerDocs(docsData || null);
    }
    setLoading(false);
  }

  function enterEditMode() {
    if (!executor) return;
    setEditName(executor.name || '');
    setEditCity(executor.city || '');
    setEditBalance(executor.balance || 0);
    setEditServices(Array.isArray(executor.services) ? [...executor.services] : []);
    setEditPortfolio(portfolio.map(p => ({ ...p })));
    setShowCustomCity(false);
    setCustomCity('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdits() {
    if (!executor) return;
    setUpdating(true);
    try {
      const finalCity = showCustomCity && customCity.trim() ? customCity.trim() : editCity;
      const payload: any = {
        name: editName.trim() || executor.name,
        city: finalCity || executor.city,
        balance: editBalance,
        services: editServices,
      };
      const { error } = await supabase.from('executors').update(payload).eq('id', executor.id);
      if (error) throw new Error('Ошибка сохранения профиля');

      // Save portfolio changes
      const originalIds = portfolio.map((p: any) => p.id).filter(Boolean);
      const keepIds = editPortfolio.filter((p: any) => p.id).map((p: any) => p.id);
      const deletedIds = originalIds.filter((pid: string) => !keepIds.includes(pid));

      for (const delId of deletedIds) {
        await supabase.from('executor_portfolio').delete().eq('id', delId);
      }
      for (const item of editPortfolio) {
        if (item.id) {
          await supabase.from('executor_portfolio').update({
            title: item.title,
            description: item.description,
            photo_url: item.photo_url,
          }).eq('id', item.id);
        } else {
          await supabase.from('executor_portfolio').insert({
            executor_id: executor.id,
            title: item.title,
            description: item.description,
            photo_url: item.photo_url || '',
          });
        }
      }

      setExecutor({ ...executor, ...payload });
      setPortfolio(editPortfolio);
      setEditing(false);
      showToast('Сохранено');
    } catch (e: any) {
      showToast(e.message || 'Ошибка сохранения', 'error');
    }
    setUpdating(false);
  }

  function toggleService(key: string) {
    setEditServices(prev => 
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  }

  async function verifyDocuments() {
    if (!executor) return;
    setUpdating(true);
    try {
      const bonusNeeded = !executor.bonus_issued && executor.verification_status !== 'verified';
      const newBalance = bonusNeeded ? (executor.balance || 0) + 500 : (executor.balance || 0);
      const payload: any = {
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
      };
      if (bonusNeeded) {
        payload.balance = newBalance;
        payload.bonus_issued = true;
      }
      const { error } = await supabase.from('executors').update(payload).eq('id', executor.id);
      if (error) throw new Error('Ошибка верификации');
      setExecutor({ ...executor, ...payload });
      showToast(bonusNeeded ? 'Верифицирован! Бонус 500 ₽ начислен' : 'Верифицирован (бонус уже выдавался)');
    } catch (e: any) {
      showToast(e.message || 'Ошибка', 'error');
    }
    setUpdating(false);
  }

  function handleChipClick(text: string) {
    setSelectedChips(prev => {
      const isActive = prev.includes(text);
      const next = isActive ? prev.filter(c => c !== text) : [...prev, text];
      setComment(next.join('\n'));
      return next;
    });
  }

  function clearChips() {
    setSelectedChips([]);
    setComment('');
  }

  async function handleApprove() {
    if (!executor) return;
    setUpdating(true);
    const payload: any = { status: 'active' };
    if (comment.trim()) payload.admin_comment = comment.trim();
    // Try 'active' first; fall back to 'approved' if DB rejects it
    let { error } = await supabase.from('executors').update(payload).eq('id', executor.id);
    if (error) {
      ({ error } = await supabase.from('executors').update({ ...payload, status: 'approved' }).eq('id', executor.id));
    }
    if (!error) { showToast('Исполнитель одобрен'); setTimeout(() => router.push('/admin'), 1200); }
    else showToast('Ошибка обновления', 'error');
    setUpdating(false);
  }

  async function handleReject() {
    if (!executor) return;
    setUpdating(true);
    const { error } = await supabase.from('executors').update({ status: 'rejected', admin_comment: comment.trim() }).eq('id', executor.id);
    if (!error) { showToast('Заявка отклонена'); setTimeout(() => router.push('/admin'), 1200); }
    else showToast('Ошибка обновления', 'error');
    setUpdating(false);
  }

  async function handleRevision() {
    if (!executor) return;
    setUpdating(true);
    const { error } = await supabase.from('executors').update({ status: 'revision', admin_comment: comment.trim() }).eq('id', executor.id);
    if (!error) { showToast('Отправлено на доработку'); setTimeout(() => router.push('/admin'), 1200); }
    else showToast('Ошибка обновления', 'error');
    setUpdating(false);
  }

  async function verifyDocumentsAction() {
    await verifyDocuments();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-black uppercase">Исполнитель не найден</h1>
          <p className="text-white/40 text-sm">Возможно, запись была удалена</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 px-6 py-3 bg-yellow-500 text-black font-black rounded-2xl hover:brightness-110 transition"
          >
            Назад к списку
          </button>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[executor?.status] || STATUS_CONFIG['pending'];
  const StatusIcon = st.icon;
  const services = Array.isArray(executor?.services) ? executor.services : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-[100] px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl transition-all animate-[slideIn_0.3s_ease]",
          toast.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 inline mr-2" /> : <XCircle className="w-4 h-4 inline mr-2" />}
          {toast.message}
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="w-10 h-10 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition group"
            >
              <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white transition" />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tight">Карточка исполнителя</h1>
          </div>
          {!editing ? (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-xs font-black uppercase tracking-wider hover:bg-yellow-500/20 transition active:scale-[0.97]"
            >
              <Pencil className="w-3.5 h-3.5" />
              Редактировать
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdits}
                disabled={updating}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 rounded-2xl text-white text-xs font-black uppercase tracking-wider hover:brightness-110 transition active:scale-[0.97] disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {updating ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white/50 text-xs font-black uppercase tracking-wider hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
                Отмена
              </button>
            </div>
          )}
        </header>

        {/* Profile Card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
              {executor.avatar ? (
                <img src={executor.avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/10">
                  {(executor.name || '?')[0]}
                </div>
              )}
            </div>
            <div className="space-y-2 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="text-2xl font-black text-white bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-2 w-full outline-none focus:border-yellow-500/40 transition"
                />
              ) : (
                <h2 className="text-2xl font-black text-white">{executor.name || 'Без имени'}</h2>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border', st.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {st.label}
                </span>
                <VerificationBadge status={executor.verification_status} size="sm" showPopup />
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone - always read-only */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
              <Phone className="w-4 h-4 text-yellow-500/70" />
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Телефон</p>
                <p className="text-white font-bold">{executor.phone || '—'}</p>
              </div>
            </div>

            {/* City */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
              <MapPin className="w-4 h-4 text-yellow-500/70" />
              <div className="flex-1">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Город</p>
                {editing ? (
                  <div className="space-y-2 mt-1">
                    {!showCustomCity ? (
                      <div className="relative">
                        <select
                          value={editCity}
                          onChange={e => {
                            if (e.target.value === '__custom__') {
                              setShowCustomCity(true);
                              setCustomCity('');
                            } else {
                              setEditCity(e.target.value);
                            }
                          }}
                          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-yellow-500/40 transition appearance-none cursor-pointer"
                        >
                          {CITIES.map(c => <option key={c} value={c} className="bg-[#111] text-white">{c}</option>)}
                          {!CITIES.includes(editCity) && editCity && <option value={editCity} className="bg-[#111] text-white">{editCity}</option>}
                          <option value="__custom__" className="bg-[#111] text-yellow-400">+ Другой город</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customCity}
                          onChange={e => setCustomCity(e.target.value)}
                          placeholder="Введите город"
                          className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-yellow-500/40 transition placeholder:text-white/20"
                        />
                        <button onClick={() => { setShowCustomCity(false); if (customCity.trim()) setEditCity(customCity.trim()); }} className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-bold hover:bg-yellow-500/30 transition">OK</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white font-bold">{executor.city || '—'}</p>
                )}
              </div>
            </div>

            {/* Date - always read-only */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
              <Calendar className="w-4 h-4 text-yellow-500/70" />
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Дата регистрации</p>
                <p className="text-white font-bold">{executor.created_at ? new Date(executor.created_at).toLocaleDateString('ru-RU') : '—'}</p>
              </div>
            </div>

            {/* Balance */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
              <Wallet className="w-4 h-4 text-yellow-500/70" />
              <div className="flex-1">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Баланс</p>
                {editing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={editBalance}
                      onChange={e => setEditBalance(Number(e.target.value))}
                      className="w-28 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-yellow-500 font-black text-sm outline-none focus:border-yellow-500/40 transition"
                    />
                    <span className="text-yellow-500/60 font-bold text-sm">₽</span>
                  </div>
                ) : (
                  <p className="text-yellow-500 font-black">{executor.balance || 0} ₽</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {executor.description && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white/30" />
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">О себе</p>
              </div>
              <p className="text-white/70 text-sm whitespace-pre-wrap">{executor.description}</p>
            </div>
          )}

          {/* Services */}
          <div className="space-y-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Услуги</p>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {ALL_SERVICE_KEYS.map(key => {
                  const active = editServices.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleService(key)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold border transition-all active:scale-[0.95]",
                        active
                          ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20"
                          : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
                      )}
                    >
                      {SERVICES_MAP[key]}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {services.length > 0 ? services.map((s: string) => (
                  <span key={s} className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold hover:bg-yellow-500/20 transition">
                    {SERVICES_MAP[s] || s}
                  </span>
                )) : (
                  <span className="text-white/20 text-xs">Не указаны</span>
                )}
              </div>
            )}
          </div>

          {/* Cases / Portfolio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Кейсы / Портфолио</p>
              {editing && (
                <button
                  onClick={() => setEditPortfolio([...editPortfolio, { photo_url: '', title: '', description: '' }])}
                  className="text-xs text-yellow-500/60 hover:text-yellow-500 font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Добавить
                </button>
              )}
            </div>
            {editing ? (
              <div className="space-y-3">
                {editPortfolio.length === 0 && (
                  <p className="text-white/20 text-xs">(нет кейсов — нажмите «Добавить»)</p>
                )}
                {editPortfolio.map((item: any, i: number) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-yellow-500/40 font-black uppercase">Работа #{i + 1}</span>
                      <button
                        onClick={() => setEditPortfolio(editPortfolio.filter((_: any, idx: number) => idx !== i))}
                        className="text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={item.photo_url}
                      onChange={e => { const np = [...editPortfolio]; np[i] = { ...np[i], photo_url: e.target.value }; setEditPortfolio(np); }}
                      placeholder="URL фотографии (необязательно)"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-white/60 text-xs outline-none focus:border-yellow-500/30 transition"
                    />
                    <input
                      value={item.title}
                      onChange={e => { const np = [...editPortfolio]; np[i] = { ...np[i], title: e.target.value }; setEditPortfolio(np); }}
                      placeholder="Название кейса (например: Переезд 3-комн. квартиры)"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-yellow-500/30 transition"
                    />
                    <textarea
                      value={item.description}
                      onChange={e => { const np = [...editPortfolio]; np[i] = { ...np[i], description: e.target.value }; setEditPortfolio(np); }}
                      placeholder="Описание работы..."
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-white/60 text-sm outline-none focus:border-yellow-500/30 transition resize-none h-16"
                    />
                  </div>
                ))}
              </div>
            ) : (
              portfolio.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolio.map((item: any, i: number) => (
                    <div key={item.id || i} className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
                      {item.photo_url ? (
                        <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={item.photo_url} className="w-full aspect-video object-cover hover:opacity-80 transition-opacity" />
                        </a>
                      ) : (
                        <div className="w-full aspect-video bg-white/5 flex items-center justify-center">
                          <Image className="w-8 h-8 text-white/10" />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <p className="font-bold text-sm">{item.title || 'Без названия'}</p>
                        {item.description && <p className="text-white/40 text-xs">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-white/20 text-xs">Не добавлены</span>
              )
            )}
          </div>

          {/* Photos */}
          {executor.photos && Array.isArray(executor.photos) && executor.photos.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Фотографии</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {executor.photos.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-yellow-500/30 transition hover:scale-[1.02]">
                    <img src={url} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Verification Documents */}
          {(verDocs?.passport_url || verDocs?.selfie_url || executor.passport_url) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-yellow-500/50" />
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Документы для верификации</p>
                <span className="text-[10px] text-orange-400/70 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5 font-bold">Не публикуются</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(verDocs?.passport_url || executor.passport_url) && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold pl-1">Паспорт</p>
                    <a href={verDocs?.passport_url || executor.passport_url} target="_blank" rel="noopener noreferrer"
                       className="block rounded-2xl overflow-hidden border border-white/10 hover:border-yellow-500/40 transition hover:scale-[1.01]">
                      <img src={verDocs?.passport_url || executor.passport_url}
                           className="w-full aspect-[4/3] object-cover" />
                    </a>
                    <p className="text-[10px] text-white/20 text-center">Нажмите для просмотра</p>
                  </div>
                )}
                {verDocs?.selfie_url && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold pl-1">Селфи</p>
                    <a href={verDocs.selfie_url} target="_blank" rel="noopener noreferrer"
                       className="block rounded-2xl overflow-hidden border border-white/10 hover:border-yellow-500/40 transition hover:scale-[1.01]">
                      <img src={verDocs.selfie_url}
                           className="w-full aspect-[4/3] object-cover" />
                    </a>
                    <p className="text-[10px] text-white/20 text-center">Нажмите для просмотра</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Comment */}
        <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-8 space-y-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-500/70" />
            <h3 className="font-black uppercase tracking-tight">Комментарий администратора</h3>
          </div>

          {/* Quick reason chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">⚡ Быстрые причины</p>
              {(selectedChips.length > 0 || comment.trim()) && (
                <button
                  onClick={clearChips}
                  className="text-[10px] text-red-400/60 hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
                >
                  Очистить
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => handleChipClick(reason)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-200 active:scale-[0.96]',
                    selectedChips.includes(reason)
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
                      : 'bg-white/[0.04] border-white/10 text-white/50 hover:border-yellow-500/30 hover:text-white/70 hover:bg-yellow-500/5'
                  )}
                >
                  {reason}
                </button>
              ))}
              <button
                onClick={() => commentRef.current?.focus()}
                className="px-3 py-1.5 rounded-xl border border-dashed border-yellow-500/20 text-[11px] font-bold text-yellow-500/40 hover:border-yellow-500/40 hover:text-yellow-500/70 transition-all"
              >
                ✏ Своя причина
              </button>
            </div>
          </div>

          <textarea
            ref={commentRef}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Напишите комментарий для исполнителя..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-4 px-5 text-white/80 text-sm outline-none focus:border-yellow-500/30 transition-all resize-none h-28 placeholder:text-white/20"
          />
        </div>

        {/* Status Actions */}
        <div className="bg-white/[0.03] border border-white/5 rounded-[28px] p-8 space-y-4">
          <h3 className="font-black uppercase tracking-tight">Действия</h3>
          <p className="text-[10px] text-white/25">Комментарий сохраняется автоматически при нажатии на кнопку</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleApprove}
              disabled={updating || executor.status === 'active' || executor.status === 'approved'}
              className={cn(
                "px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]",
                executor.status === 'active' || executor.status === 'approved'
                  ? "bg-green-500/10 text-green-400 border border-green-500/20 opacity-50 cursor-not-allowed" 
                  : "bg-green-500 text-white hover:brightness-110 hover:shadow-lg hover:shadow-green-500/20"
              )}
            >
              <CheckCircle2 className="w-4 h-4 inline mr-2" />
              Одобрить
            </button>
            <button
              onClick={handleReject}
              disabled={updating || executor.status === 'rejected'}
              className={cn(
                "px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]",
                executor.status === 'rejected'
                  ? "bg-red-500/10 text-red-400 border border-red-500/20 opacity-50 cursor-not-allowed"
                  : "bg-red-500 text-white hover:brightness-110 hover:shadow-lg hover:shadow-red-500/20"
              )}
            >
              <XCircle className="w-4 h-4 inline mr-2" />
              Отклонить
            </button>
            <button
              onClick={handleRevision}
              disabled={updating || executor.status === 'revision'}
              className={cn(
                "px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]",
                executor.status === 'revision'
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 opacity-50 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:brightness-110 hover:shadow-lg hover:shadow-orange-500/20"
              )}
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              На доработку
            </button>

            {/* Verification action */}
            {(verDocs?.passport_url || verDocs?.selfie_url) && (
              <button
                onClick={verifyDocuments}
                disabled={updating || executor.verification_status === 'verified'}
                className={cn(
                  "px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] border",
                  executor.verification_status === 'verified'
                    ? "bg-green-500/10 text-green-400 border-green-500/20 opacity-50 cursor-not-allowed"
                    : "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25 hover:shadow-lg hover:shadow-green-500/10"
                )}
              >
                <ShieldCheck className="w-4 h-4 inline mr-2" />
                {executor.verification_status === 'verified'
                  ? 'Верифицирован'
                  : 'Подтвердить профиль'
                }
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function ExecutorDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExecutorDetailContent />
    </Suspense>
  );
}
