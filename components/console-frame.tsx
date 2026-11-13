"use client"

import { useState } from "react"
import { Bell, ChevronDown, CircleHelp, Globe, Menu, Search, Settings, TerminalSquare, X } from "lucide-react"
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
  onSignOut,
  nav,
  active,
  onNavigate,
  locked,
  alert,
  children,
}: {
  theme: "aws" | "azure" | "do"
  product: string
  account: string
  region?: React.ReactNode
  onSignOut?: () => void
  nav: ConsoleNavItem[]
  active: string
  onNavigate: (id: string) => void
  locked: boolean
  alert?: string | null
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [services, setServices] = useState(false)

  function go(id: string) {
    if (locked || !nav.some((item) => item.id === id)) return
    onNavigate(id)
    setOpen(false)
    setServices(false)
  }

  return (
    <div className={cn("flex h-dvh flex-col overflow-hidden font-[family-name:var(--font-console)] text-[13px]", theme === "aws" && "bg-[#f2f3f3] text-[#16191f]", theme === "azure" && "bg-[#faf9f8] text-[#323130]", theme === "do" && "bg-[#f4f7fb] text-[#031b4e]")}>
      {theme === "aws" ? (
        <AwsChrome account={account} region={region} nav={nav} active={active} open={open} setOpen={setOpen} services={services} setServices={setServices} go={go} onSignOut={onSignOut} alert={alert}>
          {children}
        </AwsChrome>
      ) : null}
      {theme === "azure" ? (
        <AzureChrome account={account} active={active} open={open} setOpen={setOpen} go={go} onSignOut={onSignOut} alert={alert}>
          {children}
        </AzureChrome>
      ) : null}
      {theme === "do" ? (
        <DoChrome account={account} active={active} open={open} setOpen={setOpen} go={go} onSignOut={onSignOut} alert={alert}>
          {children}
        </DoChrome>
      ) : null}
    </div>
  )
}

function AwsChrome({
  account,
  region,
  nav,
  active,
  open,
  setOpen,
  services,
  setServices,
  go,
  onSignOut,
  alert,
  children,
}: {
  account: string
  region?: React.ReactNode
  nav: ConsoleNavItem[]
  active: string
  open: boolean
  setOpen: (value: boolean | ((value: boolean) => boolean)) => void
  services: boolean
  setServices: (value: boolean | ((value: boolean) => boolean)) => void
  go: (id: string) => void
  onSignOut?: () => void
  alert?: string | null
  children: React.ReactNode
}) {
  const current = active === "launch" ? "ec2" : active
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-1 bg-[#232f3e] px-2 text-[13px] text-white">
        <button type="button" className="flex h-8 items-center gap-1.5 rounded-sm px-2 hover:bg-white/10 md:hidden" aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}>
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
        <button type="button" className="hidden h-8 items-center gap-1.5 rounded-sm px-2 hover:bg-white/10 md:flex" onClick={() => setServices((value) => !value)} aria-expanded={services}>
          <Menu className="size-4" />
          Services
        </button>
        <AwsLogo />
        <label className="relative mx-2 hidden min-w-0 flex-1 md:block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1.5 left-2 size-4 text-[#d5dbdb]" />
          <input readOnly placeholder="Search for services, features, blogs, docs, and more" className="h-8 w-full rounded-sm border border-[#607080] bg-[#35475a] pr-16 pl-8 text-[13px] text-white outline-none placeholder:text-[#c6d0d8]" />
          <kbd className="pointer-events-none absolute top-1.5 right-2 rounded-sm border border-[#8d9eae] px-1 text-[10px] text-[#d5dbdb]">Alt+S</kbd>
        </label>
        <div className="ml-auto flex items-center">
          <HeaderIcon label="CloudShell" onClick={() => go("shell")}><TerminalSquare className="size-4" /></HeaderIcon>
          <HeaderIcon label="Notifications"><Bell className="size-4" /></HeaderIcon>
          <HeaderIcon label="Help"><CircleHelp className="size-4" /></HeaderIcon>
          <HeaderIcon label="Settings"><Settings className="size-4" /></HeaderIcon>
          {region}
          <AccountMenu theme="aws" account={account} go={go} onSignOut={onSignOut} />
        </div>
      </header>
      {services ? <ServicesFlyout onClose={() => setServices(false)} go={go} nav={nav} /> : null}
      {alert ? <p role="alert" className="shrink-0 border-l-4 border-[#d13212] bg-[#fdf3f1] px-4 py-2 text-[13px]">{alert}</p> : null}
      <div className="flex min-h-0 flex-1">
        <aside className={cn("z-30 w-[250px] shrink-0 overflow-auto border-r border-[#e6e6e6] bg-white py-2 md:static md:block", open ? "absolute top-12 bottom-0 left-0 block shadow-xl" : "hidden md:block")}>
          <AwsServiceNav active={current} go={go} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" className="min-h-0 flex-1 overflow-auto">{children}</main>
          <footer className="shrink-0 border-t border-[#e6e6e6] bg-white px-4 py-2 text-[11px] text-[#545b64]">
            © 2026, Amazon Web Services, Inc. or its affiliates. <span className="text-[#0073bb]">Privacy</span> · <span className="text-[#0073bb]">Terms</span> · <span className="text-[#0073bb]">Cookie preferences</span>
          </footer>
        </div>
      </div>
    </>
  )
}

