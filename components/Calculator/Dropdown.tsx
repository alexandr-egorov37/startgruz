"use client"

import { useEffect, useMemo, useRef } from "react"
import { ChevronDown } from "lucide-react"

export type DropdownOption = {
  value: string
  label: string
}

type DropdownProps = {
  id: string
  open: boolean
  title: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  onOpenChange: (open: boolean) => void
}

export function Dropdown({
  id,
  open,
  title,
  value,
  options,
  onChange,
  onOpenChange,
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onDocumentClick = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el) return
      const target = e.target
      if (target instanceof Node && !el.contains(target)) {
        onOpenChange(false)
      }
    }

    document.addEventListener("click", onDocumentClick)
    return () => document.removeEventListener("click", onDocumentClick)
  }, [open, onOpenChange])

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? title,
    [options, title, value]
  )

  if (!open) return null

  return (
    <div ref={rootRef} className="relative">
      <div
        className="
          absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl
          bg-[#2b2b2b] border border-white/10 shadow-xl
          animate-in fade-in slide-in-from-bottom-4 duration-300
        "
        aria-label={`${id}-dropdown`}
        role="listbox"
      >
        <div
          className="
            max-h-60 overflow-auto p-2
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-thumb]:bg-[#fbbf24]
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-track]:bg-black/20
            scrollbar-color-[#fbbf24] rgba(0,0,0,0.2)
          "
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  onOpenChange(false)
                }}
                className={`
                  w-full rounded-lg px-3 py-2 text-left text-base transition
                  ${
                    isSelected
                      ? "bg-[#fbbf24] text-black font-semibold"
                      : "text-foreground hover:bg-white/5 hover:text-[#fbbf24]"
                  }
                `}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{opt.label}</span>
                  {isSelected ? (
                    <ChevronDown className="h-4 w-4 rotate-[-90deg] text-black/70" />
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* hidden helper for screen readers */}
      <span className="sr-only">{selectedLabel}</span>
    </div>
  )
}

