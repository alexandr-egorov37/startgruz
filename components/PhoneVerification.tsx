"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ChevronRight, RefreshCw, ShieldCheck, X, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface PhoneVerificationProps {
  phone: string;
  onVerify: () => void;
  onCancel: () => void;
}

export default function PhoneVerification({ phone, onVerify, onCancel }: PhoneVerificationProps) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(true);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Send code on mount
  useEffect(() => {
    sendCode();
  }, [phone]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const sendCode = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phqkzwdlzyumlsdlodor.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      // Handle 429 rate limit error specifically
      if (response.status === 429) {
        setError('Подождите 60 секунд перед повторной отправкой');
        setTimer(60); // Start 60 second countdown
        return;
      }

      const result = await response.json();

      if (result.success) {
        setShowCodeInput(true);
        setTimer(60);
      } else {
        setError(result.reason || 'Ошибка отправки кода');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз');
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next
    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 4) return;

    setIsVerifying(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phqkzwdlzyumlsdlodor.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: fullCode })
      });

      const result = await response.json();

      if (result.success) {
        onVerify();
      } else {
        setError(result.reason || 'Неверный код');
        setCode(["", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    await sendCode();
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative"
      >
        <button 
          onClick={onCancel}
          className="absolute top-8 right-8 text-white/20 hover:text-white transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mb-8">
            <ShieldCheck className="w-10 h-10 text-yellow-500" />
          </div>

          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Подтверждение</h2>
          <p className="text-white/40 font-medium mb-12">
            Мы отправили СМС с кодом на номер<br/>
            <span className="text-white font-bold">{phone}</span>
          </p>

          <div className="flex gap-4 mb-8">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      ref={(el) => { inputs.current[i] = el; }}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={cn(
                        "w-16 h-20 bg-white/5 border-2 rounded-2xl text-center text-3xl font-black text-white outline-none transition-all",
                        digit ? "border-yellow-500 bg-yellow-500/5" : "border-white/10 focus:border-white/30"
                      )}
                    />
                  ))}
          </div>

          <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-500 text-xs font-bold uppercase tracking-widest mb-6"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleVerify}
                  disabled={isVerifying || code.some(d => !d)}
                  className="w-full h-16 bg-yellow-500 text-black rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale mb-8"
                >
                  {isVerifying ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Подтвердить"}
                </button>

                <button 
                  onClick={handleResend}
                  disabled={timer > 0}
                  className={cn(
                    "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                    timer > 0 ? "text-white/20" : "text-yellow-500 hover:text-yellow-400"
                  )}
                >
                   {timer > 0 ? (
                     `Повторная отправка через ${timer} сек`
                   ) : (
                     <><RefreshCw className="w-3 h-3" /> Отправить код еще раз</>
                   )}
                </button>
        </div>
      </motion.div>
    </div>
  );
}
