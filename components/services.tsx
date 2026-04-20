"use client"

import { Fragment, useEffect, useRef } from "react"
import Image from "next/image"
import { useQuickModal } from "@/components/quick-modal/QuickModalProvider"

const services = [
  {
    title: "Переезд квартиры, офиса или склада",
    description:
      "Упакуем вещи, аккуратно погрузим, перевезём и расставим на новом месте.",
    image: "/images/service-1.png",
  },
  {
    title: "Погрузо-разгрузочные работы",
    description:
      "Переносим мебель, стройматериалы, оборудование и любые грузы.",
    image: "/images/service-2.png",
  },
  {
    title: "Вынос мусора",
    description:
      "Быстро освободим помещение от старой мебели и ненужных вещей.",
    image: "/images/service-3.png",
  },
  {
    title: "Перемещение тяжёлых предметов",
    description:
      "Аккуратно переносим пианино, сейфы и крупную технику.",
    image: "/images/service-4.png",
  },
  {
    title: "Уборка снега",
    description: "Чистим дворы, участки, парковки и крыши.",
    image: "/images/service-5.png",
  },
  {
    title: "Сборка мебели",
    description:
      "Профессиональная сборка шкафов, кухонь, кроватей и любой другой корпусной мебели.",
    image: "/images/service-6.png", // Reuse or generate if needed, but for now reuse
  },
] as const

const tagGroups = [
  {
    label: "Переезды:",
    tags: ["дачный", "квартирный", "офисный"],
  },
  {
    label: "Погрузить / разгрузить:",
    tags: [
      "книги",
      "мебель",
      "стиральную машину",
      "бытовую технику",
      "пианино",
      "коробки",
      "кухонный гарнитур",
      "шкаф",
      "диван",
      "кровать",
      "холодильник",
      "плитку",
      "матрас",
      "ламинат",
    ],
  },
  {
    label: "Помочь по дому:",
    tags: [
      "передвинуть мебель",
      "упаковать вещи",
      "переставить технику",
      "стройматериалы",
      "вывезти старую мебель",
      "расставить мебель",
    ],
  },
  {
    label: "Помочь на участке:",
    tags: [
      "работы по даче",
      "разгрузить грузовик",
      "покосить траву",
      "убрать снег",
      "покрасить забор",
      "положить газон",
    ],
  },
] as const

export function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const { openQuickModal } = useQuickModal()

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    section.style.opacity = "0"
    section.style.transform = "translateY(20px)"
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.style.transition = "all 0.6s ease"
          section.style.opacity = "1"
          section.style.transform = "translateY(0)"
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
      id="services"
      ref={sectionRef}
      className="relative py-20 overflow-hidden"
    >
      {/* ФОН И ЗАТЕМНЕНИЕ В 1 СЛОЕ */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none"
        style={{ 
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('/images/hero-bg-2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
        aria-hidden="true"
      />

      {/* КОНТЕНТ */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-8 pointer-events-auto">
        <header className="mb-12 text-center md:mb-16">
          <h2 className="text-balance text-4xl font-black tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Наши услуги
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Выполняем любые работы — от переездов до уборки территории
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((item) => (
            <article
              key={item.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-primary hover:shadow-xl"
            >
              <div className="relative h-56 w-full overflow-hidden lg:h-64">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <h3 className="text-xl font-bold leading-snug text-foreground md:text-2xl">
                  {item.title}
                </h3>
                <p className="mt-4 flex-1 text-base leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                <button
                  type="button"
                  onClick={() => openQuickModal()}
                  className="relative z-10 mt-6 inline-flex w-fit items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition duration-300 hover:scale-105 hover:shadow-xl hover:border-primary active:scale-100"
                >
                  Заказать
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-sm md:mt-16 md:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
            <div className="shrink-0 lg:max-w-sm">
              <h3 className="text-2xl font-bold text-foreground md:text-3xl">
                И еще много других работ
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                Не нашли подходящий вид работы? Оставьте заявку — подберём
                исполнителей под вашу задачу.
              </p>
              <button
                type="button"
                onClick={() => openQuickModal()}
                className="relative z-10 mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition duration-300 hover:scale-105 hover:shadow-xl hover:border-primary active:scale-100 sm:w-auto"
              >
                Оставить заявку
              </button>
            </div>

            <div className="relative min-h-0 flex-1">
              <div className="relative max-h-[280px] overflow-hidden md:max-h-[320px] lg:max-h-none lg:overflow-visible">
                <div className="flex flex-wrap gap-2">
                  {tagGroups.map((group) => (
                    <Fragment key={group.label}>
                      <span className="w-full text-sm font-semibold uppercase tracking-wide text-primary">
                        {group.label}
                      </span>
                      {group.tags.map((tag) => (
                        <span
                          key={`${group.label}-${tag}`}
                          className="inline-flex rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-sm text-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent lg:hidden"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
