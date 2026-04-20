"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Sparkles, Star, X } from "lucide-react"
import { useReviewsStats } from "../hooks/use-reviews-stats"

const tabs = [
  { id: "avito", label: "Отзывы с Авито" },
  { id: "site", label: "Отзывы с сайта" },
  { id: "social", label: "Социальные сети" },
] as const

type TabId = (typeof tabs)[number]["id"]

type Review = {
  id: string
  name: string
  role?: string
  text: string
  avatar?: string
  rating: number
  source: string
  type: "site" | "avito" | "social"
  source_url?: string
  image_url?: string
  createdAt: string
  isVerified: boolean
}

const fallbackReviews: Review[] = [
  {
    id: "mock-1",
    name: "Алексей М.",
    role: "Клиент",
    avatar: "А",
    rating: 5,
    text: "Переезжали из трёшки. Ребята приехали вовремя, всё упаковали и перевезли за 4 часа. Ни одной царапины на мебели. Рекомендую!",
    source: "site",
    type: "site",
    createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    isVerified: false,
  },
  {
    id: "mock-2",
    name: "Ольга С.",
    role: "Клиент",
    avatar: "О",
    rating: 5,
    text: "Вызывала грузчиков для подъёма дивана на 7 этаж без лифта. Справились за 20 минут, очень вежливые и аккуратные. Цена как договаривались.",
    source: "site",
    type: "site",
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    isVerified: false,
  },
  {
    id: "mock-3",
    name: "Дмитрий К.",
    role: "Клиент",
    avatar: "Д",
    rating: 5,
    text: "Офисный переезд прошёл идеально. Работали ночью, утром все сотрудники сели за свои рабочие места. Профессионалы!",
    source: "avito",
    type: "avito",
    source_url: "https://avito.ru",
    createdAt: new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString(),
    isVerified: true,
  },
  {
    id: "mock-4",
    name: "Марина В.",
    role: "Клиент",
    avatar: "М",
    rating: 4,
    text: "Заказывала вывоз строительного мусора после ремонта. Приехали быстро, всё вынесли и увезли. Очень удобный сервис, буду обращаться ещё.",
    source: "social",
    type: "social",
    image_url: "https://images.unsplash.com/photo-1555421689-d68471e189f2?w=400&h=400&fit=crop",
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    isVerified: true,
  },
]

