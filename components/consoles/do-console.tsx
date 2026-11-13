"use client"

import { useState } from "react"
import { flash } from "@/lib/flash"
import { AccountForm, SignInCard } from "@/components/account-form"
import { DoCreate, DoHome, DoNewProject, DoProject } from "@/components/consoles/do-screens"
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
import { STUDENT } from "@/lib/catalog"
import { usd } from "@/lib/format"
import { isMetering, platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Vm } from "@/lib/types"

const BLUE = "inline-flex h-8 items-center justify-center rounded-full bg-[#7ebac2] px-4 text-[14px] font-semibold text-[#102226] disabled:opacity-50"

export function DoConsole() {
  const lab = useLabState()
  const ocean = lab.do
  const [view, setView] = useState("home")
  const [detailId, setDetailId] = useState<string | null>(null)
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
        { id: "project", label: "first-project" },
        { id: "new-project", label: "New Project" },
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
        <DoHome onCreate={() => undefined} onProject={() => undefined} onBilling={() => undefined} onSignUp={() => dispatch({ type: "do/review" })} />
      ) : null}
      {stage === "home" ? <DoHome onCreate={() => setView("create")} onProject={() => setView("new-project")} onBilling={() => setView("billing")} /> : null}
      {stage === "project" ? <DoProject droplets={ocean.droplets} onCreate={() => setView("create")} /> : null}
      {stage === "new-project" ? <DoNewProject onCancel={() => setView("project")} /> : null}
      {stage === "droplets" && detailId ? <DropletDetail id={detailId} onBack={() => setDetailId(null)} onConsole={() => setView("shell")} /> : null}
      {stage === "droplets" && !detailId ? (
        <DropletList
          droplets={ocean.droplets}
          onCreate={() => setView("create")}
          onOpen={setDetailId}
          onConnect={setConnectId}
          onPower={(id, on) => tell(dispatch(on ? { type: "do/start", id } : { type: "do/stop", id }))}
          onDestroy={setDestroyId}
        />
      ) : null}
      {stage === "create" ? <DoCreate onDone={() => setView("droplets")} onBack={() => setView("droplets")} /> : null}
      {stage === "keys" ? <Keys /> : null}
      {stage === "spaces" ? <Spaces /> : null}
      {stage === "shell" ? (
        <div className="grid gap-3 bg-[#0b1220] p-4 text-white">
          <h1 className="text-[16px] font-semibold">{ocean.droplets.find((vm) => vm.id === detailId)?.name ?? "Web console"}</h1>
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
        <DialogContent className="rounded-xl border border-[#2c3438] bg-[#171c1e] text-[#e8eeef] shadow-xl sm:max-w-lg">
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
  if (outcome.error) flash(outcome.error, "error")
  else if (outcome.message) flash(outcome.message)
}

function DropletDetail({ id, onBack, onConsole }: { id: string; onBack: () => void; onConsole: () => void }) {
  const vm = useLabState().do.droplets.find((item) => item.id === id)
  if (!vm) return <p className="p-6">This Droplet is no longer on the list.</p>
  return (
    <div className="p-6">
      <button type="button" className="text-[13px] text-[#7ebac2]" onClick={onBack}>Droplets</button>
      <h1 className="mt-2 text-[28px] font-semibold text-[#e8eeef]">{vm.name}</h1>
      <p className="mt-2"><StateBadge state={vm.state} provider="do" /></p>
      <dl className="mt-4 grid max-w-xl gap-2 text-[14px]">
        <div><dt className="text-[#8b969c]">Public IPv4</dt><dd className="font-mono">{vm.publicIp ?? "Assigning…"}</dd></div>
        <div><dt className="text-[#8b969c]">Image</dt><dd>{vm.imageLabel}</dd></div>
        <div><dt className="text-[#8b969c]">Size</dt><dd>{vm.sizeLabel}</dd></div>
        <div><dt className="text-[#8b969c]">Region</dt><dd>{vm.region}</dd></div>
      </dl>
      <button type="button" className={cn(BLUE, "mt-4")} onClick={onConsole}>Web console</button>
    </div>
  )
}

function DropletList({
  droplets,
  onCreate,
  onOpen,
  onConnect,
  onPower,
  onDestroy,
}: {
  droplets: Vm[]
  onCreate: () => void
  onOpen: (id: string) => void
  onConnect: (id: string) => void
  onPower: (id: string, on: boolean) => void
  onDestroy: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [menu, setMenu] = useState<string | null>(null)
  const [tab, setTab] = useState("Droplets")
  const all = droplets.filter((vm) => vm.state !== "terminated")
  const visible = all.filter((vm) => vm.name.toLowerCase().includes(query.trim().toLowerCase()))
  const tabs = [
    ["Droplets", all.length],
    ["Volumes", 0],
    ["Reserved IPs", 0],
    ["Snapshots", 0],
  ] as const
  return (
    <div className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[#e8eeef]">Droplets</h1>
          <div className="mt-3 flex gap-5 text-[14px]">
            {tabs.map(([label, count]) => (
              <button key={label} type="button" onClick={() => setTab(label)} className={cn("pb-2", tab === label ? "border-b-2 border-[#7ebac2] font-semibold text-[#7ebac2]" : "text-[#8b969c]")}>
                {label} <span className="ml-1 rounded-full bg-[#243033] px-1.5 text-[12px]">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <button type="button" className={BLUE} onClick={onCreate}>Create Droplet</button>
      </div>
      <div className="mt-4 rounded-md border border-[#2c3438] bg-[#171c1e]">
        <div className="border-b border-[#2c3438] px-3 py-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "Droplets" ? "Search by Droplet name" : `Search ${tab}`} className="h-8 w-full max-w-xs rounded-md border border-[#3a4248] px-2 text-[13px] outline-none" />
        </div>
        {tab !== "Droplets" ? (
          <p className="px-4 py-16 text-center text-[14px] text-[#8b969c]">You don’t have any {tab.toLowerCase()}.</p>
        ) : visible.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-[16px] font-semibold text-[#e8eeef]">You don’t have any Droplets.</p>
            <button type="button" className={cn(BLUE, "mt-4")} onClick={onCreate}>Get Started with a Droplet</button>
          </div>
        ) : (
          <ul>
            {visible.map((vm) => (
              <li key={vm.id} className="flex flex-wrap items-center gap-4 border-b border-[#2c3438] px-4 py-4 last:border-0">
                <span className="grid size-8 place-items-center text-[#7ebac2]" aria-hidden>◉</span>
                <div className="min-w-0 flex-1">
                  <button type="button" className="font-medium text-[#7ebac2] hover:underline" onClick={() => onOpen(vm.id)}>{vm.name}</button>
                  <p className="font-mono text-[13px] text-[#e8eeef]">{vm.publicIp ?? "Assigning…"}</p>
                  <p className="mt-1 text-[12px] text-[#8b969c]">{vm.sizeLabel} / {vm.region.toUpperCase()} — {vm.imageLabel}</p>
                  {vm.state === "pending" ? <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-[#243033]"><div className="h-full w-2/3 animate-pulse bg-[#7ebac2]" /></div> : null}
                  {vm.state !== "running" && vm.state !== "pending" ? <p className="mt-1"><StateBadge state={vm.state} provider="do" /></p> : null}
                </div>
                <div className="relative">
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#3a4248] px-2 py-1 text-[13px]" onClick={() => setMenu(menu === vm.id ? null : vm.id)} aria-expanded={menu === vm.id}>More <span aria-hidden>▾</span></button>
                  {menu === vm.id ? (
                    <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-[#2c3438] bg-[#171c1e] py-1 text-left shadow-lg">
                      <MenuButton disabled={vm.state !== "running"} onClick={() => { setMenu(null); onConnect(vm.id) }}>Access console</MenuButton>
                      <MenuButton disabled={vm.state !== "running"} onClick={() => { setMenu(null); onPower(vm.id, false) }}>Power off</MenuButton>
                      <MenuButton disabled={vm.state !== "stopped"} onClick={() => { setMenu(null); onPower(vm.id, true) }}>Power on</MenuButton>
                      <MenuButton disabled onClick={() => setMenu(null)}>Resize</MenuButton>
                      <MenuButton disabled onClick={() => setMenu(null)}>View graphs</MenuButton>
                      <MenuButton onClick={() => { setMenu(null); onDestroy(vm.id) }}>Destroy</MenuButton>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MenuButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-white/5 disabled:text-[#b0b8c6]">{children}</button>
}

function Keys() {
  const keys = useLabState().do.keys
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="p-6">
      <h1 className="text-[24px] font-semibold text-[#e8eeef]">Settings</h1>
      <div className="mt-4 flex gap-4 border-b border-[#2c3438] text-[13px]">
        <span className="border-b-2 border-[#7ebac2] pb-2 font-semibold text-[#7ebac2]">Security</span>
        <span className="pb-2 text-[#8b969c]">Team</span>
        <span className="pb-2 text-[#8b969c]">Profile</span>
      </div>
      <h2 className="mt-4 text-[16px] font-semibold">SSH keys</h2>
      <p className="mt-1 max-w-xl text-[13px] text-[#8b969c]">Add an SSH public key to connect to Droplets as root.</p>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        const outcome = dispatch({ type: "do/key", name })
        if (outcome.error) setError(outcome.error)
        else { setError(null); flash(outcome.message ?? "SSH key added.") }
      }}>
        <label className="grid gap-1.5 text-[13px]" htmlFor="key-name">Key name
          <Input id="key-name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-56 rounded-md" />
        </label>
        <button type="submit" className={BLUE}>Add SSH Key</button>
      </form>
      {error ? <p role="alert" className="mt-2 text-[13px] text-[#d92d20]">{error}</p> : null}
      <div className="mt-4 overflow-hidden rounded-md border border-[#2c3438] bg-[#171c1e]">
        {keys.length === 0 ? <p className="px-4 py-8 text-[13px] text-[#8b969c]">No SSH keys.</p> : (
          <table className="w-full text-left text-[13px]">
            <thead className="text-[#8b969c]"><tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Fingerprint</th><th /></tr></thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.name} className="border-t border-[#2c3438]">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{key.fingerprint}</td>
                  <td className="px-4 py-3 text-right"><button type="button" className="text-[#7ebac2]" onClick={() => downloadPem(key.name)}>Download</button></td>
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
        <h1 className="text-[24px] font-semibold text-[#e8eeef]">Spaces</h1>
      </div>
      <p className="mt-1 text-[13px] text-[#8b969c]">Object storage for files and static assets.</p>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        const outcome = dispatch({ type: "do/space", name })
        if (outcome.error) setError(outcome.error)
        else { setError(null); flash(outcome.message ?? "Space created.") }
      }}>
        <label className="grid gap-1.5 text-[13px]" htmlFor="space-name">Space name
          <Input id="space-name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-56 rounded-md" />
        </label>
        <button type="submit" className={BLUE}>Create a Space</button>
      </form>
      {error ? <p role="alert" className="mt-2 text-[13px] text-[#d92d20]">{error}</p> : null}
      <div className="mt-4 rounded-md border border-[#2c3438] bg-[#171c1e]">
        {ocean.spaces.length === 0 ? <p className="px-4 py-10 text-center text-[13px] text-[#8b969c]">You don’t have any Spaces.</p> : (
          <ul>
            {ocean.spaces.map((space) => (
              <li key={space.name} className="flex items-center justify-between border-b border-[#2c3438] px-4 py-3 last:border-0">
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

