"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AccountForm, SignInCard } from "@/components/account-form"
import { BrandGlyph } from "@/components/brand-marks"
import { BillingPanel } from "@/components/billing-panel"
import { ConsoleFrame } from "@/components/console-frame"
import { ConnectDialog, downloadPem } from "@/components/connect-dialog"
import { StateBadge } from "@/components/state-badge"
import { Terminal } from "@/components/terminal"
import { useNow } from "@/components/use-now"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DO_IMAGES, DO_REGIONS, DO_SIZES, STUDENT } from "@/lib/catalog"
import { usd } from "@/lib/format"
import { isMetering, platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Vm } from "@/lib/types"

const BLUE = "inline-flex h-9 items-center justify-center rounded-md bg-[#0069ff] px-4 text-[14px] font-medium text-white hover:bg-[#0058d6] disabled:opacity-50"

const DISKS: Record<string, string> = {
  "s-1vcpu-512mb-10gb": "10 GB",
  "s-1vcpu-1gb": "25 GB",
  "s-1vcpu-2gb": "50 GB",
}
const TRANSFER: Record<string, string> = {
  "s-1vcpu-512mb-10gb": "500 GiB",
  "s-1vcpu-1gb": "1,000 GiB",
  "s-1vcpu-2gb": "2,000 GiB",
}

