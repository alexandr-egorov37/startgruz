"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { Phone, Menu, X } from "lucide-react"
import { useQuickModal } from "@/components/quick-modal/QuickModalProvider"

const navLinks = [
  { href: "#calculator", label: "Калькулятор" },
  { href: "#news", label: "Новости" },
  { href: "#advantages", label: "Преимущества" },
  { href: "#services", label: "Услуги" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#contacts", label: "Контакты" },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { openQuickModal } = useQuickModal()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-background/95 border-b border-border shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-6">
        <a href="#" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="БРОРУЗЧИК"
            width={48}
            height={48}
            className="rounded-lg object-contain"
            priority
          />
          <span className="text-2xl font-bold tracking-tight text-foreground">
GRUZ-RUS-SERVIS
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-medium text-muted-foreground transition-colors duration-300 hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <a
            href="tel:+79203507778"
            className="flex items-center gap-2 text-base font-semibold text-foreground transition-colors duration-300 hover:text-primary"
          >
            <Phone className="h-5 w-5" />
            +7 (920) 350-77-78
          </a>
          <button
            type="button"
            onClick={() => openQuickModal()}
            className="rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition duration-300 hover:scale-105 hover:shadow-xl hover:border-primary active:scale-95 cursor-pointer relative z-20"
          >
            Оставить заявку
          </button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-foreground lg:hidden"
          aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background/95 lg:hidden">
          <nav className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors duration-300 hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href="tel:+79203507778"
              className="mt-2 flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-primary"
            >
              <Phone className="h-5 w-5" />
              +7 (920) 350-77-78
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                openQuickModal()
              }}
              className="mt-2 rounded-xl bg-primary px-6 py-3 text-center text-base font-semibold text-primary-foreground transition duration-300 hover:scale-105 hover:shadow-xl hover:border-primary"
            >
              Оставить заявку
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
