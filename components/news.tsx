"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { ChevronLeft, ChevronRight } from "lucide-react"

type NewsItem = {
  id: string
  title: string
  content: string
  image_url: string
  created_at: string
  status: string
}

export function News() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .in("status", ["опубликовано", "PUBLISHED"])
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setNews(data || [])
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const nextSlide = useCallback(() => {
    if (news.length === 0) return
    setIndex((prev) => (prev + 1) % news.length)
  }, [news.length])

  const prevSlide = useCallback(() => {
    if (news.length === 0) return
    setIndex((prev) => (prev - 1 + news.length) % news.length)
  }, [news.length])

  useEffect(() => {
    if (isPaused || news.length < 2) return

    timerRef.current = setInterval(() => {
      nextSlide()
    }, 4000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, news.length, nextSlide])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setIsPaused(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const touchEnd = e.targetTouches[0].clientX
    if (touchStart - touchEnd > 50) {
      nextSlide()
      setTouchStart(null)
    } else if (touchStart - touchEnd < -50) {
      prevSlide()
      setTouchStart(null)
    }
  }

  const handleTouchEnd = () => {
    setIsPaused(false)
    setTouchStart(null)
  }

  if (news.length === 0) return null

  return (
    <section className="bg-black py-24 overflow-hidden" id="news">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Новости</span>
            <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Актуальные работы и кейсы</h2>
        </div>

        <div 
          className="relative px-4"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* TRACK COMPONENT */}
          <div className="overflow-hidden py-10">
            <div 
              className="flex items-start transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${index * (100 / (typeof window !== "undefined" && window.innerWidth >= 1024 ? 2 : 1))}%)`,
              }}
            >
              {news.map((item, i) => {
                const isActive = i === index
                return (
                  <div 
                    key={item.id} 
                    className="w-full shrink-0 px-3 lg:w-1/2 transition-all duration-500 ease-in-out"
                    style={{
                        transform: `scale(${isActive ? 1 : 0.95})`,
                        opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    <div className="group flex flex-col overflow-hidden rounded-2xl bg-[#1a1a1a] border border-white/5 shadow-2xl transition duration-500 hover:scale-[1.02]">
                      <div className="aspect-[16/10] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.image_url || "/images/placeholder.svg"} 
                          alt={item.title} 
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-2 text-xs font-semibold text-primary">
                          {new Date(item.created_at).toLocaleDateString("ru-RU")}
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-white uppercase tracking-tight">{item.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {item.content || ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ARROWS */}
          {news.length > 1 && (
            <div className="absolute inset-y-0 -left-12 -right-12 pointer-events-none hidden md:flex items-center justify-between z-20">
              <button 
                onClick={prevSlide}
                className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white transition hover:bg-primary hover:text-black hover:scale-110 active:scale-95 shadow-2xl"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button 
                onClick={nextSlide}
                className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white transition hover:bg-primary hover:text-black hover:scale-110 active:scale-95 shadow-2xl"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
          )}

          {/* DOTS */}
          {news.length > 1 && (
            <div className="mt-8 flex justify-center gap-3">
              {news.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-primary" : "w-2.5 bg-white/20"}`}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