export function DoConsole() {
  const lab = useLabState()
  const ocean = lab.do
  const [view, setView] = useState("home")
  const [connectId, setConnectId] = useState<string | null>(null)
  const [destroyId, setDestroyId] = useState<string | null>(null)
  const stage = !ocean.reviewedSite ? "study" : !ocean.accountCreated ? "signup" : !ocean.signedIn ? "signin" : view
  const metering = ocean.droplets.some((vm) => isMetering(vm))
  const now = useNow(stage === "billing" || metering || stage === "home" || stage === "study")
  const spend = now == null ? 0 : platformCost(lab, "do", now)
  const alert =
    now != null && spend > ocean.budgetUsd
      ? `Your budget of ${usd(ocean.budgetUsd)} has been exceeded. Month-to-date cost is ${usd(spend)}.`
      : null
  const connectVm = ocean.droplets.find((vm) => vm.id === connectId) ?? null
  const destroyVm = ocean.droplets.find((vm) => vm.id === destroyId) ?? null

  if (stage === "signup") {
    return <AccountForm accent="do" emailDefault={STUDENT.email} onCreate={({ email }) => dispatch({ type: "do/signup", email })} />
  }
  if (stage === "signin") {
    return <SignInCard accent="do" email={ocean.email} onSignIn={() => dispatch({ type: "do/signin" })} />
  }

  return (
    <ConsoleFrame
      theme="do"
      product="DigitalOcean"
      account={ocean.email || STUDENT.email}
      onSignOut={ocean.signedIn ? () => dispatch({ type: "do/signout" }) : undefined}
      nav={[
        { id: "home", label: "Home" },
        { id: "droplets", label: "Droplets" },
        { id: "create", label: "Create Droplet" },
        { id: "keys", label: "Settings" },
        { id: "spaces", label: "Spaces Object Storage" },
        { id: "shell", label: "Console" },
        { id: "billing", label: "Billing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!ocean.reviewedSite || !ocean.accountCreated || !ocean.signedIn}
      alert={alert}
    >
      {stage === "study" && !ocean.reviewedSite ? (
        <DoWelcome onCreate={() => undefined} continueLabel="Sign up" onContinue={() => dispatch({ type: "do/review" })} />
      ) : null}
      {stage === "home" ? <DoWelcome onCreate={() => setView("create")} droplets={ocean.droplets} onOpen={() => setView("droplets")} /> : null}
      {stage === "droplets" ? (
        <DropletList
          droplets={ocean.droplets}
          onCreate={() => setView("create")}
          onConnect={setConnectId}
          onPower={(id, on) => tell(dispatch(on ? { type: "do/start", id } : { type: "do/stop", id }))}
          onDestroy={setDestroyId}
        />
      ) : null}
      {stage === "create" ? <CreateDroplet onDone={() => setView("droplets")} /> : null}
      {stage === "keys" ? <Keys /> : null}
      {stage === "spaces" ? <Spaces /> : null}
      {stage === "shell" ? (
        <div className="grid gap-3 p-6">
          <h1 className="text-[20px] font-semibold text-[#031b4e]">Console</h1>
          <Terminal platform="do" />
        </div>
      ) : null}
      {stage === "billing" ? (
        <div className="p-6">
          <BillingPanel
            title="Billing"
            note="Droplets are billed until they are destroyed, including while they are powered off."
            budget={ocean.budgetUsd}
            vms={ocean.droplets}
            now={now}
            fastForward={{ type: "do/fast-forward" }}
            onBudget={(amount) => ({ type: "do/budget", amount })}
          />
        </div>
      ) : null}
      <ConnectDialog platform="do" vm={connectVm} open={connectVm != null} onOpenChange={(open) => !open && setConnectId(null)} />
      <Dialog open={destroyVm != null} onOpenChange={(open) => !open && setDestroyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destroy {destroyVm?.name}?</DialogTitle>
            <DialogDescription>Destroy is the only action that stops DigitalOcean billing. Power off leaves the Droplet on the invoice.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDestroyId(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => { if (!destroyVm) return; tell(dispatch({ type: "do/destroy", id: destroyVm.id })); setDestroyId(null) }}>Destroy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsoleFrame>
  )
}

function tell(outcome: { error?: string; message?: string }) {
  if (outcome.error) toast.error(outcome.error)
  else if (outcome.message) toast.success(outcome.message)
}

function DoWelcome({
  onCreate,
  onOpen,
  droplets = [],
  continueLabel,
  onContinue,
}: {
  onCreate: () => void
  onOpen?: () => void
  droplets?: Vm[]
  continueLabel?: string
  onContinue?: () => void
}) {
  const now = useNow(true)
  const today = now == null ? "\u00a0" : new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Karachi" }).format(now)
  const visible = droplets.filter((vm) => vm.state !== "terminated")
  return (
    <div className="grid gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-[#5b6785]">{today}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-[#031b4e]">Welcome, Talal</h1>
          <p className="mt-1 text-[13px] text-[#5b6785]">My Team</p>
        </div>
        {continueLabel && onContinue ? <button type="button" className={BLUE} onClick={onContinue}>{continueLabel}</button> : null}
      </div>
      <div>
        <h2 className="text-[16px] font-semibold">Start building</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["Droplets", "Linux virtual machines", onCreate],
            ["Kubernetes", "Managed clusters", undefined],
            ["App Platform", "Deploy from a repo", undefined],
            ["Databases", "Managed Postgres and MySQL", undefined],
          ] as [string, string, (() => void) | undefined][]).map(([title, detail, action]) => (
            <button key={title} type="button" onClick={action} className="rounded-md border border-[#e1e7f0] bg-white p-4 text-left hover:border-[#0069ff]">
              <p className="font-semibold text-[#031b4e]">{title}</p>
              <p className="mt-1 text-[13px] text-[#5b6785]">{detail}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-[#e1e7f0] bg-white">
        <div className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3">
          <h2 className="font-semibold">Droplets</h2>
          {onOpen ? <button type="button" onClick={onOpen} className="text-[13px] text-[#0069ff]">View all</button> : null}
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-[13px] text-[#5b6785]">You don’t have any Droplets yet.</p>
        ) : (
          <ul>
            {visible.slice(0, 4).map((vm) => (
              <li key={vm.id} className="flex items-center justify-between border-t border-[#eef2f7] px-4 py-3 text-[13px]">
                <span className="font-medium">{vm.name}</span>
                <StateBadge state={vm.state} provider="do" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DropletList({
  droplets,
  onCreate,
  onConnect,
  onPower,
  onDestroy,
}: {
  droplets: Vm[]
  onCreate: () => void
  onConnect: (id: string) => void
  onPower: (id: string, on: boolean) => void
  onDestroy: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [menu, setMenu] = useState<string | null>(null)
  const visible = droplets.filter((vm) => vm.state !== "terminated" && vm.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold text-[#031b4e]">Droplets</h1>
        <button type="button" className={BLUE} onClick={onCreate}>Create Droplet</button>
      </div>
      <div className="mt-4 rounded-md border border-[#e1e7f0] bg-white">
        <div className="border-b border-[#eef2f7] px-3 py-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Droplet name" className="h-8 w-full max-w-xs rounded-md border border-[#d5deea] px-2 text-[13px] outline-none" />
        </div>
        {visible.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-[16px] font-semibold text-[#031b4e]">You don’t have any Droplets.</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-[#5b6785]">Create a Droplet to get a Linux virtual machine. Add an SSH key, pick a region, an image, and a plan.</p>
            <button type="button" className={cn(BLUE, "mt-4")} onClick={onCreate}>Create Droplet</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="text-[#5b6785]">
                <tr className="border-b border-[#eef2f7]">
                  {["Name", "IP Address", "Created", "Tags", ""].map((heading) => <th key={heading || "m"} className="px-4 py-2 font-medium">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {visible.map((vm) => (
                  <tr key={vm.id} className="border-b border-[#eef2f7] last:border-0">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium text-[#0069ff]">
                        <StateBadge state={vm.state} provider="do" />
                        <span className="text-[#031b4e]">{vm.name}</span>
                      </p>
                      <p className="mt-1 text-[12px] text-[#5b6785]">{vm.imageLabel} · {vm.sizeLabel} · {regionCity(vm.region)}</p>
                      {vm.state === "stopped" ? <p className="mt-1 text-[12px] text-[#b54708]">Powered off. This Droplet is still billed until you destroy it.</p> : null}
                    </td>
                    <td className="px-4 py-3 font-mono">{vm.publicIp ?? "Assigning…"}</td>
                    <td className="px-4 py-3 text-[#5b6785]">{vm.region}</td>
                    <td className="px-4 py-3 text-[#5b6785]">—</td>
                    <td className="relative px-4 py-3 text-right">
                      <button type="button" className="rounded-md border border-[#d5deea] px-2 py-1" onClick={() => setMenu(menu === vm.id ? null : vm.id)} aria-expanded={menu === vm.id}>More</button>
                      {menu === vm.id ? (
                        <div className="absolute right-4 z-10 mt-1 w-40 rounded-md border border-[#e1e7f0] bg-white py-1 text-left shadow-lg">
                          <MenuButton disabled={vm.state !== "running"} onClick={() => { setMenu(null); onConnect(vm.id) }}>Web console</MenuButton>
                          <MenuButton disabled={vm.state !== "running"} onClick={() => { setMenu(null); onPower(vm.id, false) }}>Power off</MenuButton>
                          <MenuButton disabled={vm.state !== "stopped"} onClick={() => { setMenu(null); onPower(vm.id, true) }}>Power on</MenuButton>
                          <MenuButton onClick={() => { setMenu(null); onDestroy(vm.id) }}>Destroy</MenuButton>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MenuButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f4f7fb] disabled:text-[#b0b8c6]">{children}</button>
}

function CreateDroplet({ onDone }: { onDone: () => void }) {
  const ocean = useLabState().do
  const [name, setName] = useState("ubuntu-s-1vcpu-1gb-blr1")
  const [region, setRegion] = useState(ocean.region)
  const [imageId, setImageId] = useState("ubuntu-26-04-x64")
  const [sizeId, setSizeId] = useState(DO_SIZES[1].id)
  const [keyName, setKeyName] = useState(ocean.keys[0]?.name ?? "MyKeyPair")
  const [auth, setAuth] = useState<"ssh" | "password">("ssh")
  const [error, setError] = useState<string | null>(null)
  const size = DO_SIZES.find((item) => item.id === sizeId)
  const monthly = size ? Math.round(size.hourlyUsd * 730) : 0

  return (
    <form
      className="p-6 pb-28"
      onSubmit={(event) => {
        event.preventDefault()
        const outcome = dispatch({ type: "do/launch", name, imageId, sizeId, keyName, region })
        if (outcome.error) setError(outcome.error)
        else {
          toast.success(outcome.message ?? "Creating Droplet.")
          onDone()
        }
      }}
    >
      <h1 className="text-[28px] font-semibold text-[#031b4e]">Create Droplets</h1>

      <Section title="Choose Region">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DO_REGIONS.map((item) => (
            <button key={item.id} type="button" onClick={() => setRegion(item.id)} className={cn("rounded-md border bg-white px-3 py-3 text-left", region === item.id ? "border-[#0069ff] ring-1 ring-[#0069ff]" : "border-[#d5deea] hover:border-[#0069ff]")}>
              <span className="block text-[14px] font-semibold text-[#031b4e]">{regionCity(item.id)}</span>
              <span className="mt-1 block font-mono text-[12px] text-[#5b6785]">{item.id.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[#5b6785]">VPC network: default-{region}</p>
      </Section>

      <Section title="Choose an image">
        <div className="flex gap-5 border-b border-[#e1e7f0] text-[13px]">
          {["OS", "Solutions", "Agents", "Custom images"].map((tab, index) => (
            <span key={tab} className={cn("pb-2", index === 0 ? "border-b-2 border-[#0069ff] font-semibold text-[#0069ff]" : "text-[#5b6785]")}>{tab}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DISTROS.map((distro) => {
            const selected = distro.ids.includes(imageId)
            return (
              <button key={distro.name} type="button" onClick={() => setImageId(distro.ids[0])} className={cn("grid h-[84px] w-[112px] content-center justify-items-center gap-1.5 rounded-md border bg-white text-[13px]", selected ? "border-[#0069ff] ring-1 ring-[#0069ff]" : "border-[#d5deea] hover:border-[#0069ff]")}>
                <BrandGlyph name={distro.glyph} className={cn("size-7", distro.color)} />
                <span className="font-medium text-[#031b4e]">{distro.name}</span>
              </button>
            )
          })}
        </div>
        <label className="grid max-w-sm gap-1 text-[13px] font-medium">
          Version
          <select aria-label="Version" value={imageId} onChange={(event) => setImageId(event.target.value)} className="h-9 rounded-md border border-[#d5deea] bg-white px-2 font-normal">
            {(DISTROS.find((distro) => distro.ids.includes(imageId)) ?? DISTROS[0]).ids.map((id) => (
              <option key={id} value={id}>{DO_IMAGES.find((image) => image.id === id)?.label ?? id}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Choose a Droplet Plan">
        <div className="flex flex-wrap gap-2 text-[13px]">
          <span className="rounded-full bg-[#e8f1ff] px-3 py-1 font-semibold text-[#0069ff]">Shared CPU</span>
          <span className="rounded-full bg-white px-3 py-1 text-[#5b6785] ring-1 ring-[#d5deea]">Dedicated CPU</span>
        </div>
        <p className="text-[13px] font-semibold text-[#031b4e]">Basic</p>
        <div className="flex gap-4 text-[13px]">
          <span className="border-b-2 border-[#0069ff] pb-1 font-semibold text-[#0069ff]">Regular</span>
          <span className="pb-1 text-[#5b6785]">Premium Intel</span>
          <span className="pb-1 text-[#5b6785]">Premium AMD</span>
        </div>
        <div className="overflow-x-auto rounded-md border border-[#e1e7f0] bg-white">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead className="text-[#5b6785]">
              <tr>{["", "Memory", "vCPU", "SSD", "Transfer", "$/mo"].map((heading) => <th key={heading || "r"} className="px-3 py-2 font-medium">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {DO_SIZES.map((item) => (
                <tr key={item.id} className={cn("cursor-pointer border-t border-[#eef2f7]", sizeId === item.id && "bg-[#f3f8ff]")} onClick={() => setSizeId(item.id)}>
                  <td className="px-3 py-3"><input type="radio" name="size" checked={sizeId === item.id} onChange={() => setSizeId(item.id)} aria-label={item.label} /></td>
                  <td className="px-3 py-3 font-medium">{item.ram.replace("MiB", "MB").replace("GiB", "GB")}</td>
                  <td className="px-3 py-3">{item.vcpu} vCPU</td>
                  <td className="px-3 py-3">{DISKS[item.id] ?? "25 GB"}</td>
                  <td className="px-3 py-3">{TRANSFER[item.id] ?? "1,000 GiB"}</td>
                  <td className="px-3 py-3">${Math.round(item.hourlyUsd * 730)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Choose Authentication Method">
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setAuth("ssh")} className={cn("rounded-md border bg-white p-3 text-left", auth === "ssh" ? "border-[#0069ff] ring-1 ring-[#0069ff]" : "border-[#d5deea]")}>
            <span className="block font-semibold">SSH Key</span>
          </button>
          <button type="button" onClick={() => setAuth("password")} className={cn("rounded-md border bg-white p-3 text-left", auth === "password" ? "border-[#0069ff] ring-1 ring-[#0069ff]" : "border-[#d5deea]")}>
            <span className="block font-semibold">Password</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="SSH key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-9 max-w-xs rounded-md" />
          <button type="button" className="h-9 rounded-md border border-[#d5deea] bg-white px-3 text-[13px]" onClick={() => {
            const outcome = dispatch({ type: "do/key", name: keyName })
            if (outcome.error) setError(outcome.error)
            else { setError(null); toast.success(outcome.message ?? "Key added.") }
          }}>New SSH Key</button>
        </div>
        {ocean.keys.length === 0 ? <p className="text-[13px] text-[#b54708]">No SSH keys on the account. Add one before you create the Droplet.</p> : (
          <ul className="grid gap-1 text-[13px]">
            {ocean.keys.map((key) => (
              <li key={key.name} className="flex items-center gap-2"><input type="checkbox" checked={key.name === keyName} readOnly /> {key.name} <span className="font-mono text-[11px] text-[#5b6785]">{key.fingerprint}</span></li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="We recommend these options">
        <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" defaultChecked /> <span><span className="font-medium">Monitoring</span><span className="block text-[#5b6785]">Improved metrics and monitoring</span></span></label>
        <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" /> <span><span className="font-medium">Backups</span><span className="block text-[#5b6785]">Automated backups</span></span></label>
      </Section>

      <Section title="Finalize Details">
        <label className="grid max-w-sm gap-1 text-[13px] font-medium">Quantity
          <input value="1 Droplet" readOnly className="h-9 rounded-md border border-[#d5deea] bg-[#f7f9fc] px-2 font-normal" />
        </label>
        <label className="grid max-w-sm gap-1 text-[13px] font-medium" htmlFor="do-name">Hostname
          <Input id="do-name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 rounded-md font-normal" />
        </label>
        <p className="text-[13px] text-[#5b6785]">Project: My Team</p>
      </Section>

      {error ? <p role="alert" className="mt-4 text-[13px] text-[#d92d20]">{error}</p> : null}

      <div className="fixed right-0 bottom-0 left-0 z-20 flex items-center justify-end gap-4 border-t border-[#e1e7f0] bg-white px-6 py-3 md:left-[240px]">
        <div className="text-right">
          <p className="text-[18px] font-semibold text-[#031b4e]">${monthly.toFixed(2)}/mo</p>
          <p className="text-[12px] text-[#5b6785]">${size ? size.hourlyUsd.toFixed(4) : "0.0000"}/hour</p>
        </div>
        <button type="submit" className={BLUE}>Create Droplet</button>
      </div>
    </form>
  )
}

function Keys() {
  const keys = useLabState().do.keys
  const [name, setName] = useState("web")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="p-6">
      <h1 className="text-[24px] font-semibold text-[#031b4e]">Settings</h1>
      <div className="mt-4 flex gap-4 border-b border-[#e1e7f0] text-[13px]">
        <span className="border-b-2 border-[#0069ff] pb-2 font-semibold text-[#0069ff]">Security</span>
        <span className="pb-2 text-[#5b6785]">Team</span>
        <span className="pb-2 text-[#5b6785]">Profile</span>
      </div>
      <h2 className="mt-4 text-[16px] font-semibold">SSH keys</h2>
      <p className="mt-1 max-w-xl text-[13px] text-[#5b6785]">Add an SSH public key to connect to Droplets as root.</p>
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault()
        const outcome = dispatch({ type: "do/key", name })
        if (outcome.error) setError(outcome.error)
        else { setError(null); toast.success(outcome.message ?? "Key added.") }
      }}>
        <label className="grid gap-1 text-[13px]" htmlFor="key-name">Key name
          <Input id="key-name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-56 rounded-md" />
        </label>
        <button type="submit" className={BLUE}>Add SSH Key</button>
      </form>
      {error ? <p role="alert" className="mt-2 text-[13px] text-[#d92d20]">{error}</p> : null}
      <div className="mt-4 overflow-hidden rounded-md border border-[#e1e7f0] bg-white">
        {keys.length === 0 ? <p className="px-4 py-8 text-[13px] text-[#5b6785]">No SSH keys.</p> : (
          <table className="w-full text-left text-[13px]">
            <thead className="text-[#5b6785]"><tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Fingerprint</th><th /></tr></thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.name} className="border-t border-[#eef2f7]">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{key.fingerprint}</td>
                  <td className="px-4 py-3 text-right"><button type="button" className="text-[#0069ff]" onClick={() => downloadPem(key.name)}>Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Spaces() {
  const ocean = useLabState().do
  const [name, setName] = useState("talal-notes")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold text-[#031b4e]">Spaces</h1>
      </div>
      <p className="mt-1 text-[13px] text-[#5b6785]">Object storage for files and static assets.</p>
      <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault()
        const outcome = dispatch({ type: "do/space", name })
        if (outcome.error) setError(outcome.error)
        else { setError(null); toast.success(outcome.message ?? "Space created.") }
      }}>
        <label className="grid gap-1 text-[13px]" htmlFor="space-name">Space name
          <Input id="space-name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-56 rounded-md" />
        </label>
        <button type="submit" className={BLUE}>Create a Space</button>
      </form>
      {error ? <p role="alert" className="mt-2 text-[13px] text-[#d92d20]">{error}</p> : null}
      <div className="mt-4 rounded-md border border-[#e1e7f0] bg-white">
        {ocean.spaces.length === 0 ? <p className="px-4 py-10 text-center text-[13px] text-[#5b6785]">You don’t have any Spaces.</p> : (
          <ul>
            {ocean.spaces.map((space) => (
              <li key={space.name} className="flex items-center justify-between border-b border-[#eef2f7] px-4 py-3 last:border-0">
                <span className="font-medium">{space.name}</span>
                <button type="button" className="text-[13px] text-[#d92d20]" onClick={() => tell(dispatch({ type: "do/delete-space", name: space.name }))}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 grid gap-3">
      <h2 className="text-[18px] font-semibold text-[#031b4e]">{title}</h2>
      {children}
    </section>
  )
}

const DISTROS: { name: string; glyph: string; color: string; ids: string[] }[] = [
  { name: "Ubuntu", glyph: "ubuntu", color: "text-[#e95420]", ids: ["ubuntu-26-04-x64", "ubuntu-24-04-x64", "ubuntu-22-04-x64"] },
  { name: "Debian", glyph: "debian", color: "text-[#a80030]", ids: ["debian-13-x64"] },
  { name: "Fedora", glyph: "fedora", color: "text-[#51a2da]", ids: ["fedora-44-x64", "fedora-43-x64"] },
  { name: "CentOS", glyph: "centos", color: "text-[#932279]", ids: ["centos-stream-10-x64", "centos-stream-9-x64"] },
  { name: "AlmaLinux", glyph: "almalinux", color: "text-[#ff4649]", ids: ["almalinux-10-x64", "almalinux-9-x64", "almalinux-8-x64"] },
  { name: "Rocky Linux", glyph: "rockylinux", color: "text-[#10b981]", ids: ["rockylinux-10-x64", "rockylinux-9-x64", "rockylinux-8-x64"] },
]

function regionCity(id: string) {
  const map: Record<string, string> = {
    blr1: "Bangalore",
    sgp1: "Singapore",
    fra1: "Frankfurt",
    lon1: "London",
    nyc1: "New York",
    sfo3: "San Francisco",
  }
  return map[id] ?? id
}
