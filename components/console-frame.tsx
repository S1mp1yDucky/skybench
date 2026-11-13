"use client"

import { useEffect, useState } from "react"
import { ChevronDown, CircleHelp, Globe, Menu, Search, X } from "lucide-react"
import { AwsWordmark, DoMark } from "@/components/brand-marks"
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
    <div className={cn("flex h-dvh flex-col overflow-hidden", theme === "aws" && "console-aws bg-[#f2f3f3] text-[#16191f]", theme === "azure" && "console-azure bg-[#faf9f8] text-[#323130]", theme === "do" && "console-do bg-[#121618] text-[#e8eeef]")}>
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
          <HeaderIcon label="CloudShell" onClick={() => go("shell")}><PromptIcon /></HeaderIcon>
          <HeaderIcon label="Notifications"><BellIcon /></HeaderIcon>
          <SupportMenu />
          <SettingsMenu />
          {region}
          <AccountMenu theme="aws" account={account} go={go} onSignOut={onSignOut} />
        </div>
      </header>
      {services ? <ServicesFlyout onClose={() => setServices(false)} go={go} nav={nav} /> : null}
      {alert ? <p role="alert" className="shrink-0 border-l-4 border-[#d13212] bg-[#fdf3f1] px-4 py-2 text-[14px]">{alert}</p> : null}
      <FlashBar theme="aws" />
      <div className="flex min-h-0 flex-1">
        <aside className={cn("z-30 w-[250px] shrink-0 overflow-auto border-r border-[#e6e6e6] bg-white py-2 md:static md:block", open ? "absolute top-12 bottom-0 left-0 block shadow-xl" : "hidden md:block")}>
          <AwsServiceNav active={current} go={go} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" className="min-h-0 flex-1 overflow-auto">{children}</main>
          <footer className="flex shrink-0 items-center gap-3 border-t border-[#e6e6e6] bg-white px-3 py-1.5 text-[12px] text-[#545b64]">
            <button type="button" onClick={() => go("shell")} className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-[#232f3e] px-2 text-white hover:bg-[#1a2533]">
              <PromptIcon />
              CloudShell
            </button>
            <span className="ml-auto inline-flex items-center gap-3">
              <span className="text-[#0073bb]">Feedback</span>
              <span>© 2026, Amazon Web Services, Inc. or its affiliates.</span>
              <span className="text-[#0073bb]">Privacy</span>
              <span className="text-[#0073bb]">Terms</span>
              <span className="text-[#0073bb]">Cookie preferences</span>
            </span>
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
      <Group title="Instances">
        <SideLink label="Instances" nested active={active === "ec2"} onClick={() => go("ec2")} />
        <SideLink label="Instance Types" nested />
        <SideLink label="Launch Templates" nested />
        <SideLink label="Spot Requests" nested />
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
        <SideLink label="Security Groups" nested />
        <SideLink label="Elastic IPs" nested />
        <SideLink label="Placement Groups" nested />
        <SideLink label="Key Pairs" nested active={active === "keys"} onClick={() => go("keys")} />
        <SideLink label="Network Interfaces" nested />
      </Group>
      <Group title="Load Balancing">
        <SideLink label="Load Balancers" nested />
        <SideLink label="Target Groups" nested />
        <SideLink label="Trust Stores" nested />
      </Group>
      <Group title="Auto Scaling">
        <SideLink label="Auto Scaling Groups" nested />
        <SideLink label="Launch Configurations" nested />
      </Group>
    </nav>
  )
}

