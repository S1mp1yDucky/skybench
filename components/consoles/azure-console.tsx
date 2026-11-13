"use client"

import { useEffect, useState } from "react"
import { FluentProvider, webLightTheme } from "@fluentui/react-components"
import { ConsoleSelect } from "@/components/console-select"
import { flash } from "@/lib/flash"
import { AccountForm, SignInCard } from "@/components/account-form"
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
import { AZURE_IMAGES, AZURE_LOCATIONS, AZURE_SIZES, STUDENT } from "@/lib/catalog"
import { usd } from "@/lib/format"
import { platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Vm } from "@/lib/types"

const PRIMARY = "inline-flex h-8 items-center justify-center rounded-[2px] bg-[#0078d4] px-4 text-[14px] font-semibold text-white hover:bg-[#106ebe] disabled:opacity-50"
const COMMAND = "inline-flex h-8 items-center gap-1.5 px-2 text-[14px] text-[#323130] hover:bg-[#f3f2f1] disabled:opacity-40"

export function AzureConsole() {
  const lab = useLabState()
  const azure = lab.azure
  const [view, setView] = useState("portal")
  const [connectId, setConnectId] = useState<string | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const stage = !azure.reviewedSite ? "study" : !azure.accountCreated ? "signup" : !azure.signedIn ? "signin" : view
  const metering = azure.vms.some((vm) => vm.state === "running")
  const now = useNow(stage === "billing" || metering)
  const spend = now == null ? 0 : platformCost(lab, "azure", now)
  const alert =
    now != null && spend > azure.budgetUsd
      ? `Your budget of ${usd(azure.budgetUsd)} has been exceeded. Month-to-date cost is ${usd(spend)}.`
      : null
  const connectVm = azure.vms.find((vm) => vm.id === connectId) ?? null

  if (stage === "signup") {
    return (
      <AccountForm
        accent="azure"
        showStudent
        emailDefault={STUDENT.email}
        onCreate={({ email, student }) => dispatch({ type: "azure/signup", email, student })}
      />
    )
  }
  if (stage === "signin") {
    return <SignInCard accent="azure" email={azure.email} onSignIn={() => dispatch({ type: "azure/signin" })} />
  }

  return (
    <FluentProvider theme={webLightTheme}>
    <ConsoleFrame
      theme="azure"
      product="Azure portal"
      account={azure.email || STUDENT.email}
      onSignOut={azure.signedIn ? () => dispatch({ type: "azure/signout" }) : undefined}
      nav={[
        { id: "portal", label: "Home" },
        { id: "create", label: "Create a resource" },
        { id: "vms", label: "Virtual machines" },
        { id: "appservice", label: "App Service" },
        { id: "functions", label: "Function App" },
        { id: "storage", label: "Storage accounts" },
        { id: "vnet", label: "Virtual networks" },
        { id: "groups", label: "Resource groups" },
        { id: "entra", label: "Microsoft Entra ID" },
        { id: "monitor", label: "Monitor" },
        { id: "more", label: "All services" },
        { id: "shell", label: "Cloud Shell" },
        { id: "billing", label: "Cost Management + Billing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!azure.reviewedSite || !azure.accountCreated || !azure.signedIn}
      alert={alert}
    >
      {stage === "study" && !azure.reviewedSite ? (
        <AzureHome account={azure.email || STUDENT.email} vms={azure.vms} onOpen={() => undefined} continueLabel="Start free" onContinue={() => dispatch({ type: "azure/review" })} />
      ) : null}
      {stage === "portal" ? <AzureHome account={azure.email} vms={azure.vms} onOpen={setView} /> : null}
      {SERVICE_BLADES[stage] ? <ServiceBlade title={SERVICE_BLADES[stage]} /> : null}
      {stage === "vms" ? (
        <VmList
          vms={azure.vms}
          onCreate={() => setView("create")}
          onConnect={setConnectId}
          onStop={(id) => tell(dispatch({ type: "azure/stop", id }))}
          onStart={(id) => tell(dispatch({ type: "azure/start", id }))}
        />
      ) : null}
      {stage === "create" ? <CreateVm onDone={() => setView("vms")} /> : null}
      {stage === "groups" ? <Groups onDelete={setGroupToDelete} /> : null}
      {stage === "shell" ? <AzureCloudShell /> : null}
      {stage === "billing" ? (
        <div className="bg-[#faf9f8] p-6">
          <BillingPanel
            title="Cost Management + Billing"
            note="Compute is billed while the virtual machine is running. Stopped (deallocated) virtual machines are not billed for compute. Managed disks continue to incur charges."
            budget={azure.budgetUsd}
            vms={azure.vms}
            now={now}
            fastForward={{ type: "azure/fast-forward" }}
            onBudget={(amount) => ({ type: "azure/budget", amount })}
          />
        </div>
      ) : null}
      <ConnectDialog platform="azure" vm={connectVm} open={connectVm != null} onOpenChange={(open) => !open && setConnectId(null)} />
      <Dialog open={groupToDelete != null} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <DialogContent className="rounded-[2px] border border-[#edebe9] bg-white text-[#323130] shadow-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete {groupToDelete}?</DialogTitle>
            <DialogDescription>Deleting a resource group is irreversible. All resources in the group will be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col items-stretch sm:flex-col">
            <label className="grid gap-1.5 text-[13px]">Type the resource group name
              <Input id="confirm-group" onChange={(event) => { event.currentTarget.dataset.match = event.target.value === groupToDelete ? "yes" : "no" }} />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setGroupToDelete(null)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={(event) => {
                const input = event.currentTarget.closest("[data-slot='dialog-content']")?.querySelector("input")
                if (!groupToDelete || input?.value !== groupToDelete) return
                tell(dispatch({ type: "azure/delete-group", name: groupToDelete }))
                setGroupToDelete(null)
              }}>Delete</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsoleFrame>
    </FluentProvider>
  )
}

function AzureCloudShell() {
  const [step, setStep] = useState<"pick" | "storage" | "wait" | "ready">("pick")
  const [shell, setShell] = useState<"Bash" | "PowerShell">("Bash")
  useEffect(() => {
    if (step !== "wait") return
    const timer = window.setTimeout(() => setStep("ready"), 900)
    return () => window.clearTimeout(timer)
  }, [step])
  return (
    <div className="flex h-full min-h-[420px] flex-col border-t border-[#edebe9] bg-[#012456] text-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[#001b33] px-3 py-2 text-[13px]">
        <span>Azure Cloud Shell</span>
        {step === "ready" ? <button type="button" className="rounded bg-white/10 px-2 py-1" onClick={() => setShell(shell === "Bash" ? "PowerShell" : "Bash")}>{shell === "Bash" ? "Switch to PowerShell" : "Switch to Bash"}</button> : null}
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-white/70">
          <span>Restart</span>
          <span>Settings</span>
          <span>Editor</span>
          <span>New session</span>
        </span>
      </div>
      {step === "pick" ? (
        <div className="grid gap-3 bg-white p-6 text-[#323130]">
          <h2 className="text-[18px] font-semibold">Welcome to Azure Cloud Shell</h2>
          <p>Select Bash or PowerShell.</p>
          <div className="flex gap-2">
            <button type="button" className={PRIMARY} onClick={() => { setShell("Bash"); setStep("storage") }}>Bash</button>
            <button type="button" className={PRIMARY} onClick={() => { setShell("PowerShell"); setStep("storage") }}>PowerShell</button>
          </div>
        </div>
      ) : null}
      {step === "storage" ? (
        <div className="grid gap-3 bg-white p-6 text-[#323130]">
          <h2 className="text-[18px] font-semibold">Getting started</h2>
          <button type="button" className={PRIMARY} onClick={() => setStep("wait")}>Mount storage account</button>
          <button type="button" className="h-8 w-fit border border-[#8a8886] px-3" onClick={() => setStep("wait")}>No storage account required</button>
        </div>
      ) : null}
      {step === "wait" ? <p className="px-4 py-6">Requesting a Cloud Shell…</p> : null}
      {step === "ready" ? <div className="p-3"><Terminal platform="azure" /></div> : null}
    </div>
  )
}

function tell(outcome: { error?: string; message?: string }) {
  if (outcome.error) flash(outcome.error, "error")
  else if (outcome.message) flash(outcome.message)
}

const SERVICES = [
  { label: "Create a resource", id: "create", glyph: "plus" },
  { label: "Virtual machines", id: "vms", glyph: "vm" },
  { label: "Quickstart Center", id: "more", glyph: "rocket" },
  { label: "Foundry", id: "more", glyph: "foundry" },
  { label: "Kubernetes services", id: "aks", glyph: "k8s" },
  { label: "App Services", id: "appservice", glyph: "app" },
  { label: "Storage accounts", id: "storage", glyph: "disk" },
  { label: "SQL databases", id: "sql", glyph: "sql" },
  { label: "Azure Cosmos DB", id: "cosmos", glyph: "cosmos" },
  { label: "More services", id: "more", glyph: "more" },
] as const

const SERVICE_BLADES: Record<string, string> = {
  appservice: "App Service",
  functions: "Function App",
  sql: "SQL databases",
  cosmos: "Azure Cosmos DB",
  storage: "Storage accounts",
  aks: "Kubernetes services",
  vnet: "Virtual networks",
  more: "All services",
  entra: "Microsoft Entra ID",
  monitor: "Monitor",
}

function AzureHome({
  account,
  vms,
  onOpen,
  continueLabel,
  onContinue,
}: {
  account: string
  vms: Vm[]
  onOpen: (id: string) => void
  continueLabel?: string
  onContinue?: () => void
}) {
  const visible = vms.filter((vm) => vm.state !== "terminated")
  const [hover, setHover] = useState<string | null>(null)
  return (
    <div className="bg-white px-6 py-6 sm:px-10">
      <div className="mx-auto grid max-w-[1080px] gap-10">
        {continueLabel && onContinue ? (
          <div className="flex justify-end">
            <button type="button" className={PRIMARY} onClick={onContinue}>{continueLabel}</button>
          </div>
        ) : null}
        <section>
          <h2 className="text-[18px] font-semibold">Azure services</h2>
          <div className="mt-4 flex gap-1 overflow-x-auto pb-2">
            {SERVICES.map((service) => (
              <div key={service.label} className="relative" onMouseEnter={() => setHover(service.label)} onMouseLeave={() => setHover(null)}>
                <button type="button" onClick={() => onOpen(service.id)} className="grid w-[108px] shrink-0 justify-items-center gap-2 px-1 py-2 text-center text-[12px] leading-4 text-[#0078d4] hover:bg-[#f3f2f1]">
                  <ServiceGlyph kind={service.glyph} />
                  {service.label}
                </button>
                {hover === service.label && service.label === "Virtual machines" ? (
                  <div className="absolute top-0 left-full z-30 w-72 border border-[#edebe9] bg-white p-4 text-left text-[#323130] shadow-xl">
                    <div className="flex items-center gap-2">
                      <ServiceGlyph kind="vm" />
                      <p className="text-[16px] font-semibold">Virtual machines</p>
                    </div>
                    <div className="mt-3 flex gap-4 text-[13px] text-[#0078d4]">
                      <button type="button" onClick={() => onOpen("create")}>+ Create</button>
                      <button type="button" onClick={() => onOpen("vms")}>View</button>
                    </div>
                    <p className="mt-3 text-[12px] font-semibold text-[#605e5c]">Description</p>
                    <p className="mt-1 text-[13px]">Create a virtual machine that runs Linux or Windows. Select an image from the marketplace or use your own customized image.</p>
                    <p className="mt-3 text-[13px] text-[#0078d4]">Learn more with Copilot</p>
                    <p className="mt-2 text-[12px] text-[#605e5c]">Free training from Microsoft</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold">Resources</h2>
          <div className="mt-3 flex gap-6 border-b border-[#edebe9] text-[14px]">
            <span className="border-b-2 border-[#0078d4] pb-2 font-semibold text-[#0078d4]">Recent</span>
            <span className="pb-2">Favorite</span>
          </div>
          <div className="mt-3 grid grid-cols-3 text-[13px] text-[#605e5c]">
            <span>Name</span>
            <span className="text-center">Type</span>
            <span className="text-right">Last Viewed</span>
          </div>
          {visible.length === 0 ? (
            <div className="grid justify-items-center py-8 text-center">
              <CubeMark />
              <p className="mt-3 text-[14px]">No resources have been viewed recently</p>
              <button type="button" onClick={() => onOpen("vms")} className="mt-4 h-8 rounded-sm border border-[#8a8886] bg-white px-4 text-[13px]">View all resources</button>
            </div>
          ) : (
            <table className="mt-1 w-full text-left text-[13px]">
              <tbody>
                {visible.map((vm) => (
                  <tr key={vm.id} className="border-t border-[#edebe9]">
                    <td className="py-2 text-[#0078d4]">{vm.name}</td>
                    <td className="py-2 text-center">Virtual machine</td>
                    <td className="py-2 text-right text-[#605e5c]">Just now</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="sr-only">{account}</p>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold">Navigate</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NavLink label="Subscriptions" tone="gold" onClick={() => onOpen("billing")} />
            <NavLink label="Resource groups" tone="blue" onClick={() => onOpen("groups")} />
            <NavLink label="All resources" tone="green" onClick={() => onOpen("more")} />
            <NavLink label="Dashboard" tone="teal" />
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold">Tools</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Tool title="Microsoft Learn" body="Learn Azure with free online training from Microsoft" tone="#0078d4" />
            <Tool title="Azure Monitor" body="Monitor your apps and infrastructure" tone="#0078d4" />
            <Tool title="Microsoft Defender for Cloud" body="Secure your apps and infrastructure" tone="#107c10" />
            <Tool title="Cost Management" body="Analyze and optimize your cloud spend for free" tone="#107c10" />
          </div>
        </section>
        <section className="grid gap-8 pb-8 lg:grid-cols-[1fr_240px]">
          <div>
            <h2 className="text-[18px] font-semibold">Useful links</h2>
            <div className="mt-4 grid gap-x-8 gap-y-2 text-[13px] text-[#0078d4] sm:grid-cols-3">
              <p>Technical Documentation</p>
              <p>Azure Services</p>
              <p>Recent Azure Updates</p>
              <p>Azure Migration Tools</p>
              <p>Find an Azure expert</p>
              <p>Quickstart Center</p>
            </div>
          </div>
          <div>
            <h2 className="text-[18px] font-semibold">Azure mobile app</h2>
            <div className="mt-4 flex gap-2">
              <span className="inline-flex h-10 items-center rounded-md bg-black px-3 text-[11px] font-semibold text-white">App Store</span>
              <span className="inline-flex h-10 items-center rounded-md bg-black px-3 text-[11px] font-semibold text-white">Google Play</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function VmList({
  vms,
  onCreate,
  onConnect,
  onStop,
  onStart,
}: {
  vms: Vm[]
  onCreate: () => void
  onConnect: (id: string) => void
  onStop: (id: string) => void
  onStart: (id: string) => void
}) {
  const [filter, setFilter] = useState("")
  const [menu, setMenu] = useState(false)
  const all = vms.filter((vm) => vm.state !== "terminated")
  const visible = all.filter((vm) => `${vm.name} ${vm.resourceGroup ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()))
  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex items-start justify-between border-b border-[#edebe9] px-5 py-3">
        <div>
          <p className="text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> Compute infrastructure</p>
          <h1 className="mt-1 text-[24px] font-semibold">Compute infrastructure | Virtual machines</h1>
          <p className="text-[12px] text-[#605e5c]">Microsoft | Default Directory</p>
        </div>
        <button type="button" aria-label="Close blade" className="text-[18px] text-[#605e5c]">×</button>
      </div>
      <div className="flex gap-6 px-5 text-[14px]">
        <span className="border-b-2 border-[#0078d4] py-2 font-semibold">Virtual machines</span>
        <span className="py-2 text-[#0078d4]">Get started</span>
      </div>
      <div className="flex flex-wrap items-center gap-0.5 border-y border-[#edebe9] px-2 py-0.5">
        <div className="relative">
          <button type="button" className={COMMAND} onClick={onCreate}><span className="text-[#0078d4]">+</span> Create</button>
          <button type="button" aria-label="Create options" aria-expanded={menu} className="h-8 px-1 text-[12px] hover:bg-[#f3f2f1]" onClick={() => setMenu((open) => !open)}>▾</button>
          {menu ? (
            <div className="absolute top-9 left-0 z-30 w-[340px] border border-[#edebe9] bg-white p-2 text-[13px] shadow-xl">
              <button type="button" className="block w-full px-2 py-2 text-left hover:bg-[#f3f2f1]" onClick={onCreate}>
                <span className="block font-semibold">Virtual machine</span>
                <span className="block text-[12px] text-[#605e5c]">Best for lower-traffic workloads, testing, or to control or tightly customize apps, OS, or the system.</span>
              </button>
              <button type="button" className="block w-full px-2 py-2 text-left hover:bg-[#f3f2f1]">
                <span className="block font-semibold">Virtual machine scale set (VMSS)</span>
                <span className="block text-[12px] text-[#605e5c]">Built-in scaling, performance optimization, load balancing, and batch management for 1 to 1,000 VMs.</span>
              </button>
            </div>
          ) : null}
        </div>
        {["Reservations", "Manage view", "Refresh", "Export to CSV", "Open query", "Assign tags", "Start", "Restart", "Stop", "Delete"].map((label) => (
          <button key={label} type="button" className={COMMAND}>{label}</button>
        ))}
        <span className="ml-auto px-2 text-[13px]">Group by none ▾</span>
      </div>
      <div className="px-5 py-3">
        <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter for any field..." className="h-8 w-full max-w-sm rounded-sm border border-[#8a8886] bg-white px-2 text-[13px] outline-none focus:border-[#0078d4]" />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          {["Subscription equals Subscription 1", "Type equals all", "Resource group equals all", "Location equals all"].map((chip) => (
            <span key={chip} className="inline-flex items-center gap-2 rounded-full bg-[#deecf9] px-3 py-1 text-[#0078d4]">{chip} <span aria-hidden>×</span></span>
          ))}
          <button type="button" className="text-[#0078d4]">+ Add Filter</button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto px-2">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <caption className="sr-only">Azure virtual machines</caption>
          <thead className="border-b border-[#edebe9] text-[#605e5c]">
            <tr>
              {["Name", "Resource group", "Location", "Status", "Operating system", "Size", "Public IP address", ""].map((heading) => (
                <th key={heading || "act"} className="px-2 py-2 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="px-2 py-16 text-center">
                <div className="mx-auto grid justify-items-center text-[#c8c6c4]"><EmptyVm /></div>
                <p className="mt-3 text-[18px] font-semibold text-[#323130]">No virtual machines to display</p>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#605e5c]">Create a virtual machine that runs Linux or Windows. Select an image from the marketplace or use your own customized image.</p>
                <button type="button" className="mt-4 h-8 rounded-sm border border-[#8a8886] bg-white px-3 text-[13px]" onClick={onCreate}>+ Create</button>
                <p className="mt-4 text-[13px] text-[#0078d4]">Learn more about Windows virtual machines</p>
                <p className="mt-1 text-[13px] text-[#0078d4]">Learn more about Linux virtual machines</p>
              </td></tr>
            ) : visible.map((vm) => (
              <tr key={vm.id} className="border-b border-[#f3f2f1] hover:bg-[#f3f2f1]">
                <td className="px-2 py-2 text-[#0078d4]">{vm.name}</td>
                <td className="px-2 py-2">{vm.resourceGroup}</td>
                <td className="px-2 py-2">{locationLabel(vm.region)}</td>
                <td className="px-2 py-2"><StateBadge state={vm.state} provider="azure" /></td>
                <td className="px-2 py-2">{vm.imageLabel}</td>
                <td className="px-2 py-2">{vm.sizeId}</td>
                <td className="px-2 py-2 font-mono text-[12px]">{vm.publicIp ?? "—"}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-2 whitespace-nowrap">
                    <button type="button" className="text-[#0078d4] hover:underline disabled:text-[#a19f9d]" disabled={vm.state !== "running"} onClick={() => onConnect(vm.id)}>Connect</button>
                    <button type="button" className="text-[#0078d4] hover:underline disabled:text-[#a19f9d]" disabled={vm.state !== "running"} onClick={() => onStop(vm.id)}>Stop</button>
                    <button type="button" className="text-[#0078d4] hover:underline disabled:text-[#a19f9d]" disabled={vm.state !== "stopped"} onClick={() => onStart(vm.id)}>Start</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#edebe9] px-4 py-2 text-[12px] text-[#605e5c]">
        <span>Showing {visible.length} of {all.length}</span>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2"><input type="checkbox" defaultChecked /> New Browse Experience</label>
          <button type="button" className="text-[#0078d4]">Give feedback</button>
        </div>
      </div>
    </div>
  )
}

const TABS = ["Basics", "Disks", "Networking", "Management", "Monitoring", "Advanced", "Tags", "Review + create"]

function CreateVm({ onDone }: { onDone: () => void }) {
  const azure = useLabState().azure
  const [tab, setTab] = useState("Basics")
  const [group, setGroup] = useState(azure.resourceGroups[0]?.name ?? "")
  const [location, setLocation] = useState(azure.location)
  const [makingGroup, setMakingGroup] = useState(azure.resourceGroups.length === 0)
  const [name, setName] = useState("")
  const [imageId, setImageId] = useState(AZURE_IMAGES[0].id)
  const [sizeId, setSizeId] = useState(AZURE_SIZES[0].id)
  const [username, setUsername] = useState("azureuser")
  const [keyName, setKeyName] = useState(azure.keyPairs[0]?.name ?? "")
  const [ports, setPorts] = useState("SSH (22)")
  const [imagesOpen, setImagesOpen] = useState(false)
  const [sizesOpen, setSizesOpen] = useState(false)
  const [sizeQuery, setSizeQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const image = AZURE_IMAGES.find((item) => item.id === imageId)

  function createGroup() {
    const outcome = dispatch({ type: "azure/group", name: group, location })
    if (outcome.error) setError(outcome.error)
    else {
      setError(null)
      setMakingGroup(false)
      flash(outcome.message ?? "Resource group created.")
    }
  }

  const [phase, setPhase] = useState<"form" | "key" | "deploy" | "done" | "overview">("form")
  const [disk, setDisk] = useState("Premium SSD")
  const [shutdown, setShutdown] = useState(false)
  const [tagName, setTagName] = useState("")
  const [tagValue, setTagValue] = useState("")
  const [arch, setArch] = useState("x64")
  const [keyType, setKeyType] = useState("RSA")
  const [spot, setSpot] = useState(false)
  const [vnet, setVnet] = useState("")
  const [subnet, setSubnet] = useState("")
  const [publicIp, setPublicIp] = useState("None")
  const [nsg, setNsg] = useState("Basic")
  const [inbound, setInbound] = useState("Allow selected ports")
  const [deleteNic, setDeleteNic] = useState(false)
  const [accel, setAccel] = useState(false)
  const [lb, setLb] = useState("None")
  const [osSize, setOsSize] = useState("Image default (30 GiB)")
  const [deleteOs, setDeleteOs] = useState(true)
  const [ultra, setUltra] = useState(false)
  const [hostEnc, setHostEnc] = useState(false)
  const [ephemeral, setEphemeral] = useState("None")
  const [bootChoice, setBootChoice] = useState("managed")
  const [alertsOn, setAlertsOn] = useState(false)
  const [guestDiag, setGuestDiag] = useState(false)
  const [healthOn, setHealthOn] = useState(false)
  const [customData, setCustomData] = useState("")
  const size = AZURE_SIZES.find((item) => item.id === sizeId) ?? AZURE_SIZES[0]
  const monthly = size.hourlyUsd * 730
  const diskMonthly = disk.startsWith("Premium") ? 5.28 : disk.startsWith("Standard SSD") ? 2.4 : 1.54
  const basicsInvalid = !name.trim() || !group.trim()
  const netInvalid = !vnet.trim() || !subnet.trim()
  const valid = !basicsInvalid && !netInvalid

  function launch() {
    if (!azure.keyPairs.some((key) => key.name === keyName)) {
      setPhase("key")
      return
    }
    beginDeploy()
  }

  function beginDeploy(overrideKey?: string) {
    const outcome = dispatch({ type: "azure/launch", name, group, imageId, sizeId, keyName: overrideKey ?? keyName, username })
    if (outcome.error) {
      setError(outcome.error)
      setPhase("form")
      return
    }
    setError(null)
    setPhase("deploy")
    window.dispatchEvent(new CustomEvent("skybench-note", { detail: { title: "Deployment started", body: name || "virtual machine" } }))
    window.setTimeout(() => {
      setPhase("done")
      window.dispatchEvent(new CustomEvent("skybench-note", { detail: { title: "Deployment succeeded", body: name || "virtual machine" } }))
    }, 1600)
  }

  if (phase === "deploy" || phase === "done") {
    return (
      <div className="bg-white px-6 py-5">
        <h1 className="text-[24px] font-semibold">{phase === "done" ? "Your deployment is complete" : "Deployment is in progress"}</h1>
        <p className="mt-2 text-[13px] text-[#605e5c]">Deployment name: {name || "vm"}. Resource group: {group}.</p>
        <ul className="mt-4 grid max-w-xl gap-2 text-[14px]">
          {[`${name || "vm"}`, `${name || "vm"}-ip`, `${name || "vm"}-nsg`, `${name || "vm"}-vnet`].map((resource) => (
            <li key={resource} className="flex items-center gap-2 border border-[#edebe9] px-3 py-2">
              <StateBadge state={phase === "done" ? "running" : "pending"} provider="azure" />
              <span>{resource}</span>
            </li>
          ))}
        </ul>
        {phase === "done" ? <button type="button" className={cn(PRIMARY, "mt-4")} onClick={() => setPhase("overview")}>Go to resource</button> : null}
      </div>
    )
  }
  if (phase === "overview") {
    const vm = azure.vms.find((item) => item.name === name)
    return (
      <div className="bg-white">
        <div className="border-b border-[#edebe9] px-6 py-3 text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> {name}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
          <h1 className="text-[24px] font-semibold">{name}</h1>
          <button type="button" className="text-[13px] text-[#0078d4]" onClick={onDone}>Back to virtual machines</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 border-y border-[#edebe9] bg-[#faf9f8] px-4 py-1 text-[13px]">
          <button type="button" className={COMMAND}>Connect</button>
          <button type="button" className={COMMAND}>Stop</button>
          <button type="button" className={COMMAND}>Refresh</button>
          <button type="button" className={COMMAND}>Delete</button>
        </div>
        <div className="grid gap-6 px-6 py-4 lg:grid-cols-[180px_1fr]">
          <nav className="text-[13px]">
            {["Overview", "Activity log", "Access control (IAM)", "Tags", "Networking", "Settings"].map((item, index) => (
              <p key={item} className={cn("px-2 py-1.5", index === 0 && "border-l-2 border-[#0078d4] font-semibold")}>{item}</p>
            ))}
          </nav>
          <div>
            <h2 className="text-[16px] font-semibold">Essentials</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Resource group</dt><dd className="text-[#0078d4]">{group}</dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Size</dt><dd>{sizeId}</dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Status</dt><dd><StateBadge state={vm?.state ?? "pending"} provider="azure" /></dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Public IP address</dt><dd className="font-mono">{vm?.publicIp ?? "Assigning…"}</dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Location</dt><dd>{locationLabel(location)}</dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Subscription</dt><dd>Azure subscription 1</dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Operating system</dt><dd>{image?.label}</dd></div>
              <div className="flex gap-4"><dt className="w-36 text-[#605e5c]">Virtual machine</dt><dd>{name}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    )
  }

  const email = azure.email || STUDENT.email
  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex items-start justify-between border-b border-[#edebe9] px-6 py-3">
        <div>
          <p className="text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> Compute infrastructure | Virtual machines</p>
          <h1 className="mt-1 text-[24px] font-semibold">Create a virtual machine</h1>
        </div>
        <button type="button" aria-label="Close" className="grid size-8 place-items-center text-[20px]" onClick={onDone}>×</button>
      </div>
      <div className="overflow-x-auto border-b border-[#edebe9] px-4">
        <div className="flex text-[13px]">
          {TABS.map((item) => {
            const bad = (item === "Basics" && basicsInvalid) || (item === "Networking" && netInvalid)
            return (
              <button key={item} type="button" onClick={() => setTab(item)} className={cn("inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2", tab === item ? "border-[#0078d4] font-semibold" : "border-transparent hover:bg-[#f3f2f1]")}>
                {bad ? <span className="grid size-4 place-items-center rounded-full bg-[#a4262c] text-[10px] leading-none text-white" aria-hidden>×</span> : null}
                {item}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid flex-1 items-start lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-4 px-6 py-5">
        {tab === "Basics" ? (
          <div className="grid gap-4 text-[13px]">
            <PreviewNote />
            <p>Create a virtual machine that runs Linux or Windows. Select an image from Azure marketplace or use your own customized image. Complete the Basics tab then Review + create to provision a virtual machine with default parameters or review each tab for full customization.</p>
            <h2 className="text-[16px] font-semibold">Project details</h2>
            <p className="text-[#605e5c]">Select the subscription to manage deployed resources and costs. Use resource groups like folders to organize and manage all your resources.</p>
            <BladeField label="Subscription" required><FakeSelect value="Subscription 1" /></BladeField>
            <BladeField label="Resource group" required>
              <div className="max-w-sm">
                {azure.resourceGroups.length > 0 && !makingGroup ? (
                  <ConsoleSelect id="az-existing-group" label="Resource group" theme="azure" value={group} onChange={setGroup} options={azure.resourceGroups.map((item) => ({ value: item.name, label: item.name }))} className="max-w-none" />
                ) : (
                  <Input id="az-group" value={group} onChange={(event) => setGroup(event.target.value)} placeholder="(New) Resource group" className="h-8 w-full rounded-sm" />
                )}
                <div className="mt-1 flex gap-3">
                  <button type="button" className="text-[#0078d4] hover:underline" onClick={() => setMakingGroup(true)}>Create new</button>
                  {makingGroup ? <button type="button" className="text-[#0078d4] hover:underline" onClick={createGroup}>OK</button> : null}
                  {makingGroup && azure.resourceGroups.length > 0 ? <button type="button" className="text-[#605e5c]" onClick={() => setMakingGroup(false)}>Cancel</button> : null}
                </div>
              </div>
            </BladeField>
            <h2 className="text-[16px] font-semibold">Instance details</h2>
            <BladeField label="Virtual machine name" required><Input id="az-vm-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 max-w-sm rounded-sm" /></BladeField>
            <BladeField label="Region" required>
              <div className="max-w-sm">
                <ConsoleSelect id="az-location" label="Region" theme="azure" value={location} onChange={setLocation} options={AZURE_LOCATIONS.map((item) => ({ value: item.id, label: item.label }))} className="max-w-none" />
                <p className="mt-1 text-[#0078d4]">Deploy to an Azure Extended Zone</p>
              </div>
            </BladeField>
            <BladeField label="Availability options" required><FakeSelect value="Availability zone" /></BladeField>
            <BladeField label="Availability zone" required>
              <div className="max-w-sm">
                <FakeSelect value="Zone 1" />
                <p className="mt-1 text-[#0078d4]">Protect VM from zonal-failure with Zone resilience (Preview)</p>
              </div>
            </BladeField>
            <BladeField label="Security type">
              <div className="max-w-sm">
                <FakeSelect value="Trusted launch virtual machines" />
                <p className="mt-1 text-[#0078d4]">Configure security features</p>
              </div>
            </BladeField>
            <BladeField label="Image" required>
              <div className="max-w-sm">
                <ConsoleSelect id="az-image" label="Image" theme="azure" value={imageId} onChange={setImageId} options={AZURE_IMAGES.map((item) => ({ value: item.id, label: item.label }))} className="max-w-none" />
                <p className="mt-1 text-[#0078d4]"><button type="button" className="hover:underline" onClick={() => setImagesOpen((open) => !open)}>See all images</button> <span className="px-1 text-[#605e5c]">|</span> Configure VM generation</p>
                {imagesOpen ? (
                  <ul className="mt-2 border border-[#edebe9]">
                    {AZURE_IMAGES.map((item) => (
                      <li key={item.id}><button type="button" className="w-full px-3 py-2 text-left hover:bg-[#f3f2f1]" onClick={() => { setImageId(item.id); setImagesOpen(false) }}>{item.label}</button></li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </BladeField>
            <BladeField label="VM architecture">
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="arch" checked={arch === "Arm64"} onChange={() => setArch("Arm64")} /> Arm64</label>
                <label className="flex items-center gap-2"><input type="radio" name="arch" checked={arch === "x64"} onChange={() => setArch("x64")} /> x64</label>
              </div>
            </BladeField>
            <BladeField label="Size" required>
              <div className="max-w-sm">
                <ConsoleSelect id="az-size" label="Size" theme="azure" value={sizeId} onChange={setSizeId} options={AZURE_SIZES.map((item) => ({ value: item.id, label: `${item.id} - ${item.vcpu} vcpus, ${item.ram} memory (${usd(item.hourlyUsd * 730)}/month)` }))} className="max-w-none" />
                <p className="mt-1 text-[#0078d4]"><button type="button" className="hover:underline" onClick={() => setSizesOpen((open) => !open)}>See all sizes</button></p>
                {sizesOpen ? (
                  <ul className="mt-2 border border-[#edebe9]">
                    {AZURE_SIZES.filter((item) => `${item.id} ${item.ram}`.toLowerCase().includes(sizeQuery.trim().toLowerCase())).map((item) => (
                      <li key={item.id}><button type="button" className="w-full px-3 py-2 text-left hover:bg-[#f3f2f1]" onClick={() => { setSizeId(item.id); setSizesOpen(false) }}>{item.id} — {item.vcpu} vcpus, {item.ram}</button></li>
                    ))}
                  </ul>
                ) : null}
                <input aria-label="Filter sizes" value={sizeQuery} onChange={(event) => setSizeQuery(event.target.value)} className="sr-only" />
              </div>
            </BladeField>
            <BladeField label="Run with Azure Spot discount">
              <label className="flex items-center gap-2"><input type="checkbox" checked={spot} onChange={(event) => setSpot(event.target.checked)} /> <span className="sr-only">Run with Azure Spot discount</span></label>
            </BladeField>
            <h2 className="text-[16px] font-semibold">Administrator account</h2>
            <BladeField label="Authentication type" required>
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" checked readOnly /> SSH public key</label>
                <label className="flex items-center gap-2"><input type="radio" disabled /> Password</label>
                <div className="max-w-lg border border-[#c7e0f4] bg-[#f3f9fd] px-3 py-2">Azure now automatically generates an SSH key pair for you and allows you to store it for future use. It is a fast, simple, and secure way to connect to your virtual machine.</div>
              </div>
            </BladeField>
            <BladeField label="Username" required><Input id="az-user" value={username} onChange={(event) => setUsername(event.target.value)} className="h-8 max-w-sm rounded-sm" /></BladeField>
            <BladeField label="SSH public key source" required><FakeSelect value="Generate new key pair" /></BladeField>
            <BladeField label="SSH Key Type" required>
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="keytype" checked={keyType === "RSA"} onChange={() => setKeyType("RSA")} /> RSA SSH Format</label>
                <label className="flex items-center gap-2"><input type="radio" name="keytype" checked={keyType === "Ed25519"} onChange={() => setKeyType("Ed25519")} /> Ed25519 SSH Format</label>
              </div>
            </BladeField>
            <BladeField label="Key pair name" required>
              <div className="flex max-w-sm flex-wrap items-center gap-2">
                <Input aria-label="SSH key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-8 min-w-0 flex-1 rounded-sm" />
                <button type="button" className="h-8 shrink-0 rounded-sm border border-[#8a8886] bg-white px-3" onClick={() => {
                  const outcome = dispatch({ type: "azure/key", name: keyName })
                  if (outcome.error) setError(outcome.error)
                  else { setError(null); flash(outcome.message ?? "SSH key created.") }
                }}>Create SSH key</button>
                {azure.keyPairs.some((key) => key.name === keyName) ? <button type="button" className="text-[#0078d4]" onClick={() => downloadPem(keyName)}>Download</button> : null}
              </div>
            </BladeField>
            <h2 className="text-[16px] font-semibold">Inbound port rules</h2>
            <p className="text-[#605e5c]">Select which virtual machine network ports are accessible from the public internet. You can specify more limited or granular network access on the Networking tab.</p>
            <BladeField label="Public inbound ports" required>
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="inbound" checked={inbound === "None"} onChange={() => setInbound("None")} /> None</label>
                <label className="flex items-center gap-2"><input type="radio" name="inbound" checked={inbound === "Allow selected ports"} onChange={() => setInbound("Allow selected ports")} /> Allow selected ports</label>
              </div>
            </BladeField>
            {inbound === "Allow selected ports" ? (
              <BladeField label="Select inbound ports" required>
                <div className="grid max-w-sm gap-2">
                  <ConsoleSelect label="Select inbound ports" theme="azure" value={ports} onChange={setPorts} options={["SSH (22)", "HTTP (80), SSH (22)", "None"].map((item) => ({ value: item, label: item }))} className="max-w-none" />
                  <div className="border border-[#f4e0b0] bg-[#fff8e8] px-3 py-2">This will allow all IP addresses to access your virtual machine. This is only recommended for testing. Use the Advanced controls in the Networking tab to create rules to limit inbound traffic to known IP addresses.</div>
                </div>
              </BladeField>
            ) : null}
          </div>
        ) : null}
        {tab === "Disks" ? (
          <div className="grid gap-4 text-[13px] leading-5">
            <PreviewNote />
            <p>Azure VMs have one operating system disk and a temporary disk for short-term storage. You can attach additional data disks. The size of the VM determines the type of storage you can use and the number of data disks allowed.</p>
            <p className="text-[#605e5c]">There is a charge for the underlying storage resources consumed by your virtual machine.</p>
            <h2 className="text-[16px] font-semibold">VM disk encryption</h2>
            <p>Azure disk storage encryption automatically encrypts your data stored on Azure managed disks (OS and data disks) at rest by default when persisting it to the cloud.</p>
            <BladeField label="Encryption at host">
              <div className="grid gap-1">
                <label className="flex items-center gap-2"><input type="checkbox" checked={hostEnc} onChange={(event) => setHostEnc(event.target.checked)} /> <span className="sr-only">Encryption at host</span></label>
                <p className="text-[#0078d4]">Encryption at host is not registered for the selected subscription.</p>
              </div>
            </BladeField>
            <h2 className="text-[16px] font-semibold">OS disk</h2>
            <BladeField label="OS disk size"><FakeSelect value={osSize} /></BladeField>
            <BladeField label="OS disk type" required>
              <ConsoleSelect theme="azure" label="OS disk type" value={disk} onChange={(value) => { setDisk(value); if (value !== "Image default (30 GiB)") setOsSize("Image default (30 GiB)") }} options={["Premium SSD", "Standard SSD", "Standard HDD"].map((item) => ({ value: item, label: item }))} />
            </BladeField>
            <BladeField label="Delete with VM"><label className="flex items-center gap-2"><input type="checkbox" checked={deleteOs} onChange={(event) => setDeleteOs(event.target.checked)} /> <span className="sr-only">Delete with VM</span></label></BladeField>
            <BladeField label="Enable Ultra Disk capability"><label className="flex items-center gap-2"><input type="checkbox" checked={ultra} onChange={(event) => setUltra(event.target.checked)} /> <span className="sr-only">Enable Ultra Disk capability</span></label></BladeField>
            <BladeField label="Key management"><FakeSelect value="Platform-managed key" /></BladeField>
            <h2 className="text-[16px] font-semibold">Data disks</h2>
            <p>You can add and configure additional data disks for your virtual machine or attach existing disks. This VM also comes with a temporary disk.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px] text-[#605e5c]">
                <thead><tr>{["LUN", "Name", "Size (GiB)", "Disk type", "Host caching", "Delete with VM"].map((heading) => <th key={heading} className="py-1 pr-3 font-semibold">{heading}</th>)}</tr></thead>
                <tbody><tr><td colSpan={6} className="py-3 text-[#a19f9d]">No data disks</td></tr></tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="h-8 rounded-sm border border-[#8a8886] bg-white px-3">Create and attach a new disk</button>
              <button type="button" className="h-8 rounded-sm border border-[#8a8886] bg-white px-3">Attach an existing disk</button>
            </div>
            <h2 className="text-[16px] font-semibold">Advanced</h2>
            <BladeField label="Ephemeral OS disk">
              <div className="grid gap-2">
                {["None", "OS cache placement", "Temp disk placement", "NVMe placement"].map((item) => (
                  <label key={item} className="flex items-start gap-2">
                    <input type="radio" name="ephemeral" className="mt-1" checked={ephemeral === item} disabled={item !== "None"} onChange={() => setEphemeral(item)} />
                    <span>
                      {item}
                      {item === "Temp disk placement" ? <span className="mt-1 block text-[#0078d4]">The selected image is too large for the temp disk of the selected instance.</span> : null}
                      {item === "NVMe placement" ? <span className="mt-1 block text-[#0078d4]">The selected size does not support NVMe ephemeral OS disks.</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </BladeField>
          </div>
        ) : null}
        {tab === "Networking" ? (
          <div className="grid gap-4 text-[13px] leading-5">
            <PreviewNote />
            <p>Define network connectivity for your virtual machine by configuring network interface card (NIC) settings. You can control ports, inbound and outbound connectivity with security group rules, or place behind an existing load balancing solution.</p>
            <h2 className="text-[16px] font-semibold">Virtual network</h2>
            <p>Azure Virtual Network (VNet) enables many types of Azure resources to securely communicate with each other, the internet, and on-premises networks.</p>
            <BladeField label="Virtual network" required>
              <div className="max-w-sm">
                <Input aria-label="Virtual network" value={vnet} onChange={(event) => setVnet(event.target.value)} placeholder="(new) vnet" className="h-8 rounded-sm" />
                {!vnet.trim() ? <p className="mt-1 text-[#a4262c]">The value must not be empty.</p> : null}
              </div>
            </BladeField>
            <BladeField label="Subnet" required>
              <div className="max-w-sm">
                <Input aria-label="Subnet" value={subnet} onChange={(event) => setSubnet(event.target.value)} placeholder="(new) default (10.0.0.0/24)" className="h-8 rounded-sm" />
                {!subnet.trim() ? <p className="mt-1 text-[#a4262c]">The value must not be empty.</p> : null}
              </div>
            </BladeField>
            <h2 className="text-[16px] font-semibold">Network interface</h2>
            <p>A network interface enables an Azure virtual machine to communicate with internet, Azure, and on-premises resources. A VM can have one or more network interfaces.</p>
            <BladeField label="Public IP">
              <div className="max-w-sm">
                <ConsoleSelect label="Public IP" theme="azure" value={publicIp} onChange={setPublicIp} options={["None", `(new) ${name || "vm"}-ip`].map((item) => ({ value: item, label: item }))} className="max-w-none" />
                <button type="button" className="mt-1 text-[#0078d4]" onClick={() => setPublicIp(`(new) ${name || "vm"}-ip`)}>Create new</button>
              </div>
            </BladeField>
            <BladeField label="NIC network security group">
              <div className="grid gap-2">
                {["None", "Basic", "Advanced"].map((item) => (
                  <label key={item} className="flex items-center gap-2"><input type="radio" name="nsg" checked={nsg === item} onChange={() => setNsg(item)} /> {item}</label>
                ))}
              </div>
            </BladeField>
            <BladeField label="Public inbound ports" required>
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="ports2" checked={inbound === "None"} onChange={() => setInbound("None")} /> None</label>
                <label className="flex items-center gap-2"><input type="radio" name="ports2" checked={inbound === "Allow selected ports"} onChange={() => setInbound("Allow selected ports")} /> Allow selected ports</label>
              </div>
            </BladeField>
            <BladeField label="Select inbound ports" required>
              <div className="grid max-w-sm gap-2">
                <ConsoleSelect label="Select inbound ports" theme="azure" value={ports} onChange={setPorts} options={["SSH (22)", "HTTP (80), SSH (22)", "None"].map((item) => ({ value: item, label: item }))} className="max-w-none" />
                {inbound === "Allow selected ports" ? <div className="border border-[#f4e0b0] bg-[#fff8e8] px-3 py-2">This will allow all IP addresses to access your virtual machine. This is only recommended for testing. Use the Advanced controls in the Networking tab to create rules to limit inbound traffic to known IP addresses.</div> : null}
              </div>
            </BladeField>
            <BladeField label="Delete NIC when VM is deleted"><label className="flex items-center gap-2"><input type="checkbox" checked={deleteNic} onChange={(event) => setDeleteNic(event.target.checked)} /> <span className="sr-only">Delete NIC when VM is deleted</span></label></BladeField>
            <BladeField label="Enable accelerated networking"><label className="flex items-center gap-2"><input type="checkbox" checked={accel} onChange={(event) => setAccel(event.target.checked)} /> <span className="sr-only">Enable accelerated networking</span></label></BladeField>
            <h2 className="text-[16px] font-semibold">Load balancing</h2>
            <p>You can place this virtual machine in the backend pool of an existing Azure load balancing solution.</p>
            <BladeField label="Load balancing options">
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="lb" checked={lb === "None"} onChange={() => setLb("None")} /> None</label>
                <label className="flex items-start gap-2"><input type="radio" className="mt-1" name="lb" checked={lb === "Azure load balancer"} onChange={() => setLb("Azure load balancer")} /><span>Azure load balancer<span className="block text-[#605e5c]">Supports all TCP/UDP network traffic, port-forwarding, and outbound flows</span></span></label>
                <label className="flex items-start gap-2"><input type="radio" className="mt-1" name="lb" checked={lb === "Application gateway"} onChange={() => setLb("Application gateway")} /><span>Application gateway<span className="block text-[#605e5c]">Web traffic load balancer for HTTP/HTTPS with URL-based routing, SSL termination, session persistence, and web application firewall.</span></span></label>
              </div>
            </BladeField>
          </div>
        ) : null}
        {tab === "Management" ? (
          <div className="grid gap-4 text-[13px] leading-5">
            <PreviewNote />
            <p>Configure management options for your VM.</p>
            <h2 className="text-[16px] font-semibold">Metadata Security Protocol</h2>
            <p>Metadata Security Protocol is an enhanced security feature that enforces access control to the VM’s critical host endpoints: WireServer and Instance Metadata Service (IMDS).</p>
            {["Metadata Security Protocol for instance", "Metadata Service (IMDS)", "Metadata Security Protocol for WireServer"].map((item) => (
              <label key={item} className="flex items-center gap-2"><input type="checkbox" /> {item}</label>
            ))}
            <h2 className="text-[16px] font-semibold">Identity</h2>
            <label className="flex items-center gap-2"><input type="checkbox" /> Enable system assigned managed identity</label>
            <h2 className="text-[16px] font-semibold">Microsoft Entra ID</h2>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" /><span>Login with Microsoft Entra ID<span className="block text-[#0078d4]">RBAC role assignment of Virtual Machine Administrator Login or Virtual Machine User Login is required when using Microsoft Entra ID login.</span></span></label>
            <div className="border border-[#c7e0f4] bg-[#f3f9fd] px-3 py-2">Microsoft Entra ID login now uses SSH certificate-based authentication. You will need to use an SSH client that supports OpenSSH certificates. You can use Azure CLI or Cloud Shell from the Azure Portal.</div>
            <h2 className="text-[16px] font-semibold">Auto-shutdown</h2>
            <label className="flex items-center gap-2"><input type="checkbox" checked={shutdown} onChange={(event) => setShutdown(event.target.checked)} /> Enable auto-shutdown</label>
            <h2 className="text-[16px] font-semibold">Guest OS updates</h2>
            <label className="flex items-center gap-2"><input type="checkbox" /> Enable periodic assessment</label>
            <BladeField label="Patch orchestration options">
              <div className="max-w-sm">
                <FakeSelect value="Image default" />
                <p className="mt-1 text-[#0078d4]">Some patch orchestration options are not available for this image.</p>
              </div>
            </BladeField>
            <h2 className="text-[16px] font-semibold">Hibernation</h2>
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" disabled /><span>Enable hibernation<span className="block text-[#0078d4]">Hibernate is not currently supported for Trusted launch and Confidential virtual machines for Linux images.</span></span></label>
          </div>
        ) : null}
        {tab === "Monitoring" ? (
          <div className="grid gap-4 text-[13px] leading-5">
            <PreviewNote />
            <p>Configure monitoring options for your VM.</p>
            <h2 className="text-[16px] font-semibold">Alerts</h2>
            <label className="flex items-center gap-2"><input type="checkbox" checked={alertsOn} onChange={(event) => setAlertsOn(event.target.checked)} /> Enable recommended alert rules</label>
            <h2 className="text-[16px] font-semibold">Diagnostics</h2>
            <BladeField label="Boot diagnostics" required>
              <div className="grid gap-2">
                <label className="flex items-center gap-2"><input type="radio" name="boot" checked={bootChoice === "managed"} onChange={() => setBootChoice("managed")} /> Enable with managed storage account (recommended)</label>
                <label className="flex items-center gap-2"><input type="radio" name="boot" checked={bootChoice === "custom"} onChange={() => setBootChoice("custom")} /> Enable with custom storage account</label>
                <label className="flex items-center gap-2"><input type="radio" name="boot" checked={bootChoice === "off"} onChange={() => setBootChoice("off")} /> Disabled</label>
                {bootChoice === "managed" ? <div className="border border-[#c7e0f4] bg-[#f3f9fd] px-3 py-2">There is a nominal charge for the managed storage account.</div> : null}
              </div>
            </BladeField>
            <label className="flex items-center gap-2"><input type="checkbox" checked={guestDiag} onChange={(event) => setGuestDiag(event.target.checked)} /> Enable OS guest diagnostics</label>
            <h2 className="text-[16px] font-semibold">Health</h2>
            <label className="flex items-center gap-2"><input type="checkbox" checked={healthOn} onChange={(event) => setHealthOn(event.target.checked)} /> Enable application health monitoring</label>
          </div>
        ) : null}
        {tab === "Advanced" ? (
          <div className="grid gap-4 text-[13px] leading-5">
            <PreviewNote />
            <p>Add additional configuration, agents, scripts, or applications via virtual machine extensions or cloud-init.</p>
            <h2 className="text-[16px] font-semibold">Extensions</h2>
            <p>Extensions provide post-deployment configuration and automation.</p>
            <BladeField label="Extensions"><button type="button" className="h-8 rounded-sm border border-[#8a8886] bg-white px-3">Select an extension to install</button></BladeField>
            <h2 className="text-[16px] font-semibold">VM Applications</h2>
            <p>VM applications contain application files that are securely and reliably downloaded on your VM after deployment. In addition to the application files, install and uninstall scripts are included in the application.</p>
            <button type="button" className="h-8 w-fit rounded-sm border border-[#8a8886] bg-white px-3">Select a VM application to install</button>
            <h2 className="text-[16px] font-semibold">Custom data and cloud init</h2>
            <p>Pass a cloud-init script, configuration file, or other data into the virtual machine while it is being provisioned. The data will be saved on the VM in a known location.</p>
            <BladeField label="Custom data">
              <div className="max-w-lg">
                <textarea aria-label="Custom data" value={customData} onChange={(event) => setCustomData(event.target.value)} className="h-28 w-full rounded-sm border border-[#8a8886] p-2" />
                <p className="mt-1 text-[#0078d4]">Custom data on the selected image will be processed by cloud-init.</p>
              </div>
            </BladeField>
            <h2 className="text-[16px] font-semibold">Performance</h2>
            <p>Enable capabilities to enhance the performance of your resources.</p>
          </div>
        ) : null}
        {tab === "Tags" ? (
          <div className="grid gap-4 text-[13px]">
            <PreviewNote />
            <p>Tags are name/value pairs that enable you to categorize resources and view consolidated billing by applying the same tag to multiple resources and resource groups.</p>
            <p className="text-[#605e5c]">Note that if you create tags and then change resource settings on other tabs, your tags will be automatically updated.</p>
            <div className="grid max-w-3xl gap-3 sm:grid-cols-[1fr_1fr_180px]">
              <label className="grid gap-1.5">Name
                <Input aria-label="Tag name" value={tagName} onChange={(event) => setTagName(event.target.value)} className="h-8 rounded-sm" />
              </label>
              <label className="grid gap-1.5">Value
                <Input aria-label="Tag value" value={tagValue} onChange={(event) => setTagValue(event.target.value)} className="h-8 rounded-sm" />
              </label>
              <label className="grid gap-1.5">Resource
                <FakeSelect value="All resources selected" />
              </label>
            </div>
          </div>
        ) : null}
        {tab === "Review + create" ? (
          <div className="grid gap-4 text-[13px] leading-5">
            {valid ? (
              <div className="flex items-center gap-2 bg-[#dff6dd] px-3 py-2 font-semibold text-[#0e700e]">
                <span className="grid size-4 place-items-center rounded-full bg-[#107c10] text-[11px] text-white" aria-hidden>✓</span>
                Validation passed
              </div>
            ) : (
              <div className="bg-[#fde7e9] px-3 py-2 text-[#a4262c]">Validation failed. Required information is missing or not valid.</div>
            )}
            <h2 className="text-[16px] font-semibold">Price</h2>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edebe9] pb-3">
              <p>1 X {size.id}<br /><span className="text-[#605e5c]">by Microsoft</span><br /><span className="text-[#0078d4]">Terms of use | Privacy policy</span></p>
              <p className="text-right"><span className="text-[#605e5c]">Subscription credits apply</span><br /><span className="font-semibold">{size.hourlyUsd.toFixed(4)} USD/hr</span></p>
            </div>
            <p className="text-[12px] leading-5 text-[#605e5c]">By clicking “Create”, I (a) agree to the legal terms and privacy statements associated with the Marketplace offering listed above; (b) authorize Microsoft to bill my current payment method for the fees associated with the offering, with the same billing frequency as my Azure subscription; and (c) agree that Microsoft may share my contact, usage and transactional information with the provider of the offering for support, billing and other transactional activities.</p>
            <div className="grid max-w-xl gap-2">
              <label className="grid gap-1">Name<Input readOnly value={email.split("@")[0] ?? "Talal"} className="h-8 rounded-sm bg-[#f3f2f1]" /></label>
              <label className="grid gap-1">Preferred e-mail address<Input readOnly value={email} className="h-8 rounded-sm bg-[#f3f2f1]" /></label>
              <label className="grid gap-1">Preferred phone number<Input readOnly value="" className="h-8 rounded-sm" /></label>
            </div>
            {inbound === "Allow selected ports" ? <div className="border border-[#f4e0b0] bg-[#fff8e8] px-3 py-2">You have set SSH port(s) open to the internet. This is only recommended for testing. If you want to change this setting, go back to Basics tab.</div> : null}
            <h2 className="text-[16px] font-semibold">Basics</h2>
            <dl className="grid max-w-xl gap-y-1">
              {[
                ["Subscription", "Subscription 1"],
                ["Resource group", group || "None"],
                ["Virtual machine name", name || "None"],
                ["Region", locationLabel(location)],
                ["Availability options", "Availability zone"],
                ["Availability zone", "1"],
                ["Security type", "Trusted launch virtual machines"],
                ["Image", image?.label ?? imageId],
                ["Size", sizeId],
                ["Username", username],
                ["Authentication type", `SSH public key (${keyType})`],
                ["Public inbound ports", inbound === "None" ? "None" : ports],
                ["Virtual network", vnet || "None"],
                ["Subnet", subnet || "None"],
                ["OS disk type", disk],
                ["Boot diagnostics", bootChoice === "off" ? "Disabled" : "Enabled"],
                ["Tags", tagName ? `${tagName} : ${tagValue}` : "None"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[200px_1fr] gap-3 border-b border-[#f3f2f1] py-1"><dt className="text-[#605e5c]">{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <button type="button" className="w-fit text-[#0078d4] hover:underline">Download a template for automation</button>
          </div>
        ) : null}
        {error ? <p role="alert" className="border border-[#a4262c] bg-[#fdf6f6] px-3 py-2 text-[13px] text-[#a4262c]">{error}</p> : null}
        </div>
        <CostRail monthly={monthly} diskMonthly={diskMonthly} sizeId={size.id} image={image?.label ?? imageId} disk={disk} />
        <Dialog open={phase === "key"} onOpenChange={(open) => !open && setPhase("form")}>
          <DialogContent className="rounded-[2px] bg-white text-[#323130] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate new key pair</DialogTitle>
              <DialogDescription>Download the private key and create the virtual machine.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button type="button" className={PRIMARY} onClick={() => {
                const pair = keyName || "myKey"
                const outcome = dispatch({ type: "azure/key", name: pair })
                if (outcome.error) { setError(outcome.error); setPhase("form"); return }
                if (!keyName) setKeyName(pair)
                downloadPem(pair)
                beginDeploy(pair)
              }}>Download private key and create resource</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#edebe9] bg-white px-6 py-3">
        <button type="button" disabled={tab === "Basics"} className="h-8 rounded-sm border border-[#8a8886] bg-white px-4 text-[13px] disabled:text-[#a19f9d]" onClick={() => setTab(TABS[Math.max(0, TABS.indexOf(tab) - 1)] ?? "Basics")}>Previous</button>
        <button type="button" disabled={tab === "Review + create"} className="h-8 rounded-sm border border-[#8a8886] bg-white px-4 text-[13px] disabled:text-[#a19f9d]" onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.indexOf(tab) + 1)] ?? "Review + create")}>Next</button>
        <button type="button" disabled={tab === "Review + create" && !valid} className={PRIMARY} onClick={() => tab === "Review + create" ? launch() : setTab("Review + create")}>{tab === "Review + create" ? "Create" : "Review + create"}</button>
        <button type="button" className="ml-auto text-[13px] text-[#0078d4]">Give feedback</button>
      </div>
    </div>
  )
}

function ServiceBlade({ title }: { title: string }) {
  const [query, setQuery] = useState("")
  const noun = title === "All services" ? "services" : title.toLowerCase()
  return (
    <div>
      <div className="border-b border-[#edebe9] px-6 py-3 text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> <span className="text-[#323130]">{title}</span></div>
      <h1 className="px-6 pt-4 text-[28px] font-semibold">{title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-y border-[#edebe9] bg-[#faf9f8] px-4 py-1">
        <button type="button" className={COMMAND}><span className="text-[#0078d4]">+</span> Create</button>
        <button type="button" className={COMMAND}>Refresh</button>
        <input aria-label={`Filter ${noun}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter" className="ml-auto h-8 w-full max-w-xs rounded-sm border border-[#8a8886] bg-white px-2 text-[13px]" />
      </div>
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-[#edebe9] text-[#605e5c]"><tr>{["Name", "Type", "Resource group", "Location"].map((heading) => <th key={heading} className="px-6 py-2 font-semibold">{heading}</th>)}</tr></thead>
        <tbody>
          <tr><td colSpan={4} className="px-6 py-16 text-center text-[#605e5c]">{query.trim() ? `No ${noun} match “${query.trim()}”` : `No ${noun} to display`}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

function Groups({ onDelete }: { onDelete: (name: string) => void }) {
  const azure = useLabState().azure
  const [name, setName] = useState("")
  const [location, setLocation] = useState(azure.location)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<"form" | "deploy" | "done">("form")
  const [error, setError] = useState<string | null>(null)
  if (phase === "deploy" || phase === "done") {
    return (
      <div className="p-6">
        <h1 className="text-[24px] font-semibold">{phase === "done" ? "Your deployment is complete" : "Deployment is in progress"}</h1>
        <p className="mt-2 text-[13px] text-[#605e5c]">Resource group {name}</p>
        {phase === "done" ? <button type="button" className={cn(PRIMARY, "mt-4")} onClick={() => { setPhase("form"); setOpen(false) }}>Go to resource</button> : null}
      </div>
    )
  }
  return (
    <div>
      <div className="border-b border-[#edebe9] px-6 py-3 text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> <span className="text-[#323130]">Resource groups</span></div>
      <h1 className="px-6 pt-4 text-[28px] font-semibold">Resource groups</h1>
      <div className="mt-3 flex border-y border-[#edebe9] bg-[#faf9f8] px-4 py-1">
        <button type="button" className={COMMAND} onClick={() => setOpen((value) => !value)}><span className="text-[#0078d4]">+</span> Create</button>
      </div>
      {open ? (
        <form
          className="mx-6 mt-4 grid max-w-lg gap-3 border border-[#edebe9] bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault()
            const outcome = dispatch({ type: "azure/group", name, location })
            if (outcome.error) setError(outcome.error)
            else {
              setError(null)
              setPhase("deploy")
              window.dispatchEvent(new CustomEvent("skybench-note", { detail: { title: "Deployment started", body: name } }))
              window.setTimeout(() => {
                setPhase("done")
                window.dispatchEvent(new CustomEvent("skybench-note", { detail: { title: "Deployment succeeded", body: name } }))
              }, 1200)
            }
          }}
        >
          <h2 className="text-[16px] font-semibold">Create a resource group</h2>
          <BladeField label="Subscription"><FakeSelect value="Azure subscription 1" /></BladeField>
          <BladeField label="Resource group"><Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 rounded-sm" /></BladeField>
          <BladeField label="Region">
            <ConsoleSelect id="group-location" label="Region" theme="azure" value={location} onChange={setLocation} options={AZURE_LOCATIONS.map((item) => ({ value: item.id, label: item.label }))} />
          </BladeField>
          <button type="submit" className={cn(PRIMARY, "w-fit")}>Review + create</button>
        </form>
      ) : null}
      {error ? <p role="alert" className="px-6 pt-2 text-[13px] text-[#a4262c]">{error}</p> : null}
      <div className="px-6 py-4">
        {azure.resourceGroups.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-[#605e5c]">No resource groups to display</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#edebe9] text-[#605e5c]"><tr>{["Name", "Subscription", "Location", ""].map((heading) => <th key={heading || "x"} className="py-2 font-semibold">{heading}</th>)}</tr></thead>
            <tbody>
              {azure.resourceGroups.map((group) => (
                <tr key={group.name} className="border-b border-[#f3f2f1]">
                  <td className="py-2 text-[#0078d4]">{group.name}</td>
                  <td className="py-2">Azure subscription 1</td>
                  <td className="py-2">{locationLabel(group.location)}</td>
                  <td className="py-2 text-right"><button type="button" className="text-[#a4262c] hover:underline" onClick={() => onDelete(group.name)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function BladeField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-1.5 text-[13px] sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-6">
      <span className="pt-1.5 text-[#323130]">{label}{required ? <span className="text-[#a4262c]"> *</span> : null}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function FakeSelect({ value }: { value: string }) {
  return <div className="flex h-8 max-w-sm items-center rounded-sm border border-[#8a8886] bg-[#f3f2f1] px-2 text-[13px]">{value}</div>
}

function locationLabel(id: string) {
  return AZURE_LOCATIONS.find((item) => item.id === id)?.label ?? id
}

function PreviewNote() {
  return (
    <div className="flex gap-2 border border-[#c7e0f4] bg-[#f3f9fd] px-3 py-2 text-[13px] leading-5">
      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-[#0078d4] text-[11px] text-[#0078d4]">i</span>
      <p>This is a preview of a new Create-VM experience. Features are limited in this experience and all feedback is appreciated. <span className="text-[#0078d4]">Click here to access the previous experience.</span></p>
    </div>
  )
}

function CostRail({ monthly, diskMonthly, sizeId, image, disk }: { monthly: number; diskMonthly: number; sizeId: string; image: string; disk: string }) {
  const total = monthly + diskMonthly
  const rows = [
    ["Basics", monthly, [[ "Virtual machine", monthly], ["Image", 0], ["Size", monthly, sizeId]]],
    ["Disks", diskMonthly, [["OS disk", diskMonthly, `${disk}, 32 GiB`]]],
    ["Networking", 0, []],
    ["Management", 0, []],
    ["Monitoring", 0, []],
    ["Advanced", 0, []],
  ] as const
  return (
    <aside className="border-t border-[#edebe9] bg-white lg:sticky lg:top-0 lg:border-t-0 lg:border-l">
      <div className="border-b border-[#edebe9] px-4 py-3">
        <h2 className="text-[16px] font-semibold">Estimated monthly costs</h2>
        <p className="mt-2 text-[12px] leading-5 text-[#605e5c]">Costs indicated here are estimates only. Pricing may vary depending on your Microsoft agreement, date of purchase, subscription type, usage costs, licensing and currency exchange rates.</p>
      </div>
      <div className="px-4 py-2 text-[13px]">
        {rows.map(([title, amount, lines]) => (
          <details key={title} open={title === "Basics" || amount > 0} className="border-b border-[#f3f2f1] py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
              <span>› {title}</span>
              <span>{usd(amount)}</span>
            </summary>
            <div className="mt-2 grid gap-2 pl-4 text-[12px] text-[#605e5c]">
              {lines.map(([label, value, note]) => (
                <div key={label}>
                  <div className="flex justify-between text-[#323130]"><span>{label}</span><span>{usd(value)}</span></div>
                  {note ? <p>{note}</p> : null}
                  {label === "Image" ? <p>{image}</p> : null}
                </div>
              ))}
              {lines.length === 0 ? <p>No items added</p> : null}
            </div>
          </details>
        ))}
        <div className="flex items-center justify-between py-3 font-semibold">
          <span>Estimated monthly cost</span>
          <span>{usd(total)}</span>
        </div>
      </div>
    </aside>
  )
}

function CubeMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 text-[#c8c6c4]" aria-hidden>
      <path d="M24 6 40 15v18L24 42 8 33V15Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M24 24 40 15M24 24 8 15M24 24v18" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function EmptyVm() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-24 text-[#c8c6c4]" aria-hidden>
      <rect x="8" y="8" width="80" height="48" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M36 64h24M48 56v8" stroke="currentColor" strokeWidth="2" />
      <path d="M48 20 58 26v12L48 44 38 38V26Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function NavLink({ label, tone, onClick }: { label: string; tone: "gold" | "blue" | "green" | "teal"; onClick?: () => void }) {
  const color = tone === "gold" ? "#c19c00" : tone === "green" ? "#107c10" : tone === "teal" ? "#038387" : "#0078d4"
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 text-left text-[14px] hover:underline">
      <span className="grid size-8 place-items-center rounded-sm" style={{ color }} aria-hidden>
        {tone === "gold" ? "🔑" : tone === "green" ? "▦" : tone === "teal" ? "▣" : "▤"}
      </span>
      {label}
    </button>
  )
}

function Tool({ title, body, tone }: { title: string; body: string; tone: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[16px]" style={{ color: tone }} aria-hidden>●</span>
      <div>
        <p className="text-[14px] font-semibold text-[#0078d4]">{title}</p>
        <p className="text-[12px] leading-4 text-[#605e5c]">{body}</p>
      </div>
    </div>
  )
}

function ServiceGlyph({ kind }: { kind: string }) {
  if (kind === "plus") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="4" y="4" width="24" height="24" rx="2" fill="#0078d4" />
        <path d="M16 9v14M9 16h14" stroke="white" strokeWidth="2" />
      </svg>
    )
  }
  if (kind === "vm") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="4" y="7" width="24" height="15" rx="1.5" fill="none" stroke="#0078d4" strokeWidth="1.6" />
        <path d="M12 26h8M16 22v4" stroke="#0078d4" strokeWidth="1.6" />
      </svg>
    )
  }
  if (kind === "app") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="6" y="6" width="20" height="20" rx="3" fill="#0078d4" />
        <path d="M11 17c2-4 8-4 10 0" fill="none" stroke="white" strokeWidth="1.6" />
        <circle cx="16" cy="14" r="2" fill="white" />
      </svg>
    )
  }
  if (kind === "rocket") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path d="M18 6c4 2 7 8 7 13l-5-2-4 6-2-5-6-2c4-1 7-6 10-10Z" fill="#ff8c00" />
        <path d="M10 22c2 2 3 4 2 6-2-1-4-2-6-2 1-2 2-3 4-4Z" fill="#f2c811" />
      </svg>
    )
  }
  if (kind === "foundry") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path d="M8 22 16 6l8 16H8Z" fill="#5c2d91" />
        <path d="M12 22h8l-4 5-4-5Z" fill="#8764b8" />
      </svg>
    )
  }
  if (kind === "fn") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x="6" y="6" width="20" height="20" rx="3" fill="#f2c811" />
        <path d="M18 8 12 17h6l-2 7 8-11h-6l2-5Z" fill="#323130" />
      </svg>
    )
  }
  if (kind === "sql") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <ellipse cx="16" cy="9" rx="8" ry="3" fill="none" stroke="#0078d4" strokeWidth="1.6" />
        <path d="M8 9v14c0 1.7 3.6 3 8 3s8-1.3 8-3V9" fill="none" stroke="#0078d4" strokeWidth="1.6" />
        <path d="M8 15c0 1.7 3.6 3 8 3s8-1.3 8-3" fill="none" stroke="#0078d4" strokeWidth="1.6" />
      </svg>
    )
  }
  if (kind === "cosmos") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="3" fill="#0078d4" />
        <path d="M16 5c4 4 6 7 6 11s-2 7-6 11c-4-4-6-7-6-11s2-7 6-11Z" fill="none" stroke="#50e6ff" strokeWidth="1.4" />
      </svg>
    )
  }
  if (kind === "disk") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <ellipse cx="16" cy="10" rx="8" ry="3" fill="none" stroke="#107c10" strokeWidth="1.6" />
        <path d="M8 10v12c0 1.7 3.6 3 8 3s8-1.3 8-3V10" fill="none" stroke="#107c10" strokeWidth="1.6" />
      </svg>
    )
  }
  if (kind === "k8s") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="3" fill="none" stroke="#326ce5" strokeWidth="1.5" />
        <path d="M16 6v4M16 22v4M6 16h4M22 16h4M9 9l3 3M20 20l3 3M23 9l-3 3M12 20l-3 3" stroke="#326ce5" strokeWidth="1.4" />
      </svg>
    )
  }
  if (kind === "net") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="8" cy="16" r="2.2" fill="#0078d4" />
        <circle cx="24" cy="8" r="2.2" fill="#0078d4" />
        <circle cx="24" cy="24" r="2.2" fill="#0078d4" />
        <path d="M10 15 22 9M10 17l12 6" stroke="#0078d4" strokeWidth="1.4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <path d="M8 16h12M16 10l6 6-6 6" fill="none" stroke="#0078d4" strokeWidth="1.8" />
    </svg>
  )
}
