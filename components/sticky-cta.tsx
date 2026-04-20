"use client"

import { useState, useEffect } from "react"
import { Phone } from "lucide-react"
import { useQuickModal } from "@/components/quick-modal/QuickModalProvider"

export function StickyCta() {
  const [visible, setVisible] = useState(false)
  const { openQuickModal } = useQuickModal()

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => openQuickModal()}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-110 active:scale-95 md:hidden"
        aria-label="Заказать"
      >
        <Phone className="h-6 w-6" />
      </button>

      {/* Desktop sticky bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 hidden border-t border-border bg-background/95 backdrop-blur-md transition-transform duration-300 md:block ${visible ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-3">
          <p className="text-sm font-semibold text-foreground">
            Нужны грузчики? Оставьте заявку прямо сейчас!
          </p>
          <div className="flex items-center gap-3">
            <a
               href="tel:+79203507778"
               className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
             >
               <Phone className="h-4 w-4" />
               Позвонить
             </a>
            <button
              type="button"
              onClick={() => openQuickModal()}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              Заказать
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