function AwsServiceNav({ active, go }: { active: string; go: (id: string) => void }) {
  return (
    <nav aria-label="EC2" className="text-[14px]">
      <SideLink label="EC2 Dashboard" active={active === "home"} onClick={() => go("home")} />
      <SideLink label="EC2 Global View" />
      <SideLink label="Events" />
      <Group title="Instances">
        <SideLink label="Instances" nested active={active === "ec2"} onClick={() => go("ec2")} />
        <SideLink label="Instance types" nested />
        <SideLink label="Launch templates" nested />
        <SideLink label="Spot requests" nested />
        <SideLink label="Savings Plans" nested />
        <SideLink label="Reserved Instances" nested />
        <SideLink label="Dedicated Hosts" nested />
        <SideLink label="Capacity Reservations" nested />
      </Group>
      <Group title="Images">
        <SideLink label="AMIs" nested />
        <SideLink label="AMI Catalog" nested />
      </Group>
      <Group title="Elastic Block Store">
        <SideLink label="Volumes" nested />
        <SideLink label="Snapshots" nested />
        <SideLink label="Lifecycle Manager" nested />
      </Group>
      <Group title="Network & Security">
        <SideLink label="Security groups" nested />
        <SideLink label="Elastic IPs" nested />
        <SideLink label="Placement groups" nested />
        <SideLink label="Key Pairs" nested active={active === "keys"} onClick={() => go("keys")} />
        <SideLink label="Network interfaces" nested />
      </Group>
      <Group title="Load Balancing">
        <SideLink label="Load balancers" nested />
        <SideLink label="Target groups" nested />
      </Group>
      <Group title="Auto Scaling">
        <SideLink label="Auto Scaling groups" nested />
        <SideLink label="Launch configurations" nested />
      </Group>
    </nav>
  )
}

