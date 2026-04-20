"use client"

import { useEffect, useRef } from "react"
import CalculatorWizard from "./CalculatorWizard/CalculatorWizard"

export function CalculatorSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add(
            "animate-in",
            "fade-in",
            "slide-in-from-bottom-4"
          )
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
      id="calculator"
      ref={sectionRef}
      className="relative py-24 overflow-visible scroll-mt-28 z-10"
    >
      {/* ФОН */}
      <div
        className="absolute inset-0 z-0 pointer-events-none select-none"
        aria-hidden="true"
      />

      {/* КОНТЕНТ */}
      <div className="relative z-10 pointer-events-auto">
        <CalculatorWizard />
      </div>
    </section>
  )
}
