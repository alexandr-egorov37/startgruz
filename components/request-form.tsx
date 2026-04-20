"use client"

import { useState, useEffect, useRef } from "react"
import { Send, CheckCircle } from "lucide-react"

export function RequestForm() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    section.style.opacity = "1"
    section.style.transform = "none"
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { supabase } = await import("@/lib/supabase")
      
      const { error: dbError } = await supabase
        .from("orders")
        .insert([{
          name: name.trim(),
          phone: phone.trim(),
          service: "Вызов грузчиков",
          details: { comment: comment.trim() },
          source: "request-form"
        }])

      if (dbError) throw dbError

      // Trigger Edge Function for Telegram
      fetch("https://xxscbqdgqimhiwfnszbi.functions.supabase.co/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), details: { source: "Standard Form", comment: comment.trim() } })
      }).catch(err => console.error("Edge function error", err))

      setSubmitted(true)
    } catch (e: any) {
      setSubmitError(e.message || "Ошибка отправки")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="request"
      ref={sectionRef}
      className="relative py-28 overflow-hidden"
    >
      {/* ФОН И ЗАТЕМНЕНИЕ В 1 СЛОЕ */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.8), rgba(0,0,0,0.95)), url('/images/hero-bg-4.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 15%",
        }}
      />

      <div className="relative z-20 mx-auto max-w-7xl px-4 lg:px-8 flex justify-center">
        <div
          className="
            mx-auto max-w-2xl overflow-hidden
            rounded-2xl border border-white/10
            bg-black/70 backdrop-blur-xl shadow-2xl
            animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-500
          "
        >
          <div className="bg-primary p-8 text-center">
            <h2 className="text-balance text-3xl font-black text-primary-foreground md:text-4xl">
              Вызвать грузчиков
            </h2>
            <p className="mt-2 text-primary-foreground/80">
              Оставьте заявку и мы перезвоним в течение 5 минут
            </p>
          </div>

          <div className="p-6 lg:p-8">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Заявка отправлена!
                </h3>
                <p className="text-muted-foreground">
                  Мы перезвоним вам в ближайшее время
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setName("")
                    setPhone("")
                    setComment("")
                    setSubmitError(null)
                  }}
                  className="mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label
                    htmlFor="req-name"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Ваше имя
                  </label>
                  <input
                    id="req-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="req-phone"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Телефон
                  </label>
                  <input
                    id="req-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="req-comment"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    Комментарий
                  </label>
                  <textarea
                    id="req-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Опишите задачу..."
                    className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Send className="h-5 w-5" />
                  {submitting ? "Отправляем..." : "Вызвать грузчиков"}
                </button>

                {submitError ? (
                  <p className="text-center text-sm font-semibold text-red-400">
                    {submitError}
                  </p>
                ) : null}

                <p className="text-center text-xs text-muted-foreground">
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <a href="#" className="text-primary hover:underline">
                    политикой конфиденциальности
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
