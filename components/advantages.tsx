"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

const cards = [
  {
    category: "Скорость",
    title: "Приезд за 30 минут",
    description:
      "Наши грузчики всегда готовы быстро прибыть на место и начать работу.",
    image: "/images/advantage-1.jpg",
  },
  {
    category: "Цены",
    title: "Фиксированная цена",
    description:
      "Вы всегда знаете, сколько заплатите, без скрытых доплат.",
    image: "/images/advantage-2.jpg",
  },
  {
    category: "Профессионализм",
    title: "Трезвые и аккуратные",
    description:
      "Наши сотрудники всегда вежливы и профессиональны.",
    image: "/images/advantage-3.jpg",
  },
  {
    category: "Доступность",
    title: "Работаем круглосуточно",
    description:
      "Мы всегда на связи, чтобы помочь вам в любое время.",
    image: "/images/advantage-4.jpg",
  },
] as const

export function Advantages() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
          section.style.animationDuration = "1s"
          section.style.animationFillMode = "none"
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
      id="advantages"
      ref={sectionRef}
      className="relative bg-background py-24 md:py-28"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
        <div className="mb-12 text-center md:mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary md:text-base">
            НАШИ ПРЕИМУЩЕСТВА
          </p>
          <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Почему выбирают нас
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Мы предлагаем надежные и быстрые услуги грузчиков, чтобы вы могли
            сосредоточиться на важном.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => (
            <article
              key={item.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-primary hover:shadow-xl"
            >
              <div className="relative h-56 w-full overflow-hidden lg:h-64">
                <Image
                  src={item.image}
                  alt={`${item.category}: ${item.title}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {item.category}
                </p>
                <h3 className="mt-3 text-xl font-bold leading-snug text-foreground md:text-2xl">
                  {item.title}
                </h3>
                <p className="mt-4 flex-1 text-base leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
