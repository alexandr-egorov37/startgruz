'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Paperclip, Mic, Image as ImageIcon, Download, 
  Check, CheckCheck, Loader2, Play, Pause, Square, Phone,
  Camera, FileText, User, MoreVertical, Trash2, Edit 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

// --- TYPES ---
interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'location';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  duration?: number;
  status: 'sent' | 'delivered' | 'read' | 'error';
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

interface ChatDialogProps {
  orderId?: string;
  chatId?: string;
  participantId: string;
  receiverId: string;
  isExecutor: boolean;
  participantName: string;
  onClose: () => void;
  onlineUsers?: Set<string>;
}

export default function ChatDialog({ 
  orderId, 
  chatId: initialChatId, 
  participantId, 
  receiverId, 
  isExecutor, 
  participantName, 
  onClose,
  onlineUsers
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // REALTIME REFS
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  
  const recordInterval = useRef<NodeJS.Timeout | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    let isMounted = true;

    const runInit = async () => {
      const isUUID = (str: any) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      let rid = (receiverId && receiverId !== 'undefined' && receiverId !== 'null') ? receiverId : null;
      let pid = (participantId && participantId !== 'undefined' && participantId !== 'null') ? participantId : null;

      if (!rid && orderId && orderId !== 'general' && isUUID(orderId)) {
        console.log('[CHAT] Fetching receiver from order:', orderId);
        const { data: ord } = await supabase.from('orders').select('user_id, accepted_by').eq('id', orderId).maybeSingle();
        if (ord) {
          if (isExecutor) {
            // I am executor, receiver is client
            if (ord.user_id) rid = ord.user_id;
          } else {
            // I am client, receiver is executor
            if (ord.accepted_by) rid = ord.accepted_by;
          }
        }
      }

      if (!rid || !pid || !isUUID(rid) || !isUUID(pid)) {
        console.warn('>>> [CHAT] Missing or invalid IDs:', { pid, rid, orderId, isExecutor });
        return;
      }

      const [u1, u2] = [pid, rid].sort();
      let cid = initialChatId;

      // Force find the chat using normalized IDs to avoid "dual room" bug
      const { data: existing, error: findError } = await supabase.from('chats').select('id')
        .eq('user_1', u1)
        .eq('user_2', u2)
        .maybeSingle();
      
      if (existing) {
        cid = existing.id;
        console.log('[CHAT] FOUND EXISTING ROOM:', cid);
      } else {
        // Use upsert to prevent 409 Conflict with normalized order
        const { data: newChat, error: upsertError } = await supabase.from('chats')
          .upsert({ 
            user_1: u1, 
            user_2: u2, 
            last_message: 'Чат открыт',
            last_message_at: new Date().toISOString() 
          }, { onConflict: 'user_1,user_2' })
          .select().single();
        
        if (newChat) {
          cid = newChat.id;
          console.log('[CHAT] CREATED NEW ROOM:', cid);
        } else if (upsertError) {
           console.error('>>> [CHAT] Init Error:', upsertError.message);
           // Final fallback select
           const { data: retry } = await supabase.from('chats').select('id').eq('user_1', u1).eq('user_2', u2).maybeSingle();
           if (retry) cid = retry.id;
        }
      }

      if (!cid || !isMounted) return;
      setActiveChatId(cid);

      // Load messages
      const { data: msgs, error: fetchError } = await supabase.from('messages')
        .select('*')
        .eq('chat_id', cid)
        .order('created_at', { ascending: true });
      
      if (!fetchError && msgs && isMounted) setMessages(msgs);

      // Participants
      await Promise.all([
        supabase.from('chat_participants').upsert({ chat_id: cid, user_id: pid }, { onConflict: 'chat_id,user_id' }),
        supabase.from('chat_participants').upsert({ chat_id: cid, user_id: rid }, { onConflict: 'chat_id,user_id' })
      ]);
    };

    runInit();
    return () => { isMounted = false; };
  }, [initialChatId, orderId, participantId, receiverId]);

  // --- REALTIME SUBSCRIPTION (STABLE) ---
  useEffect(() => {
    if (!activeChatId) return;
    if (channelRef.current) return;

    console.log('[CHAT] INIT CHANNEL', activeChatId);
    const channel = supabase.channel(`chat_v3_${activeChatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${activeChatId}` 
      }, (payload) => {
        console.log('[CHAT] NEW MESSAGE RECEIVED', payload);
        const newMessage = payload.new as Message;
        
        setMessages((prev) => {
          const exists = prev.find(m => m.id === newMessage.id);
          if (exists) return prev;
          const newState = [...prev, newMessage];
          console.log('[CHAT] MESSAGES STATE', newState.length);
          return newState;
        });

        if (newMessage.sender_id !== participantId && newMessage.status === 'sent') {
          supabase.from('messages').update({ status: 'delivered' }).eq('id', newMessage.id);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${activeChatId}` 
      }, (payload) => {
        const up = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === up.id ? up : m));
      })
      .on('broadcast', { event: 'typing' }, ({ payload: tp }) => {
        if (tp?.user_id && tp.user_id !== participantId) {
          setIsPeerTypingState(true);
          if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
          typingStopTimeoutRef.current = setTimeout(() => setIsPeerTypingState(false), 2000);
        }
      })
      .subscribe((status) => {
        console.log('[CHAT] STATUS', status, activeChatId);
      });

    channelRef.current = channel;
    return () => {
      console.log('[CHAT] CLEANUP', activeChatId);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeChatId, participantId]);

  // --- UI STATES & LOGIC ---
  const [peerPresence, setPeerPresence] = useState<any>(null);
  const [isPeerTypingState, setIsPeerTypingState] = useState(false);
  const typingStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);

  // Sync Peer Online Status from Shared State
  useEffect(() => {
    if (!receiverId || !onlineUsers) return;
    
    const fetchLastSeen = async () => {
      const { data } = await supabase.from('presence').select('last_seen').eq('user_id', receiverId).maybeSingle();
      if (data?.last_seen) setPeerLastSeen(data.last_seen);
    };

    const online = onlineUsers.has(receiverId);
    setIsPeerOnline(online);
    if (!online) fetchLastSeen();
  }, [receiverId, onlineUsers]);

  // Initial last seen fetch if needed
  useEffect(() => {
    if (!receiverId || isPeerOnline) return;
    supabase.from('presence').select('last_seen').eq('user_id', receiverId).maybeSingle().then(({ data }) => {
      if (data?.last_seen) setPeerLastSeen(data.last_seen);
    });
  }, [receiverId]);

  const formatLastSeen = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return `был(а) в сети в ${format(d, 'HH:mm')}`;
    if (isYesterday(d)) return `был(а) в сети вчера в ${format(d, 'HH:mm')}`;
    return `был(а) в сети ${format(d, 'd MMMM в HH:mm', { locale: ru })}`;
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isPeerTypingState]);

  // Mark Read
  useEffect(() => {
    if (!activeChatId || !receiverId) return;
    supabase.from('messages')
      .update({ status: 'read', is_read: true })
      .eq('chat_id', activeChatId)
      .eq('sender_id', receiverId)
      .in('status', ['sent', 'delivered'])
      .then(() => {});
  }, [activeChatId, receiverId, messages.length]);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; file: File } | null>(null);

  const sendMessage = async (text: string, type: 'text' | 'image' | 'video' | 'voice' = 'text', fileUrl?: string, duration?: number) => {
    if (type === 'text' && !text.trim()) return;
    if ((type === 'image' || type === 'video' || type === 'voice') && !fileUrl) return;
    if (isSending || !activeChatId) return;
    setIsSending(true);

    const payload: any = {
      chat_id: activeChatId,
      sender_id: participantId,
      receiver_id: receiverId,
      text: type === 'text' ? text.trim() : (type === 'voice' ? '🎤 Голосовое сообщение' : type === 'image' ? '📷 Фото' : '🎥 Видео'),
      type,
      file_url: fileUrl || null,
      duration: duration || null,
      status: 'sent' as const,
      is_read: false
    };

    const { data: sent, error: sendError } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (sendError) {
      console.error('[CHAT] SEND ERROR', sendError);
      setIsSending(false);
      return;
    }

    if (sent) {
      setMessages(prev => {
        const exists = prev.find(m => m.id === sent.id);
        if (exists) return prev;
        return [...prev, sent];
      });
      setInputText('');
      setIsSending(false);
      setPreviewFile(null);
      const lastMsg = type === 'text' ? text.trim() : type === 'voice' ? '🎤 Голосовое' : type === 'image' ? '📷 Фото' : '🎥 Видео';
      supabase.from('chats').update({ 
        last_message: lastMsg, 
        last_message_at: new Date().toISOString() 
      }).eq('id', activeChatId).then(() => {});
    }
  };

  // ─── FILE UPLOAD ───
  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    const filePath = `${activeChatId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-files').upload(filePath, file);
    if (error) { console.error('[UPLOAD]', error); return null; }
    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return;
    
    const previewUrl = URL.createObjectURL(file);
    setPreviewFile({ url: previewUrl, type: isImage ? 'image' : 'video', file });
  };

  const handleSendFile = async () => {
    if (!previewFile) return;
    setUploadingFile(true);
    try {
      const url = await uploadFile(previewFile.file);
      if (url) {
        await sendMessage('', previewFile.type as any, url);
      }
    } finally {
      setUploadingFile(false);
      setPreviewFile(null);
    }
  };

  // ─── VOICE RECORDING ───
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        setUploadingFile(true);
        const url = await uploadFile(file);
        if (url) {
          await sendMessage('', 'voice', url, recordDuration);
        }
        setUploadingFile(false);
        setRecordDuration(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);
      recordInterval.current = setInterval(() => setRecordDuration(p => p + 1), 1000);
    } catch (err) {
      console.error('[VOICE] Permission denied or error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordInterval.current) { clearInterval(recordInterval.current); recordInterval.current = null; }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordDuration(0);
      audioChunksRef.current = [];
      if (recordInterval.current) { clearInterval(recordInterval.current); recordInterval.current = null; }
    }
  };

  const signalTyping = () => {
    if (!channelRef.current || !participantId) return;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: participantId } });
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0b0b0b] w-full max-w-2xl h-full md:h-[650px] md:rounded-3xl border border-white/10 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white/40" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-white">{participantName || 'Диалог'}</h3>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                isPeerOnline || isPeerTypingState ? "text-emerald-500" : "text-white/20"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  isPeerOnline || isPeerTypingState ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-white/20"
                )} />
                {isPeerTypingState ? 'печатает...' : isPeerOnline ? 'в сети' : peerLastSeen ? formatLastSeen(peerLastSeen) : 'офлайн'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <MessageSquare className="w-12 h-12" />
              <p className="text-xs font-black uppercase tracking-widest">Начните диалог</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === participantId;
            return (
              <div key={msg.id} className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm relative group",
                  isMine 
                    ? "bg-emerald-600 text-white rounded-tr-none" 
                    : "bg-white/5 text-white/90 rounded-tl-none border border-white/5"
                )}>
                  {/* Image message */}
                  {msg.type === 'image' && msg.file_url && (
                    <img 
                      src={msg.file_url} 
                      alt="photo" 
                      className="rounded-xl max-w-full max-h-[300px] object-cover cursor-pointer mb-1" 
                      onClick={() => setShowImageModal(msg.file_url!)}
                    />
                  )}
                  {/* Video message */}
                  {msg.type === 'video' && msg.file_url && (
                    <video 
                      src={msg.file_url} 
                      controls 
                      className="rounded-xl max-w-full max-h-[300px] mb-1"
                    />
                  )}
                  {/* Voice message */}
                  {msg.type === 'voice' && msg.file_url && (
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <audio src={msg.file_url} controls className="h-8 w-full [&::-webkit-media-controls-panel]:bg-transparent" style={{ maxWidth: 220 }} />
                      {msg.duration ? <span className="text-[10px] opacity-60 whitespace-nowrap">{Math.floor(msg.duration / 60)}:{String(msg.duration % 60).padStart(2, '0')}</span> : null}
                    </div>
                  )}
                  {/* Text (show only for text type or as caption) */}
                  {(msg.type === 'text' || (!msg.file_url && msg.text)) && (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}
                  <div className="flex items-center justify-end gap-1.5 mt-1 opacity-50">
                    <span className="text-[9px] font-medium">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && (
                      msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {isPeerTypingState && (
            <div className="flex justify-start">
              <div className="bg-white/5 px-4 py-2 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* File Preview */}
        <AnimatePresence>
          {previewFile && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="px-4 pt-3 bg-white/[0.02] border-t border-white/5"
            >
              <div className="flex items-end gap-3 bg-white/5 rounded-2xl p-3 border border-white/10">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-black/30">
                  {previewFile.type === 'image' ? (
                    <img src={previewFile.url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={previewFile.url} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 text-xs text-white/40">
                  {previewFile.type === 'image' ? '📷 Фото' : '🎥 Видео'}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewFile(null)} className="p-2 text-white/30 hover:text-white/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSendFile} 
                    disabled={uploadingFile}
                    className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all"
                  >
                    {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Fullscreen Modal */}
        <AnimatePresence>
          {showImageModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1300] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setShowImageModal(null)}
            >
              <img src={showImageModal} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
              <button onClick={() => setShowImageModal(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5">
          {/* Hidden file input */}
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*,video/*" 
            onChange={handleFileSelect} 
            className="hidden" 
          />

          {isRecording ? (
            /* Recording UI */
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-2">
              <button onClick={cancelRecording} className="p-2 text-red-400 hover:text-red-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-red-400 text-sm font-bold">
                  {Math.floor(recordDuration / 60)}:{String(recordDuration % 60).padStart(2, '0')}
                </span>
                <div className="flex-1 flex items-center gap-[2px]">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-1 bg-red-500/40 rounded-full animate-pulse" style={{ height: `${6 + Math.random() * 14}px`, animationDelay: `${i * 50}ms` }} />
                  ))}
                </div>
              </div>
              <button 
                onClick={stopRecording}
                className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all"
              >
                {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            /* Normal input */
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-emerald-500/50 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-white/20 hover:text-white/40 transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); signalTyping(); }}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
                placeholder="Сообщение..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20 py-2"
              />
              {inputText.trim() ? (
                <button 
                  onClick={() => sendMessage(inputText)}
                  disabled={isSending}
                  className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className="w-10 h-10 bg-white/5 text-white/40 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:bg-red-500/20 active:text-red-400"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
