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
  const [showCodeInput, setShowCodeInput] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Send code on mount
  useEffect(() => {
    sendCode();
  }, [phone]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0 && showCodeInput) {
      const interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, showCodeInput]);

  const sendCode = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phqkzwdlzyumlsdlodor.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

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

    // Auto-verify when all digits entered
    if (newCode.every(digit => digit)) {
      setTimeout(() => handleVerify(), 100);
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
    setCode(["", "", "", ""]);
    setError(null);
    await sendCode();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full relative"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Подтверждение номера
          </h3>
          <p className="text-gray-600">
            Мы отправили SMS с кодом на номер {phone}
          </p>
        </div>

        {showCodeInput && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Код из SMS
              </label>
              <div className="flex justify-center space-x-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputs.current[index] = el; }}
                    type="text"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                      "w-12 h-12 text-center text-xl font-bold border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all",
                      error ? "border-red-500" : "border-gray-300"
                    )}
                    maxLength={1}
                  />
                ))}
              </div>
            </div>

            <div className="text-center mb-6">
              <button
                onClick={handleResend}
                disabled={timer > 0 || isVerifying}
                className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center justify-center mx-auto"
              >
                {timer > 0 ? (
                  <>Повторить через {formatTime(timer)}</>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Отправить код повторно
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying || code.some(d => !d)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Проверка...
                </>
              ) : (
                'Подтвердить'
              )}
            </button>
          </>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
