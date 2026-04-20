"use client"

import { useEffect, useRef, useState } from "react"
import { Phone, Calculator, ChevronDown, Send } from "lucide-react"
import { useReviewsStats } from "../hooks/use-reviews-stats"
import { useRouter } from "next/navigation"

export function Hero() {
  const { averageRating } = useReviewsStats()
  const sectionRef = useRef<HTMLElement>(null)
  const router = useRouter()

  const [city, setCity] = useState<"Шуя" | "Иваново">("Шуя")
  const [isCityOpen, setIsCityOpen] = useState(false)
  const cityRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    section.style.opacity = "0"
    section.style.transform = "translateY(30px)"
    requestAnimationFrame(() => {
      section.style.transition = "opacity 0.8s ease, transform 0.8s ease"
      section.style.opacity = "1"
      section.style.transform = "translateY(0)"
    })
  }, [])

  useEffect(() => {
    if (!isCityOpen) return
    const onDocClick = (e: MouseEvent) => {
      const el = cityRef.current
      if (!el) return
      const target = e.target
      if (target instanceof Node && !el.contains(target)) {
        setIsCityOpen(false)
      }
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [isCityOpen])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden flex items-center pt-24 pb-12"
    >
      {/* ФОН: изображение + темный оверлей 60% */}
      <img
        src="/images/hero-bg-3.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none"
      />
      <div
        className="absolute inset-0 z-0 bg-black/60 pointer-events-none select-none"
        aria-hidden="true"
      />

      {/* контент */}
      <div className="relative z-10 w-full px-4 py-6 md:px-10 pointer-events-auto">
        <div className="flex items-center justify-center text-center">
          <div className="max-w-[1400px] w-full mx-auto text-center">

            <div className="mb-6 flex justify-center">
              <a
                href="https://t.me/gruzrusservis_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-2 text-black hover:opacity-90 transition-all duration-300"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white shrink-0">
                  <Send size={12} className="-ml-0.5" />
                </div>
                <span className="text-sm sm:text-base font-bold leading-none tracking-tight">
                  Telegram bot
                </span>
              </a>
            </div>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm sm:text-base font-semibold text-primary">
                  Работаем 24/7
                </span>
              </div>

              <div ref={cityRef} className="relative z-20">
                <button
                  type="button"
                  onClick={() => setIsCityOpen((v) => !v)}
                  className="
                    relative z-10 flex items-center gap-2 rounded-xl border border-border
                    bg-background/30 px-3 py-1.5 text-sm sm:text-base font-semibold text-foreground
                  "
                  aria-haspopup="listbox"
                  aria-expanded={isCityOpen}
                >
                  <span className="text-muted-foreground">Город:</span>
                  <span>{city}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-primary transition-transform ${
                      isCityOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isCityOpen && (
                  <div
                    className="
                      absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 top-full z-[1200] mt-2 w-44
                      overflow-hidden rounded-xl border border-white/10
                      bg-[#2b2b2b] shadow-xl
                    "
                    role="listbox"
                    aria-label="Город"
                  >
                    {(["Шуя", "Иваново"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCity(c)
                          setIsCityOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left text-base font-semibold transition hover:bg-white/5 relative z-10 ${
                          c === city ? "text-black bg-[#fbbf24]" : "text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-[28px] sm:text-[34px] md:text-[40px] lg:text-[56px] font-bold leading-[1.1] tracking-tight text-center mx-auto w-full">
              <span className="block sm:whitespace-nowrap">
                Грузчики за <span className="text-primary">30 минут</span>
              </span>
              <span className="block mt-2">в {city === "Шуя" ? "Шуе" : "Иваново"}</span>
            </h1>

            <p className="mt-6 mx-auto max-w-[700px] text-center text-base sm:text-lg md:text-xl md:text-2xl leading-relaxed text-muted-foreground">
              Без опозданий и скрытых платежей. Профессиональная команда
              грузчиков для любых задач.
            </p>

            {/* кнопки */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
              <button
                type="button"
                className="group relative z-10 flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base sm:text-lg md:text-xl font-bold text-primary-foreground transition-all duration-300 hover:scale-105 active:scale-95"
                onClick={() => router.push("/form?type=moving")}
              >
                <Calculator className="h-6 w-6" />
                Рассчитать стоимость
              </button>

              <a
                href="tel:+79203507778"
                className="relative z-10 flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl border border-border bg-secondary px-8 py-4 text-base sm:text-lg md:text-xl font-bold text-foreground transition-all duration-300 hover:scale-105"
              >
                <Phone className="h-6 w-6" />
                Позвонить
              </a>
            </div>

            {/* статистика */}
            <div className="mt-12 grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-6 sm:gap-10">
              {[
                { value: "500+", label: "Заказов" },
                { value: "30 мин", label: "Подача" },
                { value: averageRating, label: "Рейтинг" },
              ].map((stat, i) => (
                <div key={stat.label} className={`flex flex-col ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
                  <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-primary">
                    {stat.value}
                  </span>
                  <span className="text-xs sm:text-sm md:text-base text-muted-foreground whitespace-nowrap">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}