"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AccountForm, SignInCard } from "@/components/account-form"
import { BillingPanel } from "@/components/billing-panel"
import { ConsoleFrame } from "@/components/console-frame"
import { ConnectDialog, downloadPem } from "@/components/connect-dialog"
import { StateBadge } from "@/components/state-badge"
import { StudyView } from "@/components/study-view"
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
import { AZURE_IMAGES, AZURE_LOCATIONS, AZURE_SIZES, STUDENT, STUDIES } from "@/lib/catalog"
import { hourlyLabel, usd } from "@/lib/format"
import { platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Vm } from "@/lib/types"

const PRIMARY = "inline-flex h-8 items-center justify-center rounded-sm bg-[#0078d4] px-4 text-[13px] font-semibold text-white hover:bg-[#106ebe] disabled:opacity-50"
const COMMAND = "inline-flex h-8 items-center gap-1.5 px-2 text-[13px] text-[#323130] hover:bg-[#f3f2f1] disabled:opacity-40"

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
    <ConsoleFrame
      theme="azure"
      product="Azure portal"
      account={azure.email || STUDENT.email}
      onSignOut={azure.signedIn ? () => dispatch({ type: "azure/signout" }) : undefined}
      nav={[
        { id: "portal", label: "Home" },
        { id: "create", label: "Create a resource" },
        { id: "vms", label: "Virtual machines" },
        { id: "groups", label: "Resource groups" },
        { id: "shell", label: "Cloud Shell" },
        { id: "billing", label: "Cost Management" },
        { id: "study", label: "Products and pricing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!azure.reviewedSite || !azure.accountCreated || !azure.signedIn}
      alert={alert}
    >
      {stage === "study" && !azure.reviewedSite ? (
        <AzureHome account={azure.email || STUDENT.email} vms={azure.vms} onOpen={() => undefined} continueLabel="Start free" onContinue={() => dispatch({ type: "azure/review" })} />
      ) : null}
      {stage === "study" && azure.reviewedSite ? (
        <div className="p-6"><StudyView study={STUDIES.azure} continueLabel="Back to virtual machines" onContinue={() => setView("vms")} /></div>
      ) : null}
      {stage === "portal" ? <AzureHome account={azure.email} vms={azure.vms} onOpen={setView} /> : null}
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
      {stage === "shell" ? (
        <div className="grid h-full bg-[#012456]">
          <div className="flex h-9 items-center bg-[#012456] px-3 text-[13px] text-white">Azure Cloud Shell</div>
          <div className="p-3"><Terminal platform="azure" /></div>
        </div>
      ) : null}
      {stage === "billing" ? (
        <div className="bg-[#faf9f8] p-6">
          <BillingPanel
            title="Cost Management"
            note="Compute charges stop when a virtual machine is stopped and deallocated. Managed disks can continue to incur charges. Deleting the resource group deletes the virtual machine and the other resources in that group."
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {groupToDelete}?</DialogTitle>
            <DialogDescription>Deleting a resource group is irreversible. All resources in the group will be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGroupToDelete(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => { if (!groupToDelete) return; tell(dispatch({ type: "azure/delete-group", name: groupToDelete })); setGroupToDelete(null) }}>Delete resource group</Button>
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

const SERVICES = [
  { label: "Create a resource", id: "create", glyph: "plus" },
  { label: "Virtual machines", id: "vms", glyph: "vm" },
  { label: "App Services", id: "study", glyph: "app" },
  { label: "Function App", id: "study", glyph: "fn" },
  { label: "SQL databases", id: "study", glyph: "sql" },
  { label: "Azure Cosmos DB", id: "study", glyph: "cosmos" },
  { label: "Storage accounts", id: "groups", glyph: "disk" },
  { label: "Kubernetes services", id: "study", glyph: "k8s" },
  { label: "Virtual networks", id: "study", glyph: "net" },
  { label: "More services", id: "study", glyph: "more" },
] as const

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
                  No resources have been viewed recently
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
  const [group, setGroup] = useState(azure.resourceGroups[0]?.name ?? "lab-rg")
  const [location, setLocation] = useState(azure.location)
  const [makingGroup, setMakingGroup] = useState(azure.resourceGroups.length === 0)
  const [name, setName] = useState("vm-lab")
  const [imageId, setImageId] = useState(AZURE_IMAGES[0].id)
  const [sizeId, setSizeId] = useState(AZURE_SIZES[0].id)
  const [username, setUsername] = useState("azureuser")
  const [keyName, setKeyName] = useState(azure.keyPairs[0]?.name ?? "vm-lab-key")
  const [ports, setPorts] = useState("SSH (22)")
  const [error, setError] = useState<string | null>(null)
  const size = AZURE_SIZES.find((item) => item.id === sizeId)
  const image = AZURE_IMAGES.find((item) => item.id === imageId)

  function createGroup() {
    const outcome = dispatch({ type: "azure/group", name: group, location })
    if (outcome.error) setError(outcome.error)
    else {
      setError(null)
      setMakingGroup(false)
      toast.success(outcome.message ?? "Resource group created.")
    }
  }

  function launch() {
    const outcome = dispatch({ type: "azure/launch", name, group, imageId, sizeId, keyName, username })
    if (outcome.error) setError(outcome.error)
    else {
      toast.success(outcome.message ?? "Creating the VM.")
      onDone()
    }
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
            <BladeField label="Subscription"><FakeSelect value="Azure subscription 1" /></BladeField>
            <BladeField label="Resource group">
              {azure.resourceGroups.length > 0 && !makingGroup ? (
                <div className="flex flex-wrap items-center gap-3">
                  <select id="az-existing-group" value={group} onChange={(event) => setGroup(event.target.value)} className="h-8 min-w-64 rounded-sm border border-[#8a8886] bg-white px-2">
                    {azure.resourceGroups.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                  </select>
                  <button type="button" className="text-[13px] text-[#0078d4] hover:underline" onClick={() => setMakingGroup(true)}>Create new</button>
                </div>
              ) : (
                <div className="grid gap-2 rounded-sm border border-[#edebe9] bg-white p-3">
                  <p className="text-[13px] font-semibold">Create new resource group</p>
                  <Input id="az-group" value={group} onChange={(event) => setGroup(event.target.value)} className="h-8 max-w-sm rounded-sm" />
                  <select id="az-location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-8 max-w-sm rounded-sm border border-[#8a8886] bg-white px-2">
                    {AZURE_LOCATIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" className={PRIMARY} onClick={createGroup}>OK</button>
                    {azure.resourceGroups.length > 0 ? <button type="button" className="h-8 px-3 text-[13px]" onClick={() => setMakingGroup(false)}>Cancel</button> : null}
                  </div>
                </div>
              )}
            </BladeField>
            <BladeField label="Virtual machine name"><Input id="az-vm-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 max-w-sm rounded-sm" /></BladeField>
            <BladeField label="Region">
              <select value={location} onChange={(event) => setLocation(event.target.value)} className="h-8 max-w-sm rounded-sm border border-[#8a8886] bg-white px-2">
                {AZURE_LOCATIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </BladeField>
            <BladeField label="Availability options"><FakeSelect value="No infrastructure redundancy required" /></BladeField>
            <BladeField label="Security type"><FakeSelect value="Standard" /></BladeField>
            <BladeField label="Image">
              <select id="az-image" value={imageId} onChange={(event) => setImageId(event.target.value)} className="h-8 max-w-lg rounded-sm border border-[#8a8886] bg-white px-2">
                {AZURE_IMAGES.map((item) => <option key={item.id} value={item.id}>{item.label} - x64 Gen2</option>)}
              </select>
            </BladeField>
            <BladeField label="Size">
              <select id="az-size" value={sizeId} onChange={(event) => setSizeId(event.target.value)} className="h-8 max-w-lg rounded-sm border border-[#8a8886] bg-white px-2">
                {AZURE_SIZES.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.vcpu} vcpu, {item.ram} memory ({hourlyLabel(item.hourlyUsd)})</option>)}
              </select>
              {size ? <p className="text-[12px] text-[#605e5c]">{size.note}</p> : null}
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
                <BladeField label="Username"><Input id="az-user" value={username} onChange={(event) => setUsername(event.target.value)} className="h-8 max-w-sm rounded-sm" /></BladeField>
                <BladeField label="SSH public key source"><FakeSelect value="Generate new key pair" /></BladeField>
                <BladeField label="Key pair name">
                  <div className="flex flex-wrap gap-2">
                    <Input aria-label="SSH key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-8 max-w-sm rounded-sm" />
                    <button type="button" className="h-8 rounded-sm border border-[#8a8886] bg-white px-3 text-[13px]" onClick={() => {
                      const outcome = dispatch({ type: "azure/key", name: keyName })
                      if (outcome.error) setError(outcome.error)
                      else { setError(null); toast.success(outcome.message ?? "Key created.") }
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
                  <select value={ports} onChange={(event) => setPorts(event.target.value)} className="h-8 max-w-sm rounded-sm border border-[#8a8886] bg-white px-2">
                    <option>SSH (22)</option>
                    <option>HTTP (80), SSH (22)</option>
                    <option>None</option>
                  </select>
                </BladeField>
              </div>
            </div>
          </div>
        ) : null}
        {tab === "Disks" ? <StaticBlade title="Disks" rows={[["OS disk type", "Premium SSD (locally redundant)"], ["Delete with VM", "Yes"], ["Encryption", "Platform-managed key"]]} /> : null}
        {tab === "Networking" ? <StaticBlade title="Networking" rows={[["Virtual network", "(new) vm-lab-vnet"], ["Subnet", "default (10.0.0.0/24)"], ["Public IP", "(new) vm-lab-ip"], ["NIC network security group", "Basic"], ["Public inbound ports", ports]]} /> : null}
        {tab === "Management" ? <StaticBlade title="Management" rows={[["Boot diagnostics", "Enable with managed storage"], ["Identity", "Off"], ["Auto-shutdown", "Off"]]} /> : null}
        {tab === "Monitoring" ? <StaticBlade title="Monitoring" rows={[["Alerts", "Off"], ["Boot diagnostics", "Enabled"]]} /> : null}
        {tab === "Advanced" ? <StaticBlade title="Advanced" rows={[["Extensions", "None"], ["VM generation", "Gen 2"], ["Custom data", "Empty"]]} /> : null}
        {tab === "Tags" ? <StaticBlade title="Tags" rows={[["Name", name], ["Course", "Cloud Computing"]]} /> : null}
        {tab === "Review + create" ? (
          <div className="max-w-3xl bg-white p-4">
            <h2 className="text-[16px] font-semibold">Validation passed</h2>
            <p className="mt-1 text-[13px] text-[#605e5c]">Basics look ready. Create the SSH key and the resource group before you submit if either is missing.</p>
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
          </div>
        ) : null}
        {error ? <p role="alert" className="max-w-3xl border border-[#a4262c] bg-[#fdf6f6] px-3 py-2 text-[13px] text-[#a4262c]">{error}</p> : null}
      </div>
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-[#edebe9] bg-white px-6 py-3">
        <button type="button" className={PRIMARY} onClick={() => tab === "Review + create" ? launch() : setTab("Review + create")}>{tab === "Review + create" ? "Create" : "Review + create"}</button>
        <button type="button" className="h-8 px-3 text-[13px] text-[#a19f9d]" disabled>Previous</button>
        <button type="button" className="h-8 px-3 text-[13px] text-[#0078d4]" onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.indexOf(tab) + 1)] ?? "Review + create")}>Next</button>
      </div>
    </div>
  )
}

function Groups({ onDelete }: { onDelete: (name: string) => void }) {
  const azure = useLabState().azure
  const [name, setName] = useState("lab-rg")
  const [location, setLocation] = useState(azure.location)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
              setOpen(false)
              toast.success(outcome.message ?? "Resource group created.")
            }
          }}
        >
          <h2 className="text-[16px] font-semibold">Create a resource group</h2>
          <BladeField label="Subscription"><FakeSelect value="Azure subscription 1" /></BladeField>
          <BladeField label="Resource group"><Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 rounded-sm" /></BladeField>
          <BladeField label="Region">
            <select id="group-location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-8 rounded-sm border border-[#8a8886] bg-white px-2">
              {AZURE_LOCATIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
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

function BladeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-[13px]">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  )
}

function FakeSelect({ value }: { value: string }) {
  return <div className="flex h-8 max-w-sm items-center rounded-sm border border-[#8a8886] bg-[#f3f2f1] px-2 text-[13px]">{value}</div>
}

function StaticBlade({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="max-w-3xl bg-white p-4">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <dl className="mt-3 grid gap-2 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="grid border-b border-[#f3f2f1] py-1 sm:grid-cols-[220px_1fr]"><dt className="text-[#605e5c]">{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </div>
  )
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
