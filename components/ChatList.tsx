'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { X, MessageSquare, User, Loader2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Chat {
  id: string;
  user_1: string;
  user_2: string;
  last_message: string;
  last_message_at: string;
  other_user_id?: string;
  other_user_name?: string;
  other_user_avatar?: string;
  other_online?: boolean;
  other_last_seen?: string | null;
  unread_count?: number;
}

interface ChatListProps {
  currentUserId: string;
  onOpenChat: (chatId: string, name: string, otherId: string) => void;
  onClose: () => void;
  onlineUsers?: Set<string>;
}

import ContactUnlockedModal from './ContactUnlockedModal';
import { AnimatePresence } from 'framer-motion';
import { Phone, Package } from 'lucide-react';

export default function ChatList({ currentUserId, onOpenChat, onClose, onlineUsers }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  const fetchChats = useCallback(async () => {
    const t0 = performance.now();
    const { data } = await supabase
      .from('chats')
      .select('id, user_1, user_2, last_message, last_message_at')
      .or(`user_1.eq.${currentUserId},user_2.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false });

    if (!data || data.length === 0) { setChats([]); setIsLoading(false); return; }

    // Collect all other user IDs and chat IDs
    const otherIds = data.map(c => c.user_1 === currentUserId ? c.user_2 : c.user_1);
    const chatIds = data.map(c => c.id);
    const uniqueOtherIds = Array.from(new Set(otherIds));

    // Batch fetch all needed data in parallel (instead of N+1)
    const [presenceRes, execRes, usersRes, unreadRes] = await Promise.all([
      supabase.from('presence').select('user_id, status, last_seen').in('user_id', uniqueOtherIds),
      supabase.from('executors').select('id, name, avatar').in('id', uniqueOtherIds),
      supabase.from('users').select('id, phone, name').in('id', uniqueOtherIds),
      // Unread counts per chat — single query
      supabase.from('messages').select('chat_id').eq('receiver_id', currentUserId).neq('status', 'read').in('chat_id', chatIds),
    ]);

    const presenceMap = new Map((presenceRes.data || []).map(p => [p.user_id, p]));
    const execMap = new Map((execRes.data || []).map(e => [e.id, e]));
    const userMap = new Map((usersRes.data || []).map(u => [u.id, u]));
    // Count unread per chat
    const unreadMap = new Map<string, number>();
    (unreadRes.data || []).forEach(m => unreadMap.set(m.chat_id, (unreadMap.get(m.chat_id) || 0) + 1));

    const enriched = data.map(c => {
      // SAFE ID calculation: Ensure we never return ourselves
      let otherId = null;
      if (c.user_1 === currentUserId) {
        otherId = c.user_2;
      } else if (c.user_2 === currentUserId) {
        otherId = c.user_1;
      }

      if (!otherId) {
        console.warn('[CHATLIST] Could not determine otherId for chat:', c.id, { currentUserId, u1: c.user_1, u2: c.user_2 });
        return;
      }
      const exec = execMap.get(otherId);
      const user = userMap.get(otherId);
      const pres = presenceMap.get(otherId);
      
      const phone = user?.phone || '';
      const clientName = user?.name || exec?.name || 'Клиент';

      return {
        ...c,
        other_user_id: otherId,
        other_user_name: clientName,
        other_user_phone: phone,
        other_user_avatar: exec?.avatar || null,
        other_online: pres?.status === 'online',
        other_last_seen: pres?.last_seen || null,
        unread_count: unreadMap.get(c.id) || 0
      };
    }).filter(c => c?.other_user_phone); // DATA FIRST: Hide records without phone

    console.log(`[CHATLIST] fetched ${enriched.length} valid chats`);
    setChats(enriched as any);
    setIsLoading(false);
  }, [currentUserId]);

  // Debounced refetch to avoid spamming on rapid realtime events
  const refetchTimer = useCallback(() => {
    let timer: NodeJS.Timeout | null = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchChats(), 500);
    };
  }, [fetchChats]);
  const debouncedFetch = useCallback(refetchTimer(), [refetchTimer]);

  useEffect(() => {
    fetchChats();

    const channel = supabase.channel(`chatlist:${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => debouncedFetch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => debouncedFetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => debouncedFetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChats, currentUserId]);

  useEffect(() => {
    if (!onlineUsers) return;
    setChats(prev => prev.map(c => ({
      ...c,
      other_online: onlineUsers.has(c.other_user_id || '')
    })));
  }, [onlineUsers]);

  const openContactMenu = (chat: any) => {
    setSelectedContact({
      id: chat.other_user_id,
      name: chat.other_user_name,
      phone: chat.other_user_phone,
      avatar: chat.other_user_avatar,
      realChatObj: chat
    });
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.')) return;
    
    // Optimistic UI update
    setChats(prev => prev.filter(c => c.id !== chatId));
    
    await supabase.from('chats').delete().eq('id', chatId);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 flex items-start justify-center font-[Inter] overflow-y-auto p-4 md:p-8 backdrop-blur-md scrollbar-hide pointer-events-auto">
      
      <div className="masters-wrapper w-full">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-[3020] w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/50" />
        </button>

        <div className="masters-bg" />

        <div className="masters-content">
          <div className="mb-10 block text-center">
            <h2 className="masters-title text-white uppercase tracking-tighter">Ваши клиенты</h2>
            <p className="masters-sub text-white/80 uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-500" /> 
              ВСЕ ЗАКАЗЧИКИ, С КОТОРЫМИ У ВАС ЕСТЬ КОНТАКТ
            </p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Загрузка чатов...</p>
              </div>
            ) : chats.length > 0 ? (
              chats.map((chat: any, idx) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => openContactMenu(chat)}
                  className="master-card cursor-pointer group relative overflow-hidden"
                >
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="absolute top-4 right-4 p-1.5 md:p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors z-20"
                    title="Удалить чат"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  <div className="flex items-center gap-5 w-full md:w-auto">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-white/5 relative">
                      {chat.other_user_avatar ? (
                        <img 
                          src={chat.other_user_avatar} 
                          className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                      {chat.other_online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00B956] border-[2px] border-[#111] shadow-[0_0_8px_rgba(0,185,86,0.6)]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-2 pr-8">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{chat.other_user_name || "КЛИЕНТ"}</h3>
                      <div className="flex items-center gap-4">
                        <div className={cn("flex items-center gap-1.5 text-xs font-bold", chat.unread_count > 0 ? "text-yellow-500" : "text-white/60")}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{chat.last_message || 'Нет сообщений'}</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white/80 tracking-widest flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-white/40" />
                        {chat.other_user_phone || "Нет телефона"}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenChat(chat.id, chat.other_user_name, chat.other_user_id); }}
                      className="flex-1 md:flex-none px-6 py-2 h-10 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2 relative"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> 
                      СООБЩЕНИЯ
                      {chat.unread_count > 0 && (
                        <span className="absolute -top-2.5 right-1 min-w-[22px] h-[22px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]">{chat.unread_count}</span>
                      )}
                    </button>
                    <a 
                      href={chat.other_user_phone ? `tel:+${chat.other_user_phone.replace(/\D/g, '')}` : "#"}
                      onClick={(e) => { e.stopPropagation(); if (!chat.other_user_phone) alert("Телефон не указан"); }}
                      className="flex-1 md:flex-none px-6 py-2 h-10 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone className="w-3.5 h-3.5" /> Позвонить
                    </a>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                   <MessageSquare className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-black text-white/60 uppercase tracking-tighter">Нет диалогов</h3>
                <p className="text-sm font-bold text-white/30 mt-2">Ваши активные чаты появятся здесь.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedContact && (
          <ContactUnlockedModal
            executor={{
               id: selectedContact.id,
               name: selectedContact.name,
               phone: selectedContact.phone,
               avatar: selectedContact.avatar,
               // dummy info to prevent modal crash
               rating: 0,
               reviews: 0,
               completed_orders: 0
            }}
            chatId={selectedContact.realChatObj.id}
            mode="executor"
            onOpenChat={() => {
               onOpenChat(selectedContact.realChatObj.id, selectedContact.realChatObj.other_user_name, selectedContact.realChatObj.other_user_id);
               setSelectedContact(null);
            }}
            onClose={() => setSelectedContact(null)}
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        
        .masters-wrapper {
          position: relative;
          max-width: 1100px;
          min-height: 650px;
          margin: 80px auto;
          padding: 40px 32px;
          border-radius: 28px;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 0 120px rgba(255,180,0,0.08),
            inset 0 0 40px rgba(255,255,255,0.02);
        }

        .masters-wrapper::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 28px;
          box-shadow: 0 0 80px rgba(255,180,0,0.15);
          opacity: 0.3;
          pointer-events: none;
        }

        .masters-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 30% 50%, rgba(255,180,0,0.12), transparent 60%),
            radial-gradient(circle at 70% 50%, rgba(0,120,255,0.08), transparent 60%);
          opacity: 0.6;
          z-index: 0;
          border-radius: 28px;
        }

        .masters-content {
          position: relative;
          z-index: 2;
        }

        .masters-title {
          text-align: center;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .master-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          margin-top: 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          transition: 0.2s;
        }

        .master-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,180,0,0.3);
        }

        @media (max-width: 768px) {
          .masters-wrapper {
            margin: 20px;
            padding: 20px;
          }
          .master-card {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
