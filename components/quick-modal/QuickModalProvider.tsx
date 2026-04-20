"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"
import SearchingScreen from "../SearchingScreen"
import PhoneVerification from "../PhoneVerification"
import { Loader2, CheckCircle2 } from "lucide-react"

type QuickModalContextValue = {
  openQuickModal: (source?: "default" | "calculator") => void
}

const QuickModalContext = createContext<QuickModalContextValue | null>(null)

export function useQuickModal() {
  const ctx = useContext(QuickModalContext)
  if (!ctx) throw new Error("useQuickModal must be used within QuickModalProvider")
  return ctx
}

export function QuickModalProvider({
  children,
}: {
  children: ReactNode
}) {
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [openSource, setOpenSource] = useState<"default" | "calculator">("default")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const openQuickModal = (source: "default" | "calculator" = "default") => {
    setIsQuickModalOpen(true)
    setOpenSource(source)
    setError(null)
  }

  useEffect(() => {
    if (!isQuickModalOpen) {
      document.body.classList.remove("modal-open")
      return
    }
    document.body.classList.add("modal-open")
    return () => {
      document.body.classList.remove("modal-open")
    }
  }, [isQuickModalOpen])

  useEffect(() => {
    if (!successToast) return
    const t = window.setTimeout(() => setSuccessToast(null), 4500)
    return () => window.clearTimeout(t)
  }, [successToast])

  const ctxValue = useMemo(
    () => ({
      openQuickModal,
    }),
    []
  )

  const [showVerification, setShowVerification] = useState(false);

  function handleQuickSubmit() {
    if (!name.trim()) {
      setError("Введите имя")
      return
    }
    if (!phone.trim()) {
      setError("Введите телефон")
      return
    }
    setShowVerification(true);
  }

  async function completeQuickOrderSubmission() {
    setSubmitting(true)
    setError(null)
    try {
      const { supabase } = await import("@/lib/supabase")
      const nameValue = name.trim()
      const phoneValue = phone.trim()

      let orderData: any = {
        description: `Блиц-заявка от ${nameValue}`,
        phone: phoneValue,
        type: openSource === 'calculator' ? 'Расчет из калькулятора' : 'Быстрая заявка',
        status: 'searching',
        city: 'Шуя', // Default for quick leads
        details: {
            source: openSource,
            client_name: nameValue
        }
      }

      if (openSource === "calculator") {
        try {
          const raw = localStorage.getItem("calculatorState")
          if (raw) {
            const p = JSON.parse(raw)
            orderData.type = p.workType || 'Грузчики'
            orderData.details = { ...orderData.details, ...p }
            orderData.price_estimate = 0
          }
        } catch (e) {
          console.error("Calc parse error", e)
        }
      }

      const { data, error: dbError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()

      if (dbError) throw dbError

      // 1. Notify matching executors (Dispatch)
      const { notifyExecutors } = await import("@/lib/notifications");
      notifyExecutors(data?.[0] || orderData);

      // 2. Trigger Telegram notification
      try {
        const { sendToTelegram } = await import("@/lib/telegram");
        let msg = `<b>⚡️ БЫСТРАЯ ЗАЯВКА</b>\n\n`;
        msg += `👤 <b>Имя:</b> ${nameValue}\n`;
        msg += `📞 <b>Телефон:</b> <code>${phoneValue}</code>\n`;
        msg += `🔗 <b>Источник:</b> ${openSource}\n`;
        await sendToTelegram(msg);
      } catch (e) {
        console.error("Telegram error", e);
      }

      // 2. Clear form and open search screen
      setIsQuickModalOpen(false)
      setName("")
      setPhone("")
      setOpenSource("default")
      setActiveOrder(data?.[0] || orderData)
      setShowVerification(false);
    } catch (e: any) {
      setError(e.message || "Ошибка отправки")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <QuickModalContext.Provider value={ctxValue}>
      {children}

      {showVerification && (
        <PhoneVerification 
          phone={phone} 
          onVerify={completeQuickOrderSubmission} 
          onCancel={() => setShowVerification(false)} 
        />
      )}

      {isQuickModalOpen ? (
        <div
          className="fixed inset-0 z-[2050] flex overflow-y-auto items-end md:items-center justify-center bg-black/70 p-4"
          style={{ WebkitOverflowScrolling: "touch" }}
          role="dialog"
          aria-modal="true"
          onClick={() => setIsQuickModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl md:rounded-2xl bg-[#1f1f1f] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  Быстрая заявка
                </h3>
                <p className="text-sm text-muted-foreground">
                  Перезвоним в течение 5 минут
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickModalOpen(false)}
                className="rounded-lg p-2 text-foreground/80 transition hover:bg-white/5 hover:text-foreground"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            {/* inputs */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              className="mt-4 w-full rounded-xl bg-black/40 p-4 text-base text-foreground placeholder:text-foreground/50 outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (___) ___-__-__"
              inputMode="tel"
              type="tel"
              pattern=".*"
              className="mt-3 w-full rounded-xl bg-black/40 p-4 text-base text-foreground placeholder:text-foreground/50 outline-none"
            />

            {error ? (
              <div className="mt-3 text-sm font-semibold text-red-400">
                {error}
              </div>
            ) : null}

            {/* button */}
            <button
              type="button"
              onClick={handleQuickSubmit}
              disabled={submitting}
              className="
                mt-4 w-full rounded-xl bg-primary py-4 text-base font-bold text-black
                transition-transform duration-300 hover:scale-105 hover:shadow-xl
                disabled:opacity-70
              "
            >
              {submitting ? "Отправляем..." : "Отправить заявку"}
            </button>
          </div>
        </div>
      ) : null}

      {successToast ? (
        <div className="fixed left-1/2 top-4 z-[2060] -translate-x-1/2 rounded-xl bg-[#fbbf24] px-5 py-3 text-base font-bold text-black shadow-xl">
          {successToast}
        </div>
      ) : null}

      {activeOrder && (
        <SearchingScreen 
           orderData={activeOrder} 
           onCancel={() => setActiveOrder(null)} 
        />
      )}
    </QuickModalContext.Provider>
  )
}
