"use client"

import { useMemo } from "react"
import { ChevronDown } from "lucide-react"
import type { DropdownOption } from "./Dropdown"
import { Dropdown } from "./Dropdown"

type SelectProps = {
  id: string
  label: string
  value: string
  options: DropdownOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: string) => void
  placeholder?: string
}

export function Select({
  id,
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
  placeholder,
}: SelectProps) {
  const selected = useMemo(
    () => options.find((o) => o.value === value)?.label ?? placeholder ?? "",
    [options, placeholder, value]
  )

  return (
    <div className="space-y-3">
      <label className="block text-base font-semibold text-foreground">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="
            flex w-full items-center justify-between gap-3 rounded-2xl
            bg-[#2b2b2b] border border-white/10 px-5 py-4
            text-base font-semibold text-foreground
            transition hover:border-[#fbbf24]/70
          "
          onClick={() => onOpenChange(!open)}
        >
          <span className="truncate text-left">{selected}</span>
          <ChevronDown
            className={`h-5 w-5 text-[#fbbf24] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <Dropdown
          id={id}
          open={open}
          title={label}
          value={value}
          options={options}
          onChange={onChange}
          onOpenChange={onOpenChange}
        />
      </div>
    </div>
  )
}

