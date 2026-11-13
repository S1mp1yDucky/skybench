"use client"

import { useState } from "react"
import { Bell, ChevronDown, CircleHelp, Menu, Search, Settings, X } from "lucide-react"
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
    <div className={cn("flex min-h-0 flex-1 flex-col font-[family-name:var(--font-console)]", theme === "do" ? "bg-[#f3f5f9] text-[#031b4e]" : "bg-white text-[#16191f]")}>
      {theme === "aws" ? (
        <header className="flex h-12 items-center gap-2 bg-[#232f3e] px-2 text-white sm:px-3">
          <MenuButton open={open} onClick={() => setOpen((value) => !value)} light />
          <AwsMark />
          <div className="ml-auto flex min-w-0 items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <IconButton label="Search"><Search className="size-4" /></IconButton>
            <IconButton label="Notifications"><Bell className="size-4" /></IconButton>
            <IconButton label="Settings"><Settings className="size-4" /></IconButton>
            {region}
            <AccountChip account={account} />
            <StepsMenu done={done} steps={steps} dark />
          </div>
        </header>
      ) : null}
      {theme === "azure" ? (
        <header className="flex h-12 items-center gap-2 bg-[#0078d4] px-2 text-white sm:gap-3 sm:px-3">
          <MenuButton open={open} onClick={() => setOpen((value) => !value)} light />
          <span className="hidden shrink-0 text-[15px] font-semibold sm:inline">Microsoft Azure</span>
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search resources, services, and docs</span>
            <Search className="pointer-events-none absolute top-2 left-3 size-4 text-[#616161]" />
            <input
              readOnly
              placeholder="Search resources, services, and docs (G+/)"
              className="h-8 w-full rounded-sm bg-white pr-3 pl-9 text-sm text-[#242424] outline-none placeholder:text-[#616161]"
            />
          </label>
          <IconButton label="Notifications"><Bell className="size-4" /></IconButton>
          <IconButton label="Settings"><Settings className="size-4" /></IconButton>
          <IconButton label="Help"><CircleHelp className="size-4" /></IconButton>
          <span className="hidden text-right leading-tight sm:block">
            <span className="block max-w-[220px] truncate text-xs">{account}</span>
            <span className="block text-[10px] tracking-wide uppercase">Default Directory</span>
          </span>
          <StepsMenu done={done} steps={steps} dark />
        </header>
      ) : null}
      {theme === "do" ? (
        <div className="flex min-h-0 flex-1">
          <aside className={cn("z-30 w-56 shrink-0 bg-[#031b4e] text-white md:static md:flex md:flex-col", open ? "absolute inset-y-0 left-0 flex" : "hidden md:flex")}>
            <div className="flex items-center gap-2 px-4 py-4">
              <DoMark />
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
              <Button type="button" className="ml-auto h-8 rounded-full bg-[#0069ff] px-4 text-sm text-white hover:bg-[#0056d6]" onClick={() => go("create")} disabled={locked}>
                Create
              </Button>
              <span className="hidden items-center gap-1 rounded-full border border-[#d5dbe7] px-2 py-1 text-xs sm:inline-flex">
                <span className="size-2 rounded-full bg-[#2fbf71]" />
                Signup Credit: $5.00
              </span>
              <span className="hidden text-sm font-medium sm:inline">My Team</span>
              <AccountChip account={account} tone="do" />
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
      <summary className={cn("grid size-8 cursor-pointer list-none place-items-center rounded-full", dark ? "hover:bg-white/10" : "hover:bg-[#f3f7ff]")} aria-label={`Assignment steps, ${done} of 7`}>
        <CircleHelp className="size-4" />
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
        <p className="px-2 text-[15px] font-semibold">EC2</p>
        {item("home", "Dashboard")}
        <p className="px-2 py-1.5 text-[#0073bb]">AWS Global View</p>
        <p className="px-2 py-1.5 text-[#16191f]">Events</p>
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
        <p className="px-6 py-1 text-[#545b64]">Lifecycle Manager</p>
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

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} className="grid size-8 place-items-center rounded-full hover:bg-white/10">
      {children}
    </button>
  )
}

function AccountChip({ account, tone = "aws" }: { account: string; tone?: "aws" | "do" }) {
  const letter = (account.replace(/[^a-zA-Z]/g, "").slice(0, 1) || "T").toUpperCase()
  return (
    <span className="flex max-w-[180px] items-center gap-2 text-xs">
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold", tone === "do" ? "bg-[#0069ff] text-white" : "bg-[#ff9900] text-[#232f3e]")}>{letter}</span>
      <span className="hidden truncate sm:inline">{account}</span>
    </span>
  )
}

function AwsMark() {
  return (
    <span className="flex items-end gap-1 pr-2" aria-label="Amazon Web Services">
      <svg viewBox="0 0 72 32" className="h-7 w-14" aria-hidden>
        <text x="4" y="20" fill="white" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="700">aws</text>
        <path d="M18 24c8 5 22 5 32 0" fill="none" stroke="#ff9900" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M48 22l4 3-5 1" fill="#ff9900" />
      </svg>
    </span>
  )
}

function DoMark() {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#0069ff" />
        <path d="M8 18c2-6 6-9 8-9s6 3 8 9c-2 2-5 3-8 3s-6-1-8-3z" fill="white" />
      </svg>
      DigitalOcean
    </span>
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