function ServicesFlyout({ onClose, go, nav }: { onClose: () => void; go: (id: string) => void; nav: ConsoleNavItem[] }) {
  const items = [
    ["Recently visited", [["EC2", "home"], ["S3", "s3"]]],
    ["Compute", [["EC2", "home"]]],
    ["Storage", [["S3", "s3"]]],
    ["Management & Governance", [["Billing and Cost Management", "billing"]]],
    ["Developer tools", [["CloudShell", "shell"]]],
  ] as const
  return (
    <div className="absolute top-12 left-0 z-40 max-h-[70vh] w-[320px] overflow-auto border border-[#d5dbdb] bg-white p-3 text-[#16191f] shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">All services</p>
        <button type="button" onClick={onClose} aria-label="Close services" className="grid size-7 place-items-center rounded-sm hover:bg-[#f2f3f3]"><X className="size-4" /></button>
      </div>
      {items.map(([group, links]) => (
        <div key={group} className="mb-3">
          <p className="px-2 py-1 text-[11px] font-bold tracking-wide text-[#545b64] uppercase">{group}</p>
          {links.map(([label, id]) => (
            <button key={label} type="button" disabled={!nav.some((item) => item.id === id)} onClick={() => go(id)} className="block w-full rounded-sm px-2 py-1.5 text-left text-[13px] hover:bg-[#f2f8fd] hover:text-[#0073bb] disabled:opacity-40">
              {label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

function AzureChrome({
  account,
  active,
  open,
  setOpen,
  go,
  onSignOut,
  alert,
  children,
}: {
  account: string
  active: string
  open: boolean
  setOpen: (value: boolean | ((value: boolean) => boolean)) => void
  go: (id: string) => void
  onSignOut?: () => void
  alert?: string | null
  children: React.ReactNode
}) {
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#e1dfdd] bg-white px-2 text-[#323130]">
        <button type="button" className="grid size-8 place-items-center rounded-sm hover:bg-[#f3f2f1]" aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <MicrosoftMark />
        <span className="hidden text-[16px] font-semibold sm:inline">Microsoft Azure</span>
        <label className="relative mx-2 hidden min-w-0 flex-1 md:block">
          <span className="sr-only">Search resources, services, and docs</span>
          <Search className="pointer-events-none absolute top-2 left-3 size-4 text-[#605e5c]" />
          <input readOnly placeholder="Search resources, services, and docs (G+/)" className="h-8 w-full max-w-[560px] rounded-sm border border-[#8a8886] bg-white pr-3 pl-9 text-[13px] outline-none placeholder:text-[#605e5c] focus:border-[#0078d4]" />
        </label>
        <div className="ml-auto flex items-center gap-0.5">
          <HeaderIcon label="Cloud Shell" dark={false} onClick={() => go("shell")}><span className="font-mono text-[13px]">&gt;_</span></HeaderIcon>
          <HeaderIcon label="Notifications" dark={false}><Bell className="size-4" /></HeaderIcon>
          <HeaderIcon label="Settings" dark={false}><Settings className="size-4" /></HeaderIcon>
          <HeaderIcon label="Help" dark={false}><CircleHelp className="size-4" /></HeaderIcon>
          <AccountMenu theme="azure" account={account} go={go} onSignOut={onSignOut} />
        </div>
      </header>
      {alert ? <p role="alert" className="shrink-0 border-l-4 border-[#a4262c] bg-[#fdf6f6] px-4 py-2 text-[13px]">{alert}</p> : null}
      <div className="flex min-h-0 flex-1">
        <aside className={cn("z-30 w-[260px] shrink-0 overflow-auto border-r border-[#edebe9] bg-white py-2 md:static", open ? "absolute top-12 bottom-0 left-0 block shadow-xl" : "hidden")}>
          <AzureMenu active={active} go={go} />
        </aside>
        <main id="main" className="min-h-0 min-w-0 flex-1 overflow-auto bg-white">{children}</main>
      </div>
    </>
  )
}

function AzureMenu({ active, go }: { active: string; go: (id: string) => void }) {
  const favorites = [
    ["Virtual machines", "vms"],
    ["Resource groups", "groups"],
    ["Storage accounts", ""],
    ["Virtual networks", ""],
    ["Cost Management", "billing"],
  ] as const
  return (
    <nav aria-label="Portal menu" className="text-[13px]">
      <button type="button" onClick={() => go("create")} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#f3f2f1]">
        <span className="grid size-5 place-items-center rounded-sm bg-[#0078d4] text-sm text-white">+</span>
        Create a resource
      </button>
      <button type="button" onClick={() => go("portal")} className={cn("flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#f3f2f1]", active === "portal" && "bg-[#f3f2f1] font-semibold")}>
        <HomeGlyph /> Home
      </button>
      <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#f3f2f1]"><DashGlyph /> Dashboard</button>
      <button type="button" className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#f3f2f1]"><GridGlyph /> All services</button>
      <p className="px-4 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-[#605e5c]">FAVORITES</p>
      {favorites.map(([label, id]) => (
        <button key={label} type="button" onClick={() => id && go(id)} className={cn("flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#f3f2f1]", id && active === id && "bg-[#f3f2f1] font-semibold")}>
          <FavoriteGlyph label={label} />
          {label}
        </button>
      ))}
    </nav>
  )
}

function DoChrome({
  account,
  active,
  open,
  setOpen,
  go,
  onSignOut,
  alert,
  children,
}: {
  account: string
  active: string
  open: boolean
  setOpen: (value: boolean | ((value: boolean) => boolean)) => void
  go: (id: string) => void
  onSignOut?: () => void
  alert?: string | null
  children: React.ReactNode
}) {
  const dropletActive = active === "droplets" || active === "create"
  return (
    <div className="flex min-h-0 flex-1">
      <aside className={cn("z-30 w-[240px] shrink-0 overflow-auto bg-[#031b4e] text-white md:static md:flex md:flex-col", open ? "absolute inset-y-0 left-0 flex flex-col" : "hidden md:flex")}>
        <div className="flex items-center gap-2 px-4 py-4">
          <DoLogo />
        </div>
        <nav aria-label="Control panel" className="px-2 pb-6 text-[13px]">
          <DoItem label="Home" icon="home" active={active === "home"} onClick={() => go("home")} />
          <DoItem label="Projects" icon="folder" />
          <p className="mt-4 px-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-[#8ea0c8]">CORE CLOUD</p>
          <DoItem label="Droplets" icon="drop" active={dropletActive} onClick={() => go("droplets")} />
          <DoItem label="GPU Droplets" icon="drop" />
          <DoItem label="Kubernetes" icon="k8s" />
          <DoItem label="App Platform" icon="app" />
          <DoItem label="Databases" icon="db" />
          <DoItem label="Spaces Object Storage" icon="box" active={active === "spaces"} onClick={() => go("spaces")} />
          <DoItem label="Volumes" icon="box" />
          <DoItem label="Networking" icon="net" />
          <p className="mt-4 px-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-[#8ea0c8]">MANAGE</p>
          <DoItem label="Billing" icon="card" active={active === "billing"} onClick={() => go("billing")} />
          <DoItem label="Settings" icon="gear" active={active === "keys"} onClick={() => go("keys")} />
          <DoItem label="API" icon="code" />
          <DoItem label="Support" icon="help" />
          <DoItem label="Marketplace" icon="bag" />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-[#f4f7fb]">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e5eaf2] bg-white px-3">
          <button type="button" className="grid size-8 place-items-center rounded-sm text-[#031b4e] md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <label className="relative hidden min-w-0 flex-1 sm:block">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute top-2 left-3 size-4 text-[#7b879c]" />
            <input readOnly placeholder="Search resources, pages, or public IP (Ctrl+K)" className="h-9 w-full max-w-lg rounded-md border border-[#d5deea] bg-[#f7f9fc] pr-3 pl-9 text-[13px] outline-none placeholder:text-[#7b879c]" />
          </label>
          <button type="button" onClick={() => go("create")} className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-[#0069ff] px-3 text-[13px] font-medium text-white hover:bg-[#0058d6]">
            Create <ChevronDown className="size-3.5" />
          </button>
          <span className="hidden text-[13px] font-medium sm:inline">My Team</span>
          <AccountMenu theme="do" account={account} go={go} onSignOut={onSignOut} />
        </header>
        {alert ? <p role="alert" className="border-l-4 border-[#d92d20] bg-[#fff4f2] px-4 py-2 text-[13px]">{alert}</p> : null}
        <main id="main" className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

function AccountMenu({
  theme,
  account,
  go,
  onSignOut,
}: {
  theme: "aws" | "azure" | "do"
  account: string
  go: (id: string) => void
  onSignOut?: () => void
}) {
  const letter = (account.replace(/[^a-zA-Z]/g, "").slice(0, 1) || "T").toUpperCase()
  const initials = account.toLowerCase().startsWith("033") || account.includes("talal") ? "TM" : letter
  return (
    <details className="relative">
      <summary className={cn("flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-1 [&::-webkit-details-marker]:hidden", theme === "aws" ? "hover:bg-white/10" : "hover:bg-black/5")} aria-label="Account">
        <span className={cn("grid size-7 place-items-center rounded-full text-[11px] font-semibold", theme === "aws" && "bg-[#ff9900] text-[#232f3e]", theme === "azure" && "bg-[#0078d4] text-white", theme === "do" && "bg-[#0069ff] text-white")}>{theme === "aws" ? letter : initials}</span>
        {theme === "aws" ? <span className="hidden max-w-[120px] truncate text-[13px] sm:inline">Talal</span> : null}
        {theme !== "azure" ? <ChevronDown className="size-3 opacity-80" /> : null}
      </summary>
      {theme === "aws" ? (
        <div className="absolute top-10 right-0 z-50 w-[280px] border border-[#d5dbdb] bg-white py-2 text-[13px] text-[#16191f] shadow-2xl">
          <div className="px-4 py-2">
            <p className="font-bold">Talal</p>
            <p className="text-[#545b64]">Account ID: <span className="font-mono text-[#16191f]">4382-0230-2102</span></p>
          </div>
          <MenuRow>Account</MenuRow>
          <MenuRow>Organization</MenuRow>
          <MenuRow>Service Quotas</MenuRow>
          <MenuRow onClick={() => go("billing")}>Billing and Cost Management</MenuRow>
          <MenuRow>Security credentials</MenuRow>
          {onSignOut ? <MenuRow onClick={onSignOut}>Sign out</MenuRow> : null}
        </div>
      ) : null}
      {theme === "azure" ? (
        <div className="absolute top-10 right-0 z-50 w-[320px] border border-[#edebe9] bg-white p-4 text-[13px] text-[#323130] shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#0078d4] text-[14px] font-semibold text-white">{initials}</span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">Talal Majid</p>
              <p className="truncate text-[12px] text-[#605e5c]">{account}</p>
            </div>
          </div>
          {onSignOut ? <button type="button" onClick={onSignOut} className="mt-4 block text-left text-[13px] text-[#323130] hover:underline">Sign out</button> : null}
          <div className="mt-4 border-t border-[#edebe9] pt-3">
            <p className="text-[12px] text-[#605e5c]">Directory</p>
            <p className="mt-1 font-semibold">Default Directory</p>
            <button type="button" className="mt-2 text-[13px] text-[#0078d4] hover:underline">Switch directory</button>
          </div>
        </div>
      ) : null}
      {theme === "do" ? (
        <div className="absolute top-10 right-0 z-50 w-[260px] rounded-md border border-[#e1e7f0] bg-white py-2 text-[13px] text-[#031b4e] shadow-xl">
          <div className="px-3 py-2">
            <p className="font-semibold">Talal Majid</p>
            <p className="truncate text-[12px] text-[#5b6785]">{account}</p>
          </div>
          <MenuRow onClick={() => go("keys")}>Settings</MenuRow>
          <MenuRow onClick={() => go("billing")}>Billing</MenuRow>
          <MenuRow>API</MenuRow>
          {onSignOut ? <MenuRow onClick={onSignOut}>Sign out</MenuRow> : null}
        </div>
      ) : null}
    </details>
  )
}

function MenuRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full px-4 py-1.5 text-left hover:bg-[#f2f3f3]">
      {children}
    </button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="px-4 py-1 text-[12px] font-bold text-[#545b64]">{title}</p>
      {children}
    </div>
  )
}

function SideLink({ label, active, nested, onClick }: { label: string; active?: boolean; nested?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("block w-full py-1.5 text-left text-[14px] hover:bg-[#fafafa]", nested ? "pr-3 pl-8" : "px-4", active ? "bg-[#f2f3f3] font-bold" : "text-[#16191f]")}>
      {label}
    </button>
  )
}

function HeaderIcon({ label, children, dark = true, onClick }: { label: string; children: React.ReactNode; dark?: boolean; onClick?: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cn("grid size-8 place-items-center rounded-sm", dark ? "hover:bg-white/10" : "hover:bg-[#f3f2f1]")}>
      {children}
    </button>
  )
}

function DoItem({ label, active, onClick }: { label: string; icon: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-white/90 hover:bg-white/10", active && "bg-white/15 font-semibold text-white")}>
      <DoGlyph name={label} />
      <span className="truncate">{label}</span>
    </button>
  )
}

function DoGlyph({ name }: { name: string }) {
  const common = "size-4 shrink-0"
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (name === "Home") return <svg viewBox="0 0 16 16" className={common} {...stroke}><path d="M2.5 7.2 8 2.8l5.5 4.4V13a1 1 0 0 1-1 1h-3.2V9.2H6.7V14H3.5a1 1 0 0 1-1-1V7.2Z" /></svg>
  if (name === "Projects") return <svg viewBox="0 0 16 16" className={common} {...stroke}><path d="M2 4.5h4l1.2 1.5H14V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z" /></svg>
  if (name === "Droplets" || name === "GPU Droplets") return <svg viewBox="0 0 16 16" className={common} fill="currentColor"><path d="M8 1.6c2.6 3.2 4.2 5.3 4.2 7.6A4.2 4.2 0 1 1 3.8 9.2C3.8 6.9 5.4 4.8 8 1.6Z" /></svg>
  if (name === "Kubernetes") return <svg viewBox="0 0 16 16" className={common} {...stroke}><circle cx="8" cy="8" r="2" /><path d="M8 2.5v2.2M8 11.3v2.2M2.5 8h2.2M11.3 8h2.2M4.1 4.1l1.6 1.6M10.3 10.3l1.6 1.6M11.9 4.1 10.3 5.7M5.7 10.3 4.1 11.9" /></svg>
  if (name === "App Platform") return <svg viewBox="0 0 16 16" className={common} {...stroke}><rect x="2.5" y="3" width="11" height="8" rx="1" /><path d="M6 13.5h4" /></svg>
  if (name === "Databases") return <svg viewBox="0 0 16 16" className={common} {...stroke}><ellipse cx="8" cy="4" rx="4.5" ry="1.8" /><path d="M3.5 4v8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8V4" /></svg>
  if (name === "Spaces Object Storage") return <svg viewBox="0 0 16 16" className={common} {...stroke}><path d="M3 5.5 8 3l5 2.5v6L8 14l-5-2.5v-6Z" /><path d="M3 5.5 8 8l5-2.5M8 8v6" /></svg>
  if (name === "Volumes") return <svg viewBox="0 0 16 16" className={common} {...stroke}><rect x="2.5" y="4" width="11" height="8" rx="1.2" /><path d="M5 4V3M8 4V3M11 4V3" /></svg>
  if (name === "Networking") return <svg viewBox="0 0 16 16" className={common} {...stroke}><circle cx="4" cy="8" r="1.6" /><circle cx="12" cy="4.5" r="1.6" /><circle cx="12" cy="11.5" r="1.6" /><path d="M5.5 7.4 10.4 5.2M5.5 8.6l4.9 2.2" /></svg>
  if (name === "Billing") return <svg viewBox="0 0 16 16" className={common} {...stroke}><rect x="2" y="3.5" width="12" height="9" rx="1.2" /><path d="M2 6.5h12" /></svg>
  if (name === "Settings") return <svg viewBox="0 0 16 16" className={common} {...stroke}><circle cx="8" cy="8" r="2" /><path d="M8 2.4v1.6M8 12v1.6M2.4 8h1.6M12 8h1.6M4 4l1.1 1.1M10.9 10.9 12 12M12 4l-1.1 1.1M5.1 10.9 4 12" /></svg>
  if (name === "API") return <svg viewBox="0 0 16 16" className={common} {...stroke}><path d="M6 5 3 8l3 3M10 5l3 3-3 3" /></svg>
  if (name === "Support") return <svg viewBox="0 0 16 16" className={common} {...stroke}><circle cx="8" cy="8" r="5.2" /><path d="M8 7.2V11M8 5.2h.01" /></svg>
  return <svg viewBox="0 0 16 16" className={common} {...stroke}><path d="M3 5h10v7H3zM6 5V3.8h4V5" /></svg>
}

function AwsLogo() {
  return (
    <span className="px-1" aria-label="Amazon Web Services">
      <svg viewBox="0 0 86 42" className="h-8 w-[72px]" aria-hidden>
        <text x="6" y="26" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontSize="26" fontWeight="700">aws</text>
        <path d="M24 31c12 8 30 8 42 0" fill="none" stroke="#ff9900" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 28.2 69 33.4l-7.4 1.1z" fill="#ff9900" />
      </svg>
    </span>
  )
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="size-5 shrink-0" aria-hidden>
      <rect width="9" height="9" fill="#f25022" />
      <rect x="12" width="9" height="9" fill="#7fba00" />
      <rect y="12" width="9" height="9" fill="#00a4ef" />
      <rect x="12" y="12" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function DoLogo() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <svg viewBox="0 0 28 28" className="size-6" aria-hidden>
        <circle cx="14" cy="14" r="14" fill="#0069ff" />
        <path d="M8.2 16.4c1.6-5.2 3.8-8 5.8-8s4.2 2.8 5.8 8c-1.6 1.8-3.6 2.7-5.8 2.7s-4.2-.9-5.8-2.7Z" fill="white" />
      </svg>
      DigitalOcean
    </span>
  )
}

function FavoriteGlyph({ label }: { label: string }) {
  const color = label === "Storage accounts" ? "#107c10" : label === "Cost Management" ? "#0078d4" : "#0078d4"
  if (label === "Virtual machines") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke={color} strokeWidth="1.3"><rect x="2" y="3" width="12" height="8" rx="1" /><path d="M6 13h4M8 11v2" /></svg>
  if (label === "Resource groups") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke={color} strokeWidth="1.3"><path d="M2 5h5l1 1.4H14V12H2z" /></svg>
  if (label === "Storage accounts") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#107c10" strokeWidth="1.3"><ellipse cx="8" cy="4.5" rx="4" ry="1.5" /><path d="M4 4.5v7c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5v-7" /></svg>
  if (label === "Virtual networks") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke={color} strokeWidth="1.3"><circle cx="4" cy="8" r="1.4" /><circle cx="12" cy="4" r="1.4" /><circle cx="12" cy="12" r="1.4" /><path d="M5.3 7.3 10.6 4.7M5.3 8.7l5.3 2.6" /></svg>
  return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke={color} strokeWidth="1.3"><path d="M3 12V6l5-3 5 3v6" /><path d="M6.5 12v-3h3v3" /></svg>
}

function HomeGlyph() {
  return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.4"><path d="M2 7.2 8 2.5l6 4.7V13H9.5V9h-3v4H2V7.2Z" /></svg>
}
function DashGlyph() {
  return <svg viewBox="0 0 16 16" className="size-4" fill="#0078d4"><rect x="1" y="1" width="6" height="6" /><rect x="9" y="1" width="6" height="6" /><rect x="1" y="9" width="6" height="6" /><rect x="9" y="9" width="6" height="6" /></svg>
}
function GridGlyph() {
  return <svg viewBox="0 0 16 16" className="size-4" fill="#0078d4"><rect x="1" y="1" width="3" height="3" /><rect x="6.5" y="1" width="3" height="3" /><rect x="12" y="1" width="3" height="3" /><rect x="1" y="6.5" width="3" height="3" /><rect x="6.5" y="6.5" width="3" height="3" /><rect x="12" y="6.5" width="3" height="3" /><rect x="1" y="12" width="3" height="3" /><rect x="6.5" y="12" width="3" height="3" /><rect x="12" y="12" width="3" height="3" /></svg>
}

export function AwsRegionMenu({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}) {
  const current = options.find((item) => item.id === value)
  const short = current?.label.replace(` ${value}`, "") ?? value
  return (
    <details className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-sm px-2 text-[13px] hover:bg-white/10 [&::-webkit-details-marker]:hidden">
        <Globe className="size-4" />
        <span className="hidden max-w-[190px] truncate lg:inline">{short}</span>
        <ChevronDown className="size-3" />
      </summary>
      <div className="absolute top-9 right-0 z-50 w-80 border border-[#d5dbdb] bg-white py-1 text-[#16191f] shadow-2xl">
        <p className="px-3 py-1 text-[11px] font-bold text-[#545b64]">Select a Region</p>
        {options.map((option) => (
          <button key={option.id} type="button" onClick={() => onChange(option.id)} className={cn("flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-[#f2f8fd]", option.id === value && "bg-[#f2f8fd] font-semibold")}>
            <span>{option.label.replace(` ${option.id}`, "")}</span>
            <span className="font-mono text-[11px] text-[#545b64]">{option.id}</span>
          </button>
        ))}
      </div>
    </details>
  )
}
