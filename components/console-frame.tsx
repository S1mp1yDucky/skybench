"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LabStep } from "@/lib/steps"
import { cn } from "@/lib/utils"

export interface ConsoleNavItem {
  id: string
  label: string
}

interface Theme {
  header: string
  sidebar: string
  nav: string
  navActive: string
  canvas: string
  step: string
  mark: string
}

const THEMES: Record<"aws" | "azure" | "do", Theme> = {
  aws: {
    header: "bg-[#232f3e] text-white",
    sidebar: "bg-[#19222e] text-[#d5dbe3]",
    nav: "text-[#c5ced6] hover:bg-white/5",
    navActive: "bg-white/10 text-white shadow-[inset_3px_0_0_#ff9900]",
    canvas: "bg-[#f2f3f3] text-[#16191f]",
    step: "bg-[#232f3e] text-[#f2f3f3]",
    mark: "bg-[#ff9900] text-[#16191f]",
  },
  azure: {
    header: "bg-[#0078d4] text-white",
    sidebar: "border-r border-[#e1dfdd] bg-white text-[#242424]",
    nav: "text-[#242424] hover:bg-[#f3f2f1]",
    navActive: "bg-[#eff6fc] text-[#0f3b66] shadow-[inset_3px_0_0_#0078d4]",
    canvas: "bg-[#faf9f8] text-[#242424]",
    step: "bg-[#0f3b66] text-white",
    mark: "bg-white/20 text-white",
  },
  do: {
    header: "border-b border-[#e6e8ee] bg-white text-[#031b4e]",
    sidebar: "border-r border-[#e6e8ee] bg-white text-[#031b4e]",
    nav: "text-[#14315c] hover:bg-[#f3f7ff]",
    navActive: "bg-[#e8f1ff] text-[#0047b3] shadow-[inset_3px_0_0_#0069ff]",
    canvas: "bg-[#f5f7fb] text-[#10233f]",
    step: "bg-[#031b4e] text-white",
    mark: "bg-[#0069ff] text-white",
  },
}

export function ConsoleFrame({
  theme,
  product,
  account,
  region,
  nav,
  active,
  onNavigate,
  locked,
  steps,
  alert,
  children,
}: {
  theme: keyof typeof THEMES
  product: string
  account: string
  region?: React.ReactNode
  nav: ConsoleNavItem[]
  active: string
  onNavigate: (id: string) => void
  locked: boolean
  steps: LabStep[]
  alert?: string | null
  children: React.ReactNode
}) {
  const skin = THEMES[theme]
  const [open, setOpen] = useState(false)
  const done = steps.filter((step) => step.done).length

  function go(id: string) {
    onNavigate(id)
    setOpen(false)
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", skin.canvas)}>
      <header className={cn("flex items-center gap-3 px-3 py-2", skin.header)}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("md:hidden", theme === "do" ? "text-[#031b4e]" : "text-white hover:bg-white/10")}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X /> : <Menu />}
        </Button>
        <div className="min-w-0">
          <p className={cn("w-fit rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase", skin.mark)}>
            {product}
          </p>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 text-xs sm:gap-3 sm:text-sm">
          {region}
          <span className="truncate">{account}</span>
        </div>
      </header>
      {alert ? (
        <p role="alert" className="bg-[#8a2e24] px-3 py-2 text-sm text-white">
          {alert}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "z-30 w-60 shrink-0 flex-col gap-1 p-2 md:flex",
            skin.sidebar,
            open ? "absolute inset-y-24 left-0 flex shadow-xl md:static md:inset-auto md:shadow-none" : "hidden"
          )}
        >
          <p className="px-2 pt-1 text-[10px] tracking-[0.16em] uppercase opacity-60">Services</p>
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => go(item.id)}
              className={cn(
                "rounded-md px-2 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40",
                skin.nav,
                active === item.id && skin.navActive
              )}
            >
              {item.label}
            </button>
          ))}
        </aside>
        <main id="main" className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          <details className="mb-4 rounded-xl border border-black/10 bg-white p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium">
              Lab steps {done}/7
            </summary>
            <div className="mt-3">
              <StepList steps={steps} />
            </div>
          </details>
          {children}
        </main>
        <aside className={cn("hidden w-72 shrink-0 flex-col p-4 lg:flex", skin.step)}>
          <p className="text-[10px] tracking-[0.16em] uppercase opacity-70">Assignment steps</p>
          <p className="mt-1 text-sm font-medium">{done} of 7 complete</p>
          <div className="mt-4">
            <StepList steps={steps} light />
          </div>
        </aside>
      </div>
    </div>
  )
}

function StepList({ steps, light = false }: { steps: LabStep[]; light?: boolean }) {
  return (
    <ol className="grid gap-3">
      {steps.map((step) => (
        <li key={step.n} className="grid grid-cols-[1.25rem_1fr] gap-2 text-sm">
          <span
            className={cn(
              "mt-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
              step.done
                ? "bg-[#1d5a32] text-white"
                : light
                  ? "bg-white/15 text-white"
                  : "bg-[#efe6d6] text-[#4d463c]"
            )}
            aria-hidden
          >
            {step.done ? "✓" : step.n}
          </span>
          <span>
            <span className="font-medium">{step.title}</span>
            <span className={cn("mt-0.5 block text-xs leading-4", light ? "text-white/75" : "text-[#6d6256]")}>
              {step.detail}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
