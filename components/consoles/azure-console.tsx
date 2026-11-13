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
            <label className="grid gap-1 text-[13px]">Type the resource group name
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
      <div className="flex flex-wrap items-center gap-2 bg-[#001b33] px-3 py-2 text-[13px]">
        <span>Azure Cloud Shell</span>
        {step === "ready" ? <button type="button" className="rounded bg-white/10 px-2 py-1" onClick={() => setShell(shell === "Bash" ? "PowerShell" : "Bash")}>{shell === "Bash" ? "Switch to PowerShell" : "Switch to Bash"}</button> : null}
        <span className="text-white/70">Restart · Settings · Editor · New session</span>
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
  { label: "App Service", id: "appservice", glyph: "app" },
  { label: "Function App", id: "functions", glyph: "fn" },
  { label: "SQL databases", id: "sql", glyph: "sql" },
  { label: "Azure Cosmos DB", id: "cosmos", glyph: "cosmos" },
  { label: "Storage accounts", id: "storage", glyph: "disk" },
  { label: "Kubernetes services", id: "aks", glyph: "k8s" },
  { label: "Virtual networks", id: "vnet", glyph: "net" },
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
  return (
    <div className="bg-white px-6 py-5">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold">Azure services</h2>
          {continueLabel && onContinue ? <button type="button" className={PRIMARY} onClick={onContinue}>{continueLabel}</button> : null}
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-2">
          {SERVICES.map((service) => (
            <button key={service.label} type="button" onClick={() => onOpen(service.id)} className="grid w-[92px] shrink-0 justify-items-center gap-2 px-1 text-center text-[12px] leading-4 text-[#0078d4] hover:underline">
              <ServiceGlyph kind={service.glyph} />
              {service.label}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold">Resources</h2>
          <span className="text-[12px] text-[#605e5c]">Subscription: Azure subscription 1</span>
        </div>
        <div className="mt-3 flex gap-4 border-b border-[#edebe9] text-[13px]">
          <span className="border-b-2 border-[#0078d4] pb-2 font-semibold text-[#0078d4]">Recent</span>
          <span className="pb-2 text-[#605e5c]">Favorite</span>
        </div>
        <table className="mt-1 w-full text-left text-[13px]">
          <thead className="text-[#605e5c]">
            <tr>
              <th className="py-2 font-semibold">Name</th>
              <th className="py-2 font-semibold">Type</th>
              <th className="py-2 font-semibold">Resource group</th>
              <th className="py-2 font-semibold">Location</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-[#605e5c]">
                  <span className="mx-auto mb-3 grid size-16 place-items-center rounded-sm border border-[#edebe9] text-[#c8c6c4]">
                    <ServiceGlyph kind="vm" />
                  </span>
                  No resources to display
                </td>
              </tr>
            ) : (
              visible.map((vm) => (
                <tr key={vm.id} className="border-t border-[#edebe9]">
                  <td className="py-2 text-[#0078d4]">{vm.name}</td>
                  <td className="py-2">Virtual machine</td>
                  <td className="py-2">{vm.resourceGroup}</td>
                  <td className="py-2">{locationLabel(vm.region)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <button type="button" onClick={() => onOpen("vms")} className="mt-3 text-[13px] text-[#0078d4] hover:underline">View all resources</button>
        <p className="sr-only">{account}</p>
      </section>
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
  const visible = vms.filter((vm) => vm.state !== "terminated" && `${vm.name} ${vm.resourceGroup ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()))
  return (
    <div>
      <div className="border-b border-[#edebe9] px-6 py-3 text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> <span className="text-[#323130]">Virtual machines</span></div>
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-4">
        <h1 className="text-[28px] font-semibold">Virtual machines</h1>
        <span className="text-[12px] text-[#605e5c]">Subscription equals all</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1 border-y border-[#edebe9] bg-[#faf9f8] px-4 py-1">
        <button type="button" className={COMMAND} onClick={onCreate}><span className="text-[#0078d4]">+</span> Create</button>
        <button type="button" className={COMMAND}>Refresh</button>
        <button type="button" className={COMMAND}>Export to CSV</button>
        <button type="button" className={COMMAND}>Open query</button>
      </div>
      <div className="px-6 py-3">
        <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter for any field..." className="h-8 w-full max-w-sm rounded-sm border border-[#8a8886] px-2 text-[13px] outline-none focus:border-[#0078d4]" />
        <div className="mt-3 overflow-x-auto">
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
                <tr><td colSpan={8} className="px-2 py-12 text-center text-[#605e5c]">No virtual machines to display</td></tr>
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
  const [disk, setDisk] = useState("Premium SSD (locally-redundant storage)")
  const [boot, setBoot] = useState("Enable with managed storage account (recommended)")
  const [shutdown, setShutdown] = useState(false)
  const [tagName, setTagName] = useState("")
  const [tagValue, setTagValue] = useState("")

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
      <div className="bg-white px-6 py-5">
        <h1 className="text-[24px] font-semibold">{name}</h1>
        <h2 className="mt-4 text-[16px] font-semibold">Essentials</h2>
        <dl className="mt-3 grid max-w-3xl gap-3 text-[14px] sm:grid-cols-2">
          <div><dt className="text-[#605e5c]">Resource group</dt><dd>{group}</dd></div>
          <div><dt className="text-[#605e5c]">Status</dt><dd><StateBadge state={vm?.state ?? "pending"} provider="azure" /></dd></div>
          <div><dt className="text-[#605e5c]">Location</dt><dd>{location}</dd></div>
          <div><dt className="text-[#605e5c]">Size</dt><dd>{sizeId}</dd></div>
          <div><dt className="text-[#605e5c]">Public IP address</dt><dd className="font-mono">{vm?.publicIp ?? "Assigning…"}</dd></div>
          <div><dt className="text-[#605e5c]">Subscription</dt><dd>Azure subscription 1</dd></div>
        </dl>
        <button type="button" className="mt-4 text-[13px] text-[#0078d4] hover:underline" onClick={onDone}>Back to virtual machines</button>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-[#faf9f8]">
      <div className="border-b border-[#edebe9] bg-white px-6 py-3 text-[12px] text-[#605e5c]">Home <span className="px-1">›</span> Create a resource <span className="px-1">›</span> <span className="text-[#323130]">Virtual machine</span></div>
      <div className="bg-white px-6 pt-4">
        <h1 className="text-[24px] font-semibold">Create a virtual machine</h1>
        <div className="mt-3 flex gap-1 overflow-x-auto border-b border-[#edebe9] text-[13px]">
          {TABS.map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={cn("shrink-0 border-b-2 px-3 py-2", tab === item ? "border-[#0078d4] font-semibold text-[#0078d4]" : "border-transparent text-[#323130] hover:bg-[#f3f2f1]")}>{item}</button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 content-start gap-4 px-6 py-5">
        {tab === "Basics" ? (
          <div className="grid max-w-3xl gap-4">
            <h2 className="text-[16px] font-semibold">Project details</h2>
            <BladeField label="Subscription" required><FakeSelect value="Azure subscription 1" /></BladeField>
            <BladeField label="Resource group" required>
              {azure.resourceGroups.length > 0 && !makingGroup ? (
                <div className="flex flex-wrap items-center gap-3">
                  <ConsoleSelect id="az-existing-group" label="Resource group" theme="azure" value={group} onChange={setGroup} options={azure.resourceGroups.map((item) => ({ value: item.name, label: item.name }))} className="min-w-64" />
                  <button type="button" className="text-[13px] text-[#0078d4] hover:underline" onClick={() => setMakingGroup(true)}>Create new</button>
                </div>
              ) : (
                <div className="grid gap-2 rounded-sm border border-[#edebe9] bg-white p-3">
                  <p className="text-[13px] font-semibold">Create new resource group</p>
                  <Input id="az-group" value={group} onChange={(event) => setGroup(event.target.value)} className="h-8 max-w-sm rounded-sm" />
                  <ConsoleSelect id="az-location" label="Region" theme="azure" value={location} onChange={setLocation} options={AZURE_LOCATIONS.map((item) => ({ value: item.id, label: item.label }))} />
                  <div className="flex gap-2">
                    <button type="button" className={PRIMARY} onClick={createGroup}>OK</button>
                    {azure.resourceGroups.length > 0 ? <button type="button" className="h-8 px-3 text-[13px]" onClick={() => setMakingGroup(false)}>Cancel</button> : null}
                  </div>
                </div>
              )}
            </BladeField>
            <h2 className="border-t border-[#edebe9] pt-3 text-[16px] font-semibold">Instance details</h2>
            <BladeField label="Virtual machine name" required><Input id="az-vm-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 max-w-md rounded-[2px]" /></BladeField>
            <BladeField label="Region" required>
              <ConsoleSelect label="Region" theme="azure" value={location} onChange={setLocation} options={AZURE_LOCATIONS.map((item) => ({ value: item.id, label: item.label }))} />
            </BladeField>
            <BladeField label="Availability options"><FakeSelect value="No infrastructure redundancy required" /></BladeField>
            <BladeField label="Security type"><FakeSelect value="Standard" /></BladeField>
            <BladeField label="Image" required>
              <div className="max-w-lg">
                <ConsoleSelect id="az-image" label="Image" theme="azure" value={imageId} onChange={setImageId} options={AZURE_IMAGES.map((item) => ({ value: item.id, label: item.label }))} className="max-w-none" />
                <button type="button" className="mt-1 text-left text-[13px] text-[#0078d4] hover:underline" onClick={() => setImagesOpen((open) => !open)}>See all images</button>
                {imagesOpen ? (
                  <ul className="mt-2 border border-[#edebe9] bg-white">
                    {AZURE_IMAGES.map((item) => (
                      <li key={item.id}>
                        <button type="button" className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f3f2f1]" onClick={() => { setImageId(item.id); setImagesOpen(false) }}>{item.label}</button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </BladeField>
            <BladeField label="Size" required>
              <div className="max-w-lg">
                <ConsoleSelect id="az-size" label="Size" theme="azure" value={sizeId} onChange={setSizeId} options={AZURE_SIZES.map((item) => ({ value: item.id, label: `${item.id} - ${item.vcpu} vcpu, ${item.ram} memory` }))} className="max-w-none" />
                <button type="button" className="mt-1 text-left text-[13px] text-[#0078d4] hover:underline" onClick={() => setSizesOpen((open) => !open)}>See all sizes</button>
                {sizesOpen ? (
                  <div className="mt-2 border border-[#edebe9] bg-white p-3">
                    <p className="text-[14px] font-semibold">Select a VM size</p>
                    <input aria-label="Filter sizes" value={sizeQuery} onChange={(event) => setSizeQuery(event.target.value)} placeholder="Filter" className="mt-2 h-8 w-full rounded-sm border border-[#8a8886] px-2 text-[13px]" />
                    <ul className="mt-2">
                      {AZURE_SIZES.filter((item) => `${item.id} ${item.ram}`.toLowerCase().includes(sizeQuery.trim().toLowerCase())).map((item) => (
                        <li key={item.id}>
                          <button type="button" className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f3f2f1]" onClick={() => { setSizeId(item.id); setSizesOpen(false) }}>{item.id} - {item.vcpu} vcpu, {item.ram} memory</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </BladeField>
            <div className="border-t border-[#edebe9] pt-3">
              <h2 className="text-[16px] font-semibold">Administrator account</h2>
              <div className="mt-3 grid gap-3">
                <BladeField label="Authentication type">
                  <div className="flex gap-4 text-[13px]">
                    <label className="flex items-center gap-2"><input type="radio" checked readOnly /> SSH public key</label>
                    <label className="flex items-center gap-2 text-[#a19f9d]"><input type="radio" disabled /> Password</label>
                  </div>
                </BladeField>
                <BladeField label="Username" required><Input id="az-user" value={username} onChange={(event) => setUsername(event.target.value)} className="h-8 max-w-md rounded-[2px]" /></BladeField>
                <BladeField label="SSH public key source"><FakeSelect value="Generate new key pair" /></BladeField>
                <BladeField label="Key pair name" required>
                  <div className="flex flex-wrap gap-2">
                    <Input aria-label="SSH key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-8 max-w-sm rounded-sm" />
                    <button type="button" className="h-8 rounded-sm border border-[#8a8886] bg-white px-3 text-[13px]" onClick={() => {
                      const outcome = dispatch({ type: "azure/key", name: keyName })
                      if (outcome.error) setError(outcome.error)
                      else { setError(null); flash(outcome.message ?? "SSH key created.") }
                    }}>Create SSH key</button>
                    {azure.keyPairs.some((key) => key.name === keyName) ? <button type="button" className="h-8 px-2 text-[13px] text-[#0078d4]" onClick={() => downloadPem(keyName)}>Download</button> : null}
                  </div>
                </BladeField>
              </div>
            </div>
            <div className="border-t border-[#edebe9] pt-3">
              <h2 className="text-[16px] font-semibold">Inbound port rules</h2>
              <div className="mt-3 grid gap-3">
                <BladeField label="Public inbound ports">
                  <label className="flex items-center gap-2 text-[13px]"><input type="radio" checked readOnly /> Allow selected ports</label>
                </BladeField>
                <BladeField label="Select inbound ports">
                  <ConsoleSelect label="Select inbound ports" theme="azure" value={ports} onChange={setPorts} options={["SSH (22)", "HTTP (80), SSH (22)", "None"].map((item) => ({ value: item, label: item }))} />
                </BladeField>
              </div>
            </div>
          </div>
        ) : null}
        {tab === "Disks" ? (
          <div className="grid max-w-xl gap-3">
            <BladeField label="OS disk type"><ConsoleSelect theme="azure" label="OS disk type" value={disk} onChange={setDisk} options={["Premium SSD (locally-redundant storage)", "Standard SSD", "Standard HDD"].map((item) => ({ value: item, label: item }))} /></BladeField>
            <BladeField label="Encryption type"><FakeSelect value="(Default) Encryption at-rest with a platform-managed key" /></BladeField>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" defaultChecked /> Delete with VM</label>
          </div>
        ) : null}
        {tab === "Networking" ? (
          <div className="grid max-w-xl gap-3">
            <BladeField label="Virtual network"><FakeSelect value={`(new) ${name || "vm"}-vnet`} /></BladeField>
            <BladeField label="Subnet"><FakeSelect value="default (10.0.0.0/24)" /></BladeField>
            <BladeField label="Public IP"><FakeSelect value={`(new) ${name || "vm"}-ip`} /></BladeField>
            <BladeField label="NIC network security group"><FakeSelect value="Basic" /></BladeField>
            <p className="text-[13px]">Public inbound ports: {ports}</p>
          </div>
        ) : null}
        {tab === "Management" ? (
          <div className="grid max-w-xl gap-3">
            <BladeField label="Boot diagnostics"><ConsoleSelect theme="azure" label="Boot diagnostics" value={boot} onChange={setBoot} options={["Enable with managed storage account (recommended)", "Disable"].map((item) => ({ value: item, label: item }))} /></BladeField>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={shutdown} onChange={(event) => setShutdown(event.target.checked)} /> Enable auto-shutdown</label>
          </div>
        ) : null}
        {tab === "Monitoring" ? (
          <div className="grid max-w-xl gap-3 text-[13px]">
            <label className="flex items-center gap-2"><input type="checkbox" /> Enable recommended alert rules</label>
            <p>Boot diagnostics: {boot}</p>
          </div>
        ) : null}
        {tab === "Advanced" ? (
          <div className="grid max-w-xl gap-3">
            <BladeField label="Extensions"><FakeSelect value="None" /></BladeField>
            <BladeField label="VM generation"><FakeSelect value="Gen 2" /></BladeField>
            <BladeField label="Custom data"><Input aria-label="Custom data" className="h-8 rounded-[2px]" /></BladeField>
          </div>
        ) : null}
        {tab === "Tags" ? (
          <div className="flex max-w-xl flex-wrap gap-2">
            <Input aria-label="Tag name" value={tagName} onChange={(event) => setTagName(event.target.value)} placeholder="Name" className="h-8 max-w-48 rounded-[2px]" />
            <Input aria-label="Tag value" value={tagValue} onChange={(event) => setTagValue(event.target.value)} placeholder="Value" className="h-8 max-w-48 rounded-[2px]" />
          </div>
        ) : null}
        {tab === "Review + create" ? (
          <div className="max-w-3xl bg-white p-4">
            <div className="flex items-center gap-2 bg-[#dff6dd] px-3 py-2 text-[13px] font-semibold text-[#0e700e]">
              <span className="grid size-4 place-items-center rounded-full bg-[#107c10] text-[11px] text-white" aria-hidden>✓</span>
              Validation passed
            </div>
            <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
              {[
                ["Subscription", "Azure subscription 1"],
                ["Resource group", group],
                ["Virtual machine name", name],
                ["Region", locationLabel(location)],
                ["Image", image?.label ?? imageId],
                ["Size", sizeId],
                ["Username", username],
                ["Authentication", `SSH key ${keyName}`],
                ["Inbound ports", ports],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-[#f3f2f1] py-1"><dt className="text-[#605e5c]">{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <button type="button" className="mt-3 text-[13px] text-[#0078d4] hover:underline">Download a template for automation</button>
          </div>
        ) : null}
        {error ? <p role="alert" className="max-w-3xl border border-[#a4262c] bg-[#fdf6f6] px-3 py-2 text-[13px] text-[#a4262c]">{error}</p> : null}
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
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-[#edebe9] bg-white px-6 py-3">
        <button type="button" className={PRIMARY} onClick={() => tab === "Review + create" ? launch() : setTab("Review + create")}>{tab === "Review + create" ? "Create" : "Review + create"}</button>
        <button type="button" className="h-8 px-3 text-[13px]" onClick={() => setTab(TABS[Math.max(0, TABS.indexOf(tab) - 1)] ?? "Basics")}>Previous</button>
        <button type="button" className="h-8 px-3 text-[13px] text-[#0078d4]" onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.indexOf(tab) + 1)] ?? "Review + create")}>Next</button>
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
    <div className="grid items-start gap-1 text-[13px] sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-4">
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
