"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle } from "lucide-react"

export function Contacts() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    section.style.opacity = "1"
    section.style.transform = "none"
  }, [])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    el.style.opacity = "1"
    el.style.transform = "none"
  }, [])

  return (
    <section
      id="contacts"
      ref={sectionRef}
      className="relative overflow-hidden py-28"
    >
      {/* ФОН И ЗАТЕМНЕНИЕ В 1 СЛОЕ */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.85), rgba(0,0,0,0.95)), url('/images/hero-bg-5.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 pointer-events-auto">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center">
          
          {/* Текст над картой */}
          <h2 className="text-[#fff] desktop:text-[24px] text-[16px] md:text-[20px] lg:text-[24px] text-center font-medium mt-[40px] mb-[20px]">
            Напишите нам в мессенджер для бесплатной консультации
          </h2>

          {/* Кнопки мессенджеров (в 1 линию на десктопе, в столбик на мобиле) */}
          <div className="flex flex-col md:flex-row gap-[12px] md:gap-[16px] mb-12 w-full md:w-auto items-center justify-center">
             <a
                href="https://t.me/alexandrbiz37"
                className="
                  flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-[18px] py-[10px] w-full md:w-auto
                  transition hover:bg-white/10
                "
             >
                <div className="flex items-center justify-center bg-[#2db9fc] w-6 h-6 rounded-full">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                   </svg>
                </div>
                Telegram
             </a>
             <a
                href="https://wa.me/message/KGQR6PX3UIISM1"
                className="
                  flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-[18px] py-[10px] w-full md:w-auto
                  transition hover:bg-white/10
                "
             >
                <div className="flex items-center justify-center bg-[#25D366] w-6 h-6 rounded-full">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                   </svg>
                </div>
                WhatsApp
             </a>
             <a
                href="https://max.ru/u/f9LHodD0cOKGTse8vP7Rucuq_Dlqg9lxJyvQY72_aaCgGqNFaz2ToA5FkdA"
                className="
                  flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-[18px] py-[10px] w-full md:w-auto
                  transition hover:bg-white/10
                "
             >
                <div className="flex items-center justify-center bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] w-6 h-6 rounded-full">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.3 12.7h-1.5c-2.4 0-4.1-1.6-4.6-2.2-.4-.6-.8-1.5-.8-1.5s-.1-.2-.1-.5v-1.5c0-.6.4-1.1 1-1.1h1.5c.3 0 .7.1.9.3.3.3.4.7.5 1l.5 1.5c.2.5.8.6 1.1.2l1.6-1.5c.3-.3.4-.6.4-1V8.5c0-.6-.5-1-1-1h-1.5c-.3 0-.6.1-.9.3l-2.2 2c-.3.3-.8.4-1.2.2L6 9.2c-.5-.2-.9-.8-.9-1.4V6c0-.6.5-1 1-1h6.5c2.5 0 4.5 2 4.5 4.5v5.2c0 .6-.5 1-1 1z"/>
                   </svg>
                </div>
                MAX
             </a>
          </div>

          {/* Только карта */}
          <div
            ref={cardRef}
            className="
              h-[280px] w-full overflow-hidden rounded-xl border border-white/10
              bg-black shadow-2xl backdrop-blur-sm md:h-[330px]
            "
          >
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=41.3888%2C56.8486&z=16&pt=41.3888,56.8486,pm2rdm"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              loading="lazy"
              title="Карта: г. Шуя, ул. Малахия Белова, 15"
              className="[filter:invert(90%)_hue-rotate(180deg)_saturate(0.7)_brightness(0.8)_contrast(1.05)] h-full w-full pointer-events-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
