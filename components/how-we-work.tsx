"use client"

import { useEffect, useRef } from "react"
import { FileText, PhoneCall, Truck, CheckCircle2 } from "lucide-react"

const steps = [
  {
    icon: FileText,
    number: "01",
    title: "Оставляете заявку",
    description: "Заполните форму на сайте или позвоните нам по телефону",
  },
  {
    icon: PhoneCall,
    number: "02",
    title: "Мы перезваниваем",
    description: "Уточняем детали, объём работ и согласуем стоимость",
  },
  {
    icon: Truck,
    number: "03",
    title: "Приезжаем",
    description: "Бригада грузчиков прибывает по указанному адресу в срок",
  },
  {
    icon: CheckCircle2,
    number: "04",
    title: "Выполняем работу",
    description: "Аккуратно и быстро выполняем все работы по погрузке и перевозке",
  },
]

export function HowWeWork() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
          section.style.animationDuration = "0.6s"
          section.style.animationFillMode = "both"
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-24 opacity-0"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-16 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            Процесс
          </span>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-foreground md:text-5xl">
            Как мы работаем
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.number} className="group relative text-center">
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute top-10 left-1/2 hidden h-0.5 w-full bg-border lg:block" />
              )}
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/10">
                <step.icon className="h-8 w-8 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.number}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
