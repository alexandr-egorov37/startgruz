"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronRight, RefreshCw, ShieldCheck, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PhoneVerificationProps {
  onVerified: (phone: string) => void;
  onCancel?: () => void;
}

export default function PhoneVerification({ onVerified, onCancel }: PhoneVerificationProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const [shake, setShake] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };

  const sendCode = async () => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length !== 10) {
      setError('Введите корректный номер телефона');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phqkzwdlzyumlsdlodor.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });

      const result = await response.json();

      if (result.success) {
        setStep('code');
        setTimer(60);
        // Focus first code input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(result.reason || 'Ошибка отправки кода');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newCode.every(digit => digit)) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (codeValue?: string) => {
    const codeToVerify = codeValue || code.join('');
    if (codeToVerify.length !== 4) return;

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phqkzwdlzyumlsdlodor.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: cleanPhone, 
          code: codeToVerify 
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerified(cleanPhone);
        }, 1000);
      } else {
        setError(result.reason || 'Неверный код');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        // Clear all inputs on error
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте еще раз');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (timer > 0) return;
    await sendCode();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full relative"
      >
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Номер подтвержден!</h3>
          </motion.div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {step === 'phone' ? 'Подтверждение номера' : 'Введите код'}
              </h2>
              <p className="text-gray-600 mt-2">
                {step === 'phone' 
                  ? 'Введите номер телефона для получения кода'
                  : 'Мы отправили SMS с кодом подтверждения'
                }
              </p>
            </div>

            {step === 'phone' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Номер телефона
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+7 (999) 123-45-67"
                    className={cn(
                      "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all",
                      shake ? "animate-pulse border-red-500" : "border-gray-300"
                    )}
                    maxLength={12}
                  />
                </div>

                <button
                  onClick={sendCode}
                  disabled={loading || phone.replace(/[^\d]/g, '').length !== 10}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      Получить код
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                    Код из SMS
                  </label>
                  <div className="flex justify-center space-x-2">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => { inputRefs.current[index] = el; }}
                        type="text"
                        value={digit}
                        onChange={(e) => handleCodeInput(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={cn(
                          "w-12 h-12 text-center text-xl font-bold border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all",
                          shake ? "animate-pulse border-red-500" : "border-gray-300"
                        )}
                        maxLength={1}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <button
                    onClick={resendCode}
                    disabled={timer > 0 || loading}
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
                  onClick={() => verifyCode()}
                  disabled={loading || code.some(d => !d)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    'Подтвердить'
                  )}
                </button>
              </div>
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
          </>
        )}
      </motion.div>
    </div>
  );
}