function ServicesFlyout({ onClose, go, nav }: { onClose: () => void; go: (id: string) => void; nav: ConsoleNavItem[] }) {
  const items = [
    ["Recently visited", [["EC2", "home"], ["S3", "s3"], ["CloudShell", "shell"]]],
    ["Compute", [["EC2", "home"], ["Lightsail", ""], ["Lambda", ""], ["Batch", ""], ["Elastic Beanstalk", ""], ["EC2 Image Builder", ""]]],
    ["Storage", [["S3", "s3"], ["EFS", ""], ["FSx", ""], ["Storage Gateway", ""], ["AWS Backup", ""]]],
    ["Database", [["RDS", ""], ["DynamoDB", ""], ["ElastiCache", ""], ["Neptune", ""], ["Amazon Redshift", ""]]],
    ["Networking & Content Delivery", [["VPC", ""], ["CloudFront", ""], ["Route 53", ""], ["API Gateway", ""], ["Direct Connect", ""]]],
    ["Security, Identity, & Compliance", [["IAM", ""], ["Cognito", ""], ["Secrets Manager", ""], ["GuardDuty", ""], ["Security Hub", ""], ["WAF", ""]]],
    ["Management & Governance", [["CloudWatch", ""], ["CloudFormation", ""], ["CloudTrail", ""], ["Systems Manager", ""], ["Billing and Cost Management", "billing"], ["Service Quotas", ""]]],
    ["Developer Tools", [["CloudShell", "shell"], ["CodeCommit", ""], ["CodeBuild", ""], ["CodePipeline", ""], ["Cloud9", ""]]],
  ] as const
  return (
    <div className="absolute top-12 left-0 z-40 max-h-[70vh] w-[min(920px,calc(100vw-16px))] overflow-auto border border-[#d5dbdb] bg-white p-4 text-[#16191f] shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[16px] font-bold">All services</p>
        <button type="button" onClick={onClose} aria-label="Close services" className="grid size-7 place-items-center rounded-sm hover:bg-[#f2f3f3]"><X className="size-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([group, links]) => (
          <div key={group}>
            <p className="px-2 py-1 text-[11px] font-bold tracking-wide text-[#545b64] uppercase">{group}</p>
            {links.map(([label, id]) => (
              <button key={`${group}-${label}`} type="button" disabled={!id || !nav.some((item) => item.id === id)} onClick={() => id && go(id)} className="block w-full rounded-sm px-2 py-1 text-left text-[13px] hover:bg-[#f2f8fd] hover:text-[#0073bb] disabled:cursor-default disabled:opacity-100 disabled:hover:bg-transparent disabled:hover:text-[#16191f]">
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function PortalMenu({ label, items, children, onDark = false }: { label: string; items: string[]; children: React.ReactNode; onDark?: boolean }) {
  return (
    <details className="relative">
      <summary aria-label={label} className={cn("grid size-8 cursor-pointer list-none place-items-center rounded-sm [&::-webkit-details-marker]:hidden", onDark ? "text-white hover:bg-white/15" : "hover:bg-[#f3f2f1]")}>{children}</summary>
      <div className="absolute top-9 right-0 z-50 w-64 border border-[#edebe9] bg-white py-1 text-[13px] text-[#323130] shadow-xl">
        {items.map((item) => <p key={item} className="px-3 py-1.5 hover:bg-[#f3f2f1]">{item}</p>)}
      </div>
    </details>
  )
}

function SettingsMenu() {
  const items = ["Account", "Console settings", "Billing and Cost Management", "Security credentials"]
  return (
    <details className="relative">
      <summary aria-label="Settings" className="grid size-8 cursor-pointer list-none place-items-center rounded-sm hover:bg-white/10 [&::-webkit-details-marker]:hidden"><GearIcon /></summary>
      <div className="absolute top-9 right-0 z-50 w-64 border border-[#d5dbdb] bg-white py-1 text-[13px] text-[#16191f] shadow-2xl">
        {items.map((item) => <p key={item} className="px-3 py-1.5 hover:bg-[#f2f8fd]">{item}</p>)}
      </div>
    </details>
  )
}

function SupportMenu() {
  const items = ["Support Center", "re:Post", "Documentation", "Training", "Resource Center", "Feedback"]
  return (
    <details className="relative">
      <summary aria-label="Support" className="grid size-8 cursor-pointer list-none place-items-center rounded-sm hover:bg-white/10 [&::-webkit-details-marker]:hidden"><CircleHelp className="size-4" /></summary>
      <div className="absolute top-9 right-0 z-50 w-52 border border-[#d5dbdb] bg-white py-1 text-[13px] text-[#16191f] shadow-2xl">
        {items.map((item) => <p key={item} className="px-3 py-1.5 hover:bg-[#f2f8fd]">{item}</p>)}
      </div>
    </details>
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
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState<{ title: string; body: string }[]>([])
  useEffect(() => {
    const onNote = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; body: string }>).detail
      if (!detail?.title) return
      setNotes((current) => [detail, ...current])
      setNotesOpen(true)
    }
    window.addEventListener("skybench-note", onNote)
    return () => window.removeEventListener("skybench-note", onNote)
  }, [])
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 bg-[#0078d4] px-2 text-white">
        <button type="button" className="grid size-8 place-items-center rounded-sm hover:bg-white/15" aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <MicrosoftMark />
        <span className="text-[16px] font-semibold"><span className="hidden sm:inline">Microsoft </span>Azure</span>
        <label className="relative mx-3 hidden min-w-0 flex-1 md:block">
          <span className="sr-only">Search resources, services, and docs</span>
          <Search className="pointer-events-none absolute top-2 left-3 size-4 text-[#605e5c]" />
          <input readOnly placeholder="Search resources, services, and docs (G+/)" className="h-8 w-full max-w-[560px] rounded-sm border-0 bg-white pr-3 pl-9 text-[13px] text-[#323130] outline-none placeholder:text-[#605e5c]" />
        </label>
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" className="mr-2 hidden h-8 items-center gap-1.5 rounded-sm bg-white px-2.5 text-[13px] font-semibold text-[#0078d4] hover:bg-[#f3f2f1] md:inline-flex" aria-label="Copilot">
            <SparkIcon />
            Copilot
          </button>
          <HeaderIcon label="Cloud Shell" onClick={() => go("shell")}><PromptIcon /></HeaderIcon>
          <HeaderIcon label="Notifications" onClick={() => setNotesOpen((value) => !value)}><BellIcon /></HeaderIcon>
          <PortalMenu onDark label="Settings" items={["Appearance", "Language + region", "My permissions", "Default subscription"]}>
            <GearIcon />
          </PortalMenu>
          <PortalMenu onDark label="Support + troubleshooting" items={["Help + support", "New support request", "Service Health", "Privacy"]}>
            <CircleHelp className="size-4" />
          </PortalMenu>
          <AccountMenu theme="azure" account={account} go={go} onSignOut={onSignOut} />
        </div>
      </header>
      {alert ? <p role="alert" className="shrink-0 border-l-4 border-[#a4262c] bg-[#fdf6f6] px-4 py-2 text-[14px]">{alert}</p> : null}
      <FlashBar theme="azure" />
      {notesOpen ? (
        <aside className="absolute top-12 right-0 z-40 h-[calc(100%-3rem)] w-80 overflow-auto border-l border-[#edebe9] bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold">Notifications</h2><button type="button" aria-label="Close notifications" onClick={() => setNotesOpen(false)}>×</button></div>
          {notes.length === 0 ? <p className="mt-4 text-[13px] text-[#605e5c]">No new notifications</p> : notes.map((note) => (
            <p key={`${note.title}-${note.body}`} className="mt-3 border border-[#edebe9] px-3 py-2 text-[13px]"><span className="block font-semibold">{note.title}</span>{note.body}</p>
          ))}
        </aside>
      ) : null}
      <div className="flex min-h-0 flex-1">
        {active === "create" ? null : (
          <aside className={cn("z-30 w-[248px] shrink-0 overflow-auto border-r border-[#edebe9] bg-white py-2 md:static md:block", open ? "absolute top-12 bottom-0 left-0 block shadow-xl" : "hidden md:block")}>
            {active === "vms" ? <ComputeMenu go={go} /> : <AzureMenu active={active} go={go} />}
          </aside>
        )}
        <main id="main" className="min-h-0 min-w-0 flex-1 overflow-auto bg-white">{children}</main>
      </div>
    </>
  )
}

function ComputeMenu({ go }: { go: (id: string) => void }) {
  const items = ["Virtual machines", "Virtual Machine Scale Set (VMSS)", "Compute Fleet", "Arc Machines", "Container instances", "Disks + images", "Capacity + placement", "Related services", "Monitoring + Operations", "Help"]
  return (
    <nav aria-label="Compute infrastructure" className="px-2 text-[13px]">
      <label className="relative mb-2 block px-1">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute top-2 left-3 size-4 text-[#605e5c]" />
        <input readOnly placeholder="Search" className="h-8 w-full rounded-sm border border-[#8a8886] bg-white pr-2 pl-8 text-[13px]" />
      </label>
      <button type="button" onClick={() => go("portal")} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-[#f3f2f1]"><HomeGlyph /> Overview</button>
      <button type="button" onClick={() => go("more")} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-[#f3f2f1]"><GridGlyph /> All resources</button>
      <p className="px-2 pt-3 pb-1 text-[12px] font-semibold">Infrastructure</p>
      {items.map((item) => (
        <button key={item} type="button" onClick={() => item === "Virtual machines" && go("vms")} className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-[#f3f2f1]", item === "Virtual machines" && "bg-[#f3f2f1] font-semibold")}>
          <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-[#605e5c]" aria-hidden><path fill="currentColor" d="M6 3.2 11.2 8 6 12.8z" /></svg>
          <span className="truncate">{item}</span>
        </button>
      ))}
    </nav>
  )
}

function AzureMenu({ active, go }: { active: string; go: (id: string) => void }) {
  const favorites = [
    ["All resources", "more"],
    ["Resource groups", "groups"],
    ["App Services", "appservice"],
    ["Function App", "functions"],
    ["Azure SQL Database", "sql"],
    ["Azure Cosmos DB", "cosmos"],
    ["Virtual machines", "vms"],
    ["Load balancer", "vnet"],
    ["Storage accounts", "storage"],
    ["Virtual network", "vnet"],
    ["Microsoft Entra ID", "entra"],
    ["Monitor", "monitor"],
    ["Advisor", "monitor"],
    ["Microsoft Defender for Cloud", "more"],
    ["Cost Management + Billing", "billing"],
    ["Help + support", "more"],
  ] as const
  return (
    <nav aria-label="Portal menu" className="text-[13px]">
      <button type="button" onClick={() => go("create")} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f3f2f1]", active === "create" && "bg-[#f3f2f1] font-semibold")}>
        <span className="grid size-5 place-items-center text-[#0078d4]"><PlusIcon /></span>
        Create a resource
      </button>
      <button type="button" onClick={() => go("portal")} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f3f2f1]", active === "portal" && "bg-[#f3f2f1] font-semibold")}>
        <HomeGlyph /> Home
      </button>
      <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f3f2f1]"><DashGlyph /> Dashboard</button>
      <button type="button" onClick={() => go("more")} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f3f2f1]", active === "more" && "bg-[#f3f2f1] font-semibold")}><GridGlyph /> All services</button>
      <p className="flex items-center gap-2 px-3 pt-4 pb-1 text-[11px] font-semibold tracking-[0.08em] text-[#605e5c]"><span aria-hidden>★</span> FAVORITES</p>
      {favorites.map(([label, id]) => (
        <button key={label} type="button" onClick={() => go(id)} className={cn("flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-[#f3f2f1]", active === id && "bg-[#f3f2f1] font-semibold")}>
          <FavoriteGlyph label={label} />
          <span className="truncate">{label}</span>
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
  const [createOpen, setCreateOpen] = useState(false)
  const [sections, setSections] = useState({ projects: true, cloud: true, account: false })
  const dropletActive = active === "droplets" || active === "create"
  function toggle(key: "projects" | "cloud" | "account") {
    setSections((current) => ({ ...current, [key]: !current[key] }))
  }
  return (
    <div className="flex min-h-0 flex-1 bg-[#121618] text-[#e8eeef]">
      <aside className={cn("z-30 w-[228px] shrink-0 overflow-auto border-r border-[#23282c] bg-[#121618] md:static md:block", open ? "absolute inset-y-0 left-0 block" : "hidden md:block")}>
        <div className="flex items-center px-4 py-3">
          <DoMark className="size-7" />
        </div>
        <nav aria-label="Control panel" className="px-2 pb-8 text-[13px]">
          <DoNav label="Home" active={active === "home"} onClick={() => go("home")} />
          <DoNav label="Launchpad" onClick={() => go("project")} />
          <DoGroup label="PROJECTS" open={sections.projects} onToggle={() => toggle("projects")}>
            <DoNav label="New Project" nested onClick={() => go("new-project")} />
            <DoNav label="first-project" nested active={active === "project"} onClick={() => go("project")} />
          </DoGroup>
          <DoGroup label="FAVORITES" open>
            <p className="px-3 py-1 text-[12px] text-[#8b969c]">Star your favorite</p>
          </DoGroup>
          <DoGroup label="MANAGED AGENTS" />
          <DoGroup label="INFERENCE ENGINE" />
          <DoGroup label="DATA & LEARNING" />
          <DoGroup label="CORE CLOUD" open={sections.cloud} onToggle={() => toggle("cloud")}>
            <DoNav label="Droplets" nested active={dropletActive} onClick={() => go("droplets")} />
            <DoNav label="GPU Droplets" nested />
            <DoNav label="MicroVMs" nested badge="NEW" />
            <DoNav label="Kubernetes" nested />
            <DoNav label="App Platform" nested />
            <DoNav label="Functions" nested />
            <DoNav label="Networking" nested />
            <DoNav label="Volumes Block Storage" nested />
            <DoNav label="Backups & Snapshots" nested />
            <DoNav label="Container Registry" nested />
            <DoNav label="Spaces Object Storage" nested active={active === "spaces"} onClick={() => go("spaces")} />
            <DoNav label="Network File Storage" nested />
          </DoGroup>
          <DoNav label="MARKETPLACE" />
          <DoNav label="Security" badge="NEW" />
          <DoGroup label="ACCOUNT" open={sections.account} onToggle={() => toggle("account")}>
            <DoNav label="Billing" nested active={active === "billing"} onClick={() => go("billing")} />
            <DoNav label="Settings" nested active={active === "keys"} onClick={() => go("keys")} />
            <DoNav label="API" nested />
            <DoNav label="Support" nested />
          </DoGroup>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#23282c] bg-[#121618] px-3">
          <button type="button" className="grid size-8 place-items-center rounded-md md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <label className="relative hidden min-w-0 flex-1 md:block">
            <span className="sr-only">Search resources, pages, or public IP</span>
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[#8b969c]" />
            <input readOnly placeholder="Search resources, pages, or public IP (Ctrl+K)" className="h-9 w-full max-w-xl rounded-full border border-[#3a4248] bg-[#121618] pr-3 pl-9 text-[13px] outline-none placeholder:text-[#8b969c]" />
          </label>
          <div className="relative ml-auto flex items-center gap-2">
            <button type="button" aria-expanded={createOpen} onClick={() => setCreateOpen((value) => !value)} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#7ebac2] px-3 text-[13px] font-semibold text-[#102226]">
              Create <ChevronDown className="size-3.5" />
            </button>
            {createOpen ? (
              <div className="absolute top-10 left-0 z-50 w-56 rounded-lg border border-[#2c3438] bg-[#1b2124] py-2 text-[13px] shadow-xl">
                <p className="px-3 py-1 text-[11px] font-semibold tracking-wide text-[#8b969c]">CORE CLOUD</p>
                <CreateRow dark onClick={() => { setCreateOpen(false); go("create") }}>Droplet</CreateRow>
                <CreateRow dark onClick={() => { setCreateOpen(false); go("new-project") }}>Project</CreateRow>
                <CreateRow dark onClick={() => { setCreateOpen(false); go("spaces") }}>Spaces</CreateRow>
                <CreateRow dark>Kubernetes</CreateRow>
                <CreateRow dark>App Platform</CreateRow>
              </div>
            ) : null}
            <span className="hidden size-8 place-items-center rounded-full border border-[#3a4248] text-[#c5cdd0] sm:grid" aria-hidden><BellIcon /></span>
            <span className="hidden items-center rounded-full border border-[#3a4248] px-2.5 py-1 text-[12px] text-[#c5cdd0] lg:inline-flex">Signup Credit: <span className="ml-1 font-semibold text-[#e8eeef]">$5.00</span></span>
            <AccountMenu theme="do" account={account} go={go} onSignOut={onSignOut} />
            <span className="hidden h-8 items-center rounded-full border border-[#7ebac2] px-3 text-[13px] text-[#7ebac2] xl:inline-flex">AI Assistant</span>
          </div>
        </header>
        {alert ? <p role="alert" className="border-l-4 border-[#f0a8a4] bg-[#3a2224] px-4 py-2 text-[14px] text-[#f7d4d1]">{alert}</p> : null}
        <FlashBar theme="do" />
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
      <summary className={cn("flex cursor-pointer list-none items-center gap-2 rounded-full px-1.5 py-1 [&::-webkit-details-marker]:hidden", theme === "do" ? "hover:bg-white/5" : "hover:bg-white/10")} aria-label="Account">
        {theme === "azure" ? (
          <span className="hidden text-right leading-tight sm:block">
            <span className="block max-w-[180px] truncate text-[12px]">{account}</span>
            <span className="block text-[10px] tracking-wide">DEFAULT DIRECTORY</span>
          </span>
        ) : null}
        <span className={cn("grid size-7 place-items-center rounded-full text-[11px] font-semibold", theme === "aws" && "bg-[#ff9900] text-[#232f3e]", theme === "azure" && "bg-white/25 text-white", theme === "do" && "bg-gradient-to-br from-[#d946ef] to-[#818cf8] text-white")}>{theme === "aws" ? letter : initials}</span>
        {theme === "aws" ? <span className="hidden max-w-[120px] truncate text-[13px] sm:inline">Talal</span> : null}
        {theme === "do" ? <span className="hidden text-[13px] sm:inline">My Team</span> : null}
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
        <div className="absolute top-10 right-0 z-50 w-[260px] rounded-lg border border-[#2c3438] bg-[#1b2124] py-2 text-[13px] text-[#e8eeef] shadow-xl">
          <div className="px-3 py-2">
            <p className="font-semibold">My Team</p>
            <p className="truncate text-[12px] text-[#8b969c]">{account}</p>
          </div>
          <MenuRow dark onClick={() => go("keys")}>Settings</MenuRow>
          <MenuRow dark onClick={() => go("billing")}>Billing</MenuRow>
          {onSignOut ? <MenuRow dark onClick={onSignOut}>Sign out</MenuRow> : null}
        </div>
      ) : null}
    </details>
  )
}

function CreateRow({ children, onClick, dark = false }: { children: React.ReactNode; onClick?: () => void; dark?: boolean }) {
  return <button type="button" onClick={onClick} className={cn("block w-full px-3 py-1.5 text-left", dark ? "hover:bg-white/5" : "hover:bg-[#f4f7fb]")}>{children}</button>
}

function MenuRow({ children, onClick, dark = false }: { children: React.ReactNode; onClick?: () => void; dark?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("block w-full px-4 py-1.5 text-left", dark ? "hover:bg-white/5" : "hover:bg-[#f2f3f3]")}>
      {children}
    </button>
  )
}

function DoGroup({ label, open = false, onToggle, children }: { label: string; open?: boolean; onToggle?: () => void; children?: React.ReactNode }) {
  return (
    <div className="mt-2">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-[#8b969c]">
        {label}
        <ChevronDown className={cn("size-3 transition", open && "rotate-180")} />
      </button>
      {open ? children : null}
    </div>
  )
}

function DoNav({ label, active, nested, badge, onClick }: { label: string; active?: boolean; nested?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-md py-1.5 text-left text-[13px] text-[#d5dcde] hover:bg-white/5", nested ? "pr-2 pl-3" : "px-2", active && "bg-[#243033] font-medium text-white")}>
      <span className="truncate">{label}</span>
      {badge ? <span className="rounded bg-[#1d4ed8] px-1 text-[9px] font-semibold text-white">{badge}</span> : null}
    </button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-1 text-[12px] font-bold text-[#545b64] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-3" />
      </summary>
      {children}
    </details>
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

function AwsLogo() {
  return <AwsWordmark className="h-7 w-12" />
}

function FlashBar({ theme }: { theme: "aws" | "azure" | "do" }) {
  const [item, setItem] = useState<{ message: string; tone: "success" | "error" } | null>(null)
  useEffect(() => {
    const onFlash = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: "success" | "error" }>).detail
      if (detail?.message) setItem(detail)
    }
    window.addEventListener("skybench-flash", onFlash)
    return () => window.removeEventListener("skybench-flash", onFlash)
  }, [])
  useEffect(() => {
    if (!item) return
    const timer = window.setTimeout(() => setItem(null), 6000)
    return () => window.clearTimeout(timer)
  }, [item])
  if (!item) return null
  const success = item.tone === "success"
  const box = theme === "azure"
    ? success ? "border-[#107c10] bg-[#dff6dd] text-[#0e700e]" : "border-[#a4262c] bg-[#fde7e9] text-[#a4262c]"
    : theme === "do"
      ? success ? "border-[#7ebac2] bg-[#173033] text-[#e8eeef]" : "border-[#f0a8a4] bg-[#3a2224] text-[#f7d4d1]"
      : success ? "border-[#1d8102] bg-[#f2fcf3] text-[#16191f]" : "border-[#d13212] bg-[#fdf3f1] text-[#16191f]"
  return (
    <div role="status" className={cn("flex shrink-0 items-center gap-2 border-l-8 px-3 py-2 text-[14px]", box)}>
      <span className="min-w-0 flex-1">{item.message}</span>
      <button type="button" aria-label="Dismiss" onClick={() => setItem(null)} className="px-1">×</button>
    </div>
  )
}

function PromptIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path d="M3 4.5h10M3 8h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 11.5h3.2l1.6-1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BellIcon({ dark = false }: { dark?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path d="M8 2.2a3.6 3.6 0 0 0-3.6 3.6v2.2L3 10.2h10l-1.4-2.2V5.8A3.6 3.6 0 0 0 8 2.2Z" fill="none" stroke={dark ? "#323130" : "currentColor"} strokeWidth="1.3" />
      <path d="M6.7 11.4a1.3 1.3 0 0 0 2.6 0" fill="none" stroke={dark ? "#323130" : "currentColor"} strokeWidth="1.3" />
    </svg>
  )
}

function GearIcon({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#323130" : "currentColor"
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <circle cx="8" cy="8" r="2" fill="none" stroke={color} strokeWidth="1.3" />
      <path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path fill="currentColor" d="M8 1.2 9.2 6 14 7.2 9.2 8.4 8 13.2 6.8 8.4 2 7.2 6.8 6Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <circle cx="8" cy="8" r="6" fill="none" stroke="#0078d4" strokeWidth="1.3" />
      <path d="M8 5v6M5 8h6" stroke="#0078d4" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
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

function FavoriteGlyph({ label }: { label: string }) {
  if (label === "Virtual machines") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.3"><rect x="2" y="3" width="12" height="8" rx="1" /><path d="M6 13h4M8 11v2" /></svg>
  if (label === "App Service") return <svg viewBox="0 0 16 16" className="size-4"><rect x="2" y="2" width="12" height="12" rx="2" fill="#0078d4" /><path d="M5 9.2c1.2-2 4.8-2 6 0" fill="none" stroke="#fff" strokeWidth="1.2" /></svg>
  if (label === "Function App") return <svg viewBox="0 0 16 16" className="size-4"><rect x="2" y="2" width="12" height="12" rx="2" fill="#f2c811" /><path d="M9 3.2 6.2 8H9l-1 4.8L11.6 7H9l.8-3.8Z" fill="#323130" /></svg>
  if (label === "Resource groups") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.3"><path d="M2 5h5l1 1.4H14V12H2z" /></svg>
  if (label === "Storage accounts") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#107c10" strokeWidth="1.3"><ellipse cx="8" cy="4.5" rx="4" ry="1.5" /><path d="M4 4.5v7c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5v-7" /></svg>
  if (label === "Virtual networks") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.3"><circle cx="4" cy="8" r="1.4" /><circle cx="12" cy="4" r="1.4" /><circle cx="12" cy="12" r="1.4" /><path d="M5.3 7.3 10.6 4.7M5.3 8.7l5.3 2.6" /></svg>
  if (label === "Microsoft Entra ID") return <svg viewBox="0 0 16 16" className="size-4"><path fill="#0078d4" d="M8 1.5 13.5 5 8 14.5 2.5 5Z" /></svg>
  if (label === "Monitor") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.3"><path d="M2 12.5 5.2 8l2.2 2.2L12 4" /><path d="M9.5 4H12v2.5" /></svg>
  if (label === "Cost Management + Billing") return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.3"><path d="M3 12V7M7 12V4M11 12V6" /><path d="M2 13h12" /></svg>
  if (label === "All resources") return <svg viewBox="0 0 16 16" className="size-4" fill="#0078d4"><rect x="2" y="2" width="5" height="5" /><rect x="9" y="2" width="5" height="5" /><rect x="2" y="9" width="5" height="5" /><rect x="9" y="9" width="5" height="5" /></svg>
  return <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#0078d4" strokeWidth="1.3"><path d="M3 12V6l5-3 5 3v6" /><path d="M6.5 12v-3h3v3" /></svg>
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
