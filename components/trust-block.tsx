"use client"

import { useEffect, useRef } from "react"
import { useQuickModal } from "@/components/quick-modal/QuickModalProvider"

const reasons = [
  {
    title: "Приезжаем за 30–60 минут",
    text: "Быстрая подача в любой район города",
  },
  {
    title: "Работаем 24/7",
    text: "Круглосуточный выезд без выходных",
  },
  {
    title: "Фиксированная цена",
    text: "Согласуем стоимость до начала работ",
  },
  {
    title: "Оплата после работы",
    text: "Платите только когда всё выполнено",
  },
  {
    title: "Аккуратные грузчики",
    text: "Бережно обращаемся с вещами и мебелью",
  },
  {
    title: "Без скрытых платежей",
    text: "Итог в договоре — без доплат по ходу",
  },
] as const

const steps = [
  "Оставляете заявку",
  "Мы перезваниваем",
  "Приезжаем",
  "Выполняем работу",
  "Вы оплачиваете",
] as const

export function TrustBlock() {
  const sectionRef = useRef<HTMLElement>(null)
  const { openQuickModal } = useQuickModal()

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.style.opacity = "1"
          section.style.transform = "translateY(0)"
          observer.disconnect()
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(section)
    
    // Safety fallback: if section is already visible or near bottom, show it
    const checkVisibility = () => {
        if (!section) return
        const rect = section.getBoundingClientRect()
        if (rect.top < window.innerHeight) {
            section.style.opacity = "1"
            section.style.transform = "translateY(0)"
            observer.disconnect()
        }
    }
    
    checkVisibility()
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="overflow-x-hidden border-t border-white/5 bg-black py-24"
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      <div className="mx-auto max-w-6xl space-y-20 px-6">
        <div>
          <h2 className="mb-10 text-center text-3xl font-bold text-white md:text-4xl">
            Почему выбирают нас
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {reasons.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 text-white transition hover:scale-[1.02]"
              >
                <p className="mb-2 text-lg font-semibold">{item.title}</p>
                <p className="text-sm text-gray-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-10 text-center text-3xl font-bold text-white md:text-4xl">
            Как мы работаем
          </h2>

          <div className="grid gap-6 text-center md:grid-cols-5">
            {steps.map((label, i) => (
              <div key={label} className="space-y-2 text-white">
                <div className="text-3xl font-bold text-yellow-400">{i + 1}</div>
                <p className="text-sm text-gray-300">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-yellow-500/10 to-yellow-400/10 p-8 text-center text-white">
          <h3 className="mb-4 text-2xl font-bold">
            Работаем честно и без риска для вас
          </h3>

          <div className="grid gap-4 text-sm text-gray-300 md:grid-cols-3">
            <p>✔ Без предоплаты</p>
            <p>✔ Оплата после работы</p>
            <p>✔ Компенсация ущерба</p>
          </div>
        </div>

        <div className="space-y-6 text-center">
          <h3 className="text-2xl font-bold text-white">
            Готовы вызвать грузчиков?
          </h3>

          <button
            type="button"
            onClick={() => openQuickModal()}
            className="rounded-xl bg-yellow-400 px-8 py-4 font-semibold text-black transition hover:scale-105"
          >
            Оставить заявку
          </button>
        </div>
      </div>
    </section>
  )
}