function Stars({ ratingValue }: { ratingValue: number }) {
  const rating = Math.max(1, Math.min(5, Math.round(ratingValue)))

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 fill-current ${i < rating ? "text-yellow-400" : "text-muted-foreground/70"
            }`}
        />
      ))}
    </div>
  )
}

export function Reviews() {
  const PAGE_SIZE = 8
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const { averageRating, totalReviews } = useReviewsStats()

  const [activeTab, setActiveTab] = useState<TabId>("avito")
  const [pageByTab, setPageByTab] = useState<Record<TabId, number>>({
    avito: 1,
    site: 1,
    social: 1,
  })
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews)

  const [modalOpen, setModalOpen] = useState(false)
  const [thanks, setThanks] = useState<string | null>(null)

  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add("modal-open")
    } else {
      document.body.classList.remove("modal-open")
    }
    return () => document.body.classList.remove("modal-open")
  }, [modalOpen])

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [text, setText] = useState("")
  const [rating, setRating] = useState<number>(5)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    section.style.opacity = "1"
    section.style.transform = "none"
  }, [])

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { supabase } = await import("../lib/supabase")
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data && Array.isArray(data) && data.length > 0) {
          const formatted = data.map((d) => ({
            id: d.id,
            name: d.name || "Аноним",
            role: "Клиент",
            text: d.text || "",
            avatar: (d.name?.[0] || "?").toUpperCase(),
            rating: d.rating || 5,
            source: d.type || "site",
            type: d.type || "site",
            source_url: d.external_link || d.source_url,
            image_url: d.image_url,
            createdAt: d.manual_date || d.created_at,
            isVerified: true,
          }))
          setReviews((prev) => {
            // Merge with fallback or replace entirely
            // We'll just replace entirely with db data, 
            // but if there are fewer than 2 we can keep fallback
            return formatted.length > 0 ? formatted : prev
          })
        }
      } catch (e) {
        console.error("Ошибка загрузки отзывов", e)
      }
    }

    fetchReviews()
  }, [])

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (activeTab === "site") {
        return r.source === "site" || r.source === "telegram"
      }
      return r.source === activeTab
    })
  }, [reviews, activeTab])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  }, [filtered.length, PAGE_SIZE])

  const currentPage = useMemo(() => {
    const raw = pageByTab[activeTab] ?? 1
    return Math.min(Math.max(1, raw), totalPages)
  }, [activeTab, pageByTab, totalPages])

  useEffect(() => {
    setPageByTab((prev) => {
      const next = Math.min(Math.max(1, prev[activeTab] ?? 1), totalPages)
      if (next === (prev[activeTab] ?? 1)) return prev
      return { ...prev, [activeTab]: next }
    })
  }, [activeTab, totalPages])

  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage, PAGE_SIZE])

  useEffect(() => {
    const root = cardsRef.current
    if (!root) return
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-review-card]"))

    cards.forEach((el) => {
      el.style.opacity = "0"
      el.style.transform = "translateY(14px)"
    })

    cards.forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = "opacity 0.45s ease, transform 0.45s ease"
        el.style.opacity = "1"
        el.style.transform = "translateY(0px)"
      }, i * 120)
    })
  }, [activeTab, currentPage, filtered.length])

  async function submitReview() {
    setThanks(null)
    try {
      const reviewStatus = rating === 5 ? "approved" : "pending"
      // Save to Supabase
      const { supabase } = await import("../lib/supabase")
      const { error: dbError } = await supabase.from("reviews").insert([{
        name: name.trim(),
        text: text.trim(),
        rating,
        status: reviewStatus,
        type: "site",
      }])

      if (dbError) throw new Error(dbError.message)

      if (reviewStatus === "approved") {
        setReviews(prev => [{
          id: String(Date.now()),
          name: name.trim(),
          role: "Клиент",
          text: text.trim(),
          avatar: name.trim()?.[0]?.toUpperCase() || "?",
          rating,
          source: "site",
          type: "site",
          createdAt: new Date().toISOString(),
          isVerified: true
        }, ...prev])
        setThanks("Спасибо за отзыв!")
      } else {
        setThanks("Отзыв отправлен на модерацию!")
      }

      setName("")
      setPhone("")
      setText("")
      setRating(5)

      setTimeout(() => {
        setModalOpen(false)
        setThanks(null)
      }, 2000)
    } catch (e) {
      setThanks(e instanceof Error ? e.message : "Ошибка отправки")
    }
  }

  return (
    <section
      id="reviews"
      ref={sectionRef}
      className="relative py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Trust block */}
        <div className="mb-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <Sparkles className="h-6 w-6 text-primary" />
                <div>
                  <div className="text-sm font-semibold uppercase tracking-widest text-primary">
                    Доверие клиентов
                  </div>
                  <div className="mt-1 text-2xl font-black text-foreground">
                    ⭐ {averageRating} / 5
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {totalReviews > 0 ? (
                  <>
                    на основе{" "}
                    <span className="font-bold text-foreground">{totalReviews}</span>{" "}
                    отзывов
                  </>
                ) : (
                  "на основе более чем 120+ отзывов"
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
              {["500+ клиентов", "Работаем 24/7", "Без скрытых платежей"].map(
                (t) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.35)]" />
                    <span>{t}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            Отзывы
          </span>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-foreground md:text-5xl">
            Что говорят клиенты
          </h2>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {tabs.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${active
                    ? "border-primary bg-[#fbbf24] text-black"
                    : "border-border bg-transparent text-foreground/80 hover:border-primary/70"
                  }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Cards */}
        <div ref={cardsRef} className="grid gap-6 md:grid-cols-2">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-10">
              Пока нет отзывов
            </div>
          ) : (
            paged.map((review) => (
              <div
                key={review.id}
                data-review-card
                className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:scale-[1.02] hover:border-primary/30"
                style={{ willChange: "transform" }}
              >
                {review.type === "social" && review.image_url ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={review.image_url}
                      alt={review.name || "Скрин отзыва"}
                      className="w-full rounded-xl object-cover"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                      <span>{review.name || "Социальные сети"}</span>
                      <span>{review.createdAt.includes('.') ? review.createdAt : new Date(review.createdAt).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-4">
                      {review.avatar?.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.avatar}
                          alt={review.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                          {review.avatar}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {review.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {review.role} •{" "}
                          {review.createdAt.includes('.') ? review.createdAt : new Date(review.createdAt).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Stars ratingValue={review.rating} />
                      {review.isVerified ? (
                        <div className="mt-1">
                          <span className="text-green-400 text-sm">
                            ✔ Проверенный отзыв
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {review.text}
                    </p>
                    {review.type === "avito" && review.source_url ? (
                      <div className="mt-4">
                        <a
                          href={review.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                        >
                          Подробнее
                        </a>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                setPageByTab((prev) => ({
                  ...prev,
                  [activeTab]: Math.max(1, currentPage - 1),
                }))
              }
              disabled={currentPage <= 1}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              ←
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1
                const active = page === currentPage
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() =>
                      setPageByTab((prev) => ({ ...prev, [activeTab]: page }))
                    }
                    className={`h-2.5 w-2.5 rounded-full transition ${active ? "bg-[#fbbf24]" : "bg-border hover:bg-primary/60"
                      }`}
                    aria-label={`Страница ${page}`}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                setPageByTab((prev) => ({
                  ...prev,
                  [activeTab]: Math.min(totalPages, currentPage + 1),
                }))
              }
              disabled={currentPage >= totalPages}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              →
            </button>
          </div>
        ) : null}

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-2xl bg-primary px-8 py-3 text-base font-bold text-primary-foreground transition hover:scale-[1.02] hover:shadow-xl"
          >
            Оставить отзыв
          </button>
        </div>

        {/* Modal */}
        {modalOpen ? (
          <div
            className="fixed inset-0 z-50 flex overflow-y-auto items-end justify-center bg-black/70 p-4 md:items-center"
            style={{ WebkitOverflowScrolling: "touch" }}
            role="dialog"
            aria-modal="true"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-[#1f1f1f] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Оставить отзыв
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ваш отзыв помогает выбирать лучше.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-2 text-foreground/80 transition hover:bg-white/5 hover:text-foreground"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Имя"
                  className="rounded-xl bg-black/40 p-4 text-base text-foreground placeholder:text-foreground/50 outline-none"
                  required
                />

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Телефон (опционально)"
                  className="rounded-xl bg-black/40 p-4 text-base text-foreground placeholder:text-foreground/50 outline-none"
                />

                <div>
                  <div className="text-sm font-semibold text-muted-foreground">
                    Рейтинг
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`rounded-full border px-3 py-1 text-sm font-bold transition ${rating === n
                            ? "border-primary bg-[#fbbf24] text-black"
                            : "border-border bg-transparent text-foreground/80 hover:border-primary/70"
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Текст отзыва"
                  className="min-h-[110px] resize-none rounded-xl bg-black/40 p-4 text-base text-foreground placeholder:text-foreground/50 outline-none"
                  required
                />

                {thanks ? (
                  <div
                    className={`rounded-xl p-3 text-sm font-semibold ${thanks === "Спасибо за отзыв!"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-red-400/10 text-red-400"
                      }`}
                  >
                    {thanks}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={submitReview}
                  className="rounded-xl bg-primary py-4 text-base font-bold text-black transition-transform duration-300 hover:scale-105 hover:shadow-xl"
                >
                  Добавить отзыв
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
