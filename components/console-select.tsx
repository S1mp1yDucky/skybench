"use client"

import { cn } from "@/lib/utils"

export function ConsoleSelect({
  id,
  label,
  value,
  onChange,
  options,
  theme,
  className,
}: {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  theme: "aws" | "azure" | "do"
  className?: string
}) {
  const current = options.find((item) => item.value === value)
  const hug = theme !== "azure"
  const trigger = theme === "do"
    ? "h-9 rounded-[4px] border-[#d5deea] text-[14px]"
    : theme === "azure"
      ? "h-8 rounded-[2px] border-[#8a8886] text-[14px]"
      : "h-8 rounded-[2px] border-[#7d8998] text-[14px]"
  const menu = theme === "do"
    ? "rounded-[4px] border-[#d5deea]"
    : "rounded-[2px] border-[#d5dbdb]"
  const hover = theme === "azure" ? "hover:bg-[#f3f2f1]" : theme === "do" ? "hover:bg-[#f4f7fb]" : "hover:bg-[#f2f8fd]"
  return (
    <div className={cn(hug ? "relative inline-block max-w-full" : "relative max-w-md", className)}>
      <select id={id} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="sr-only">
        {options.map((item) => <option key={item.value || "empty"} value={item.value}>{item.label}</option>)}
      </select>
      <details className="group">
        <summary className={cn("cursor-pointer list-none items-center border bg-white px-3 [&::-webkit-details-marker]:hidden", hug ? "inline-flex w-max max-w-full gap-2" : "flex justify-between gap-3", trigger)}>
          <span className="truncate">{current?.label || "Select"}</span>
          <svg viewBox="0 0 16 16" className="size-3 shrink-0" aria-hidden><path fill="currentColor" d="M3.2 5.6 8 10.8 12.8 5.6z" /></svg>
        </summary>
        <div className={cn("absolute left-0 z-30 mt-1 max-h-64 overflow-auto border bg-white py-1 shadow-lg", hug ? "w-max min-w-full max-w-[28rem]" : "w-full", menu)}>
          {options.map((item) => (
            <button
              key={item.value || "empty"}
              type="button"
              className={cn("flex items-center gap-2 px-3 py-2 text-left whitespace-nowrap", hug ? "w-max min-w-full" : "w-full justify-between", hover, item.value === value && "font-semibold")}
              onClick={(event) => {
                onChange(item.value)
                const parent = event.currentTarget.closest("details")
                if (parent) parent.open = false
              }}
            >
              <span>{item.label}</span>
              {item.value === value ? <span aria-hidden>✓</span> : null}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}
