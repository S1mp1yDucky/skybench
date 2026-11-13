"use client"

import { useState } from "react"
import { ChevronDown, Menu, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LabStep } from "@/lib/steps"
import { cn } from "@/lib/utils"

export interface ConsoleNavItem {
  id: string
  label: string
  group?: string
}

export function ConsoleFrame({
  theme,
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
  theme: "aws" | "azure" | "do"
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
  const [open, setOpen] = useState(false)
  const done = steps.filter((step) => step.done).length

  function go(id: string) {
    onNavigate(id)
    setOpen(false)
  }

  const sidebar = (
    <nav aria-label="Services" className="grid gap-0.5">
      {theme === "aws" ? <AwsNav nav={nav} active={active} locked={locked} onNavigate={go} /> : null}
      {theme === "azure" ? <FlatNav nav={nav} active={active} locked={locked} onNavigate={go} tone="azure" /> : null}
      {theme === "do" ? <DoNav nav={nav} active={active} locked={locked} onNavigate={go} /> : null}
    </nav>
  )

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", theme === "do" ? "bg-[#f4f7fb] text-[#031b4e]" : "bg-white text-[#16191f]")}>
      {theme === "aws" ? (
        <header className="flex h-12 items-center gap-3 bg-[#232f3e] px-2 text-white sm:px-3">
          <MenuButton open={open} onClick={() => setOpen((value) => !value)} light />
          <span className="text-[22px] font-semibold tracking-tight lowercase">aws</span>
          <span className="hidden text-sm text-[#d5dbdb] sm:inline">EC2</span>
          <div className="ml-auto flex min-w-0 items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            {region}
            <span className="max-w-[180px] truncate">{account}</span>
            <StepsMenu done={done} steps={steps} dark />
          </div>
        </header>
      ) : null}
      {theme === "azure" ? (
        <header className="flex h-12 items-center gap-2 bg-[#0078d4] px-2 text-white sm:px-3">
          <MenuButton open={open} onClick={() => setOpen((value) => !value)} light />
          <span className="hidden shrink-0 text-[15px] font-semibold sm:inline">Microsoft Azure</span>
          <label className="relative mx-1 min-w-0 flex-1">
            <span className="sr-only">Search resources, services, and docs</span>
            <Search className="pointer-events-none absolute top-1.5 left-2 size-4 text-[#616161]" />
            <input
              readOnly
              value=""
              placeholder="Search resources, services, and docs (G+/)"
              className="h-8 w-full rounded-sm bg-white pr-2 pl-8 text-sm text-[#242424] outline-none placeholder:text-[#616161]"
            />
          </label>
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block max-w-[220px] truncate">{account}</span>
              <span className="block text-[10px] tracking-wide text-white/80 uppercase">Default Directory</span>
            </span>
            <StepsMenu done={done} steps={steps} dark />
          </div>
        </header>
      ) : null}
      {theme === "do" ? (
        <div className="flex min-h-0 flex-1">
          <aside className={cn("z-30 w-56 shrink-0 bg-[#031b4e] text-white md:static md:flex md:flex-col", open ? "absolute inset-y-0 left-0 flex" : "hidden md:flex")}>
            <div className="flex items-center gap-2 px-4 py-4">
              <span className="grid size-7 place-items-center rounded-full bg-white text-sm font-bold text-[#0069ff]">D</span>
              <span className="text-sm font-semibold">DigitalOcean</span>
            </div>
            {sidebar}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center gap-2 border-b border-[#e6e8ee] bg-white px-3">
              <MenuButton open={open} onClick={() => setOpen((value) => !value)} className="md:hidden" />
              <label className="relative hidden min-w-0 flex-1 sm:block">
                <span className="sr-only">Search</span>
                <Search className="pointer-events-none absolute top-2 left-2 size-4 text-[#8b93a7]" />
                <input readOnly placeholder="Search resources, pages, or public IP (Ctrl+K)" className="h-8 w-full max-w-md rounded-full border border-[#d5dbe7] pr-3 pl-8 text-sm outline-none" />
              </label>
              <Button type="button" className="ml-auto h-8 rounded-full bg-[#0069ff] px-4 text-white hover:bg-[#0056d6]" onClick={() => go("create")} disabled={locked}>
                Create
              </Button>
              <span className="hidden rounded-full bg-[#e8f8ef] px-2 py-1 text-xs font-medium text-[#0b7a3b] sm:inline">Signup Credit: $5.00</span>
              <span className="hidden text-sm sm:inline">My Team</span>
              <span className="max-w-[120px] truncate text-xs text-[#4d5875]">{account}</span>
              <StepsMenu done={done} steps={steps} />
            </header>
            {alert ? <Alert>{alert}</Alert> : null}
            <main id="main" className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">{children}</main>
          </div>
        </div>
      ) : (
        <>
          {alert ? <Alert>{alert}</Alert> : null}
          <div className="flex min-h-0 flex-1">
            <aside
              className={cn(
                "z-30 w-60 shrink-0 overflow-auto border-r border-[#eaeded] bg-white p-3 md:static md:block",
                theme === "azure" && "border-[#e1dfdd]",
                open ? "absolute top-12 bottom-0 left-0 block shadow-xl md:static md:shadow-none" : "hidden md:block",
                theme === "azure" && !open && "md:hidden"
              )}
            >
              {theme === "azure" ? <p className="mb-2 text-xs font-semibold tracking-wide text-[#0078d4] uppercase">All services</p> : null}
              {sidebar}
            </aside>
            <main id="main" className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">{children}</main>
          </div>
          {theme === "aws" ? (
            <footer className="border-t border-[#eaeded] px-4 py-2 text-[11px] text-[#545b64]">
              © 2026, Amazon Web Services, Inc. or its affiliates. Privacy · Terms · Cookie preferences
            </footer>
          ) : null}
        </>
      )}
    </div>
  )
}

function MenuButton({ open, onClick, light, className }: { open: boolean; onClick: () => void; light?: boolean; className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(light ? "text-white hover:bg-white/10" : "text-[#031b4e]", className)}
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "Close navigation" : "Open navigation"}
    >
      {open ? <X /> : <Menu />}
    </Button>
  )
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="bg-[#8a2e24] px-3 py-2 text-sm text-white">
      {children}
    </p>
  )
}

