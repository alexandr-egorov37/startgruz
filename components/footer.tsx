"use client"

import { Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-black text-primary-foreground">G</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              ГрузПро
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            <a
              href="#advantages"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Преимущества
            </a>
            <a
              href="#services"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Услуги
            </a>
            <a
              href="#calculator"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Калькулятор
            </a>
            <a
              href="#reviews"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Отзывы
            </a>
            <a
              href="#contacts"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Контакты
            </a>
          </nav>

          {/* Phone */}
          <a
            href="tel:+79203507778"
            className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            <Phone className="h-4 w-4" />
            +7 (920) 350-77-78
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-border pt-8 md:flex-row md:justify-between">
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} ГрузПро. Все права защищены.
          </p>
          <a
            href="#"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Политика конфиденциальности
          </a>
        </div>
      </div>
    </footer>
  )
}