function StepsMenu({ done, steps, dark = false }: { done: number; steps: LabStep[]; dark?: boolean }) {
  return (
    <details className="relative">
      <summary className={cn("cursor-pointer list-none rounded px-2 py-1 text-xs font-medium", dark ? "hover:bg-white/10" : "hover:bg-[#f3f7ff]")}>
        Assignment {done}/7
      </summary>
      <div className="absolute top-8 right-0 z-40 w-80 rounded-lg border border-[#d5dbdb] bg-white p-3 text-[#16191f] shadow-xl">
        <p className="text-sm font-medium">{done} of 7 complete</p>
        <div className="mt-3 max-h-80 overflow-auto">
          <StepList steps={steps} />
        </div>
      </div>
    </details>
  )
}

function StepList({ steps }: { steps: LabStep[] }) {
  return (
    <ol className="grid gap-3">
      {steps.map((step) => (
        <li key={step.n} className="grid grid-cols-[1.25rem_1fr] gap-2 text-sm">
          <span className={cn("mt-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold", step.done ? "bg-[#1d5a32] text-white" : "bg-[#efe6d6] text-[#4d463c]")} aria-hidden>
            {step.done ? "✓" : step.n}
          </span>
          <span>
            <span className="font-medium">{step.title}</span>
            <span className="mt-0.5 block text-xs leading-4 text-[#545b64]">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function NavButton({
  label,
  active,
  disabled,
  onClick,
  nested = false,
  tone = "aws",
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
  nested?: boolean
  tone?: "aws" | "azure" | "do"
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full rounded px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40",
        nested && "pl-6",
        tone === "aws" && (active ? "bg-[#f2f8fd] font-semibold text-[#0073bb]" : "text-[#16191f] hover:bg-[#fafafa]"),
        tone === "azure" && (active ? "bg-[#eff6fc] font-semibold text-[#0078d4]" : "text-[#242424] hover:bg-[#f3f2f1]"),
        tone === "do" && (active ? "bg-white/10 font-semibold text-white" : "text-[#d5def0] hover:bg-white/5")
      )}
    >
      {label}
    </button>
  )
}

function AwsNav({ nav, active, locked, onNavigate }: { nav: ConsoleNavItem[]; active: string; locked: boolean; onNavigate: (id: string) => void }) {
  function item(id: string, label: string, nested = false) {
    const known = nav.some((entry) => entry.id === id)
    if (!known) return null
    return <NavButton key={id} label={label} nested={nested} active={active === id} disabled={locked} onClick={() => onNavigate(id)} />
  }
  return (
    <div className="grid gap-3 text-sm">
      <div>
        <p className="px-2 text-base font-semibold">EC2</p>
        {item("home", "Dashboard")}
        {item("study", "Products and pricing")}
      </div>
      <div>
        <p className="px-2 text-xs font-semibold text-[#545b64]">Instances</p>
        {item("ec2", "EC2 instances", true)}
        {item("launch", "Launch instance", true)}
      </div>
      <div>
        <p className="px-2 text-xs font-semibold text-[#545b64]">Images</p>
        <p className="px-6 py-1 text-[#545b64]">AMIs</p>
        <p className="px-6 py-1 text-[#545b64]">AMI Catalog</p>
      </div>
      <div>
        <p className="px-2 text-xs font-semibold text-[#545b64]">Elastic Block Store</p>
        <p className="px-6 py-1 text-[#545b64]">Volumes</p>
        <p className="px-6 py-1 text-[#545b64]">Snapshots</p>
      </div>
      <div>
        <p className="px-2 text-xs font-semibold text-[#545b64]">Network & Security</p>
        {item("keys", "Key pairs", true)}
        <p className="px-6 py-1 text-[#545b64]">Security Groups</p>
      </div>
      <div>
        <p className="px-2 text-xs font-semibold text-[#545b64]">Lab</p>
        {item("s3", "S3 buckets", true)}
        {item("shell", "VMware shell", true)}
        {item("billing", "Billing", true)}
      </div>
    </div>
  )
}

function FlatNav({ nav, active, locked, onNavigate, tone }: { nav: ConsoleNavItem[]; active: string; locked: boolean; onNavigate: (id: string) => void; tone: "azure" }) {
  return (
    <div className="grid">
      {nav.map((item) => (
        <NavButton key={item.id} label={item.label} tone={tone} active={active === item.id} disabled={locked} onClick={() => onNavigate(item.id)} />
      ))}
    </div>
  )
}

function DoNav({ nav, active, locked, onNavigate }: { nav: ConsoleNavItem[]; active: string; locked: boolean; onNavigate: (id: string) => void }) {
  const labels = ["Launchpad", "Projects", "Favorites", "Managed Agents", "Inference Engine", "Data & Learning"]
  return (
    <div className="grid gap-1 px-2 pb-4 text-sm">
      {nav.some((item) => item.id === "home") ? (
        <NavButton tone="do" label="Home" active={active === "home"} disabled={locked} onClick={() => onNavigate("home")} />
      ) : (
        <p className="px-2 py-1.5 text-[#d5def0]">Home</p>
      )}
      {labels.map((label) => (
        <p key={label} className="px-2 py-1.5 text-[#d5def0]">{label}</p>
      ))}
      <p className="mt-2 px-2 text-[11px] font-semibold tracking-wide text-[#8ea0c4] uppercase">Core Cloud</p>
      {nav.filter((item) => item.id !== "home").map((item) => (
        <NavButton key={item.id} tone="do" label={item.label} active={active === item.id} disabled={locked} onClick={() => onNavigate(item.id)} />
      ))}
      <p className="mt-2 px-2 py-1.5 text-[#d5def0]">Marketplace</p>
      <p className="px-2 py-1.5 text-[#d5def0]">Security</p>
      <p className="px-2 py-1.5 text-[#d5def0]">Account</p>
    </div>
  )
}

export function ResourceTile({ title, detail, onClick }: { title: string; detail: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex items-center justify-between rounded border border-[#d5dbdb] bg-white px-3 py-3 text-left hover:border-[#0073bb]">
        <span>
          <span className="block text-sm text-[#0073bb]">{title}</span>
          <span className="mt-1 block text-xs text-[#545b64]">{detail}</span>
        </span>
        <ChevronDown className="size-4 text-[#545b64]" />
      </button>
    )
  }
  return (
    <div className="flex items-center justify-between rounded border border-[#d5dbdb] bg-white px-3 py-3 text-left">
      <span>
        <span className="block text-sm text-[#0073bb]">{title}</span>
        <span className="mt-1 block text-xs text-[#545b64]">{detail}</span>
      </span>
      <ChevronDown className="size-4 text-[#545b64]" />
    </div>
  )
}

export function PortalIcon({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="grid w-20 justify-items-center gap-1 text-center text-xs text-[#0078d4] hover:underline">
      <span className="grid size-8 place-items-center rounded-sm border border-[#0078d4] text-lg">+</span>
      {label}
    </button>
  )
}
