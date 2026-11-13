"use client"

import { useState } from "react"
import { AppWindow, Boxes, Monitor, Plus, SquareTerminal, Wallet } from "lucide-react"
import { toast } from "sonner"
import { AccountForm, SignInCard } from "@/components/account-form"
import { BillingPanel } from "@/components/billing-panel"
import { ConsoleFrame } from "@/components/console-frame"
import { ConnectDialog, downloadPem } from "@/components/connect-dialog"
import { RegionSelect } from "@/components/region-select"
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
import { Label } from "@/components/ui/label"
import { AZURE_IMAGES, AZURE_LOCATIONS, AZURE_SIZES, STUDENT, STUDIES } from "@/lib/catalog"
import { hourlyLabel, usd } from "@/lib/format"
import { platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { azureSteps } from "@/lib/steps"
import type { Vm } from "@/lib/types"

const CTA = "h-10 bg-[#0078d4] text-white hover:bg-[#006cbe]"

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
      ? `Simulated spend is ${usd(spend)}, past the ${usd(azure.budgetUsd)} alert. Delete the resource group.`
      : null
  const connectVm = azure.vms.find((vm) => vm.id === connectId) ?? null

  return (
    <ConsoleFrame
      theme="azure"
      product="Azure portal"
      account={azure.signedIn ? azure.email : "Signed out"}
      region={
        azure.signedIn ? (
          <span className="flex items-center gap-2">
            <RegionSelect
              label="Azure location"
              value={azure.location}
              options={AZURE_LOCATIONS}
              onChange={(location) => {
                const outcome = dispatch({ type: "azure/location", location })
                if (outcome.error) toast.error(outcome.error)
              }}
            />
            <Button type="button" variant="ghost" className="text-white hover:bg-white/10" onClick={() => dispatch({ type: "azure/signout" })}>
              Sign out
            </Button>
          </span>
        ) : null
      }
      nav={[
        { id: "portal", label: "Home" },
        { id: "create", label: "Create a resource" },
        { id: "vms", label: "Virtual machines" },
        { id: "groups", label: "Resource groups" },
        { id: "shell", label: "VMware shell" },
        { id: "billing", label: "Cost management" },
        { id: "study", label: "Products and pricing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!azure.reviewedSite || !azure.accountCreated || !azure.signedIn}
      steps={azureSteps(lab)}
      alert={alert}
    >
      {stage === "study" && !azure.reviewedSite ? (
        <AzureHome
          account={azure.email || STUDENT.email}
          vms={azure.vms}
          onOpen={(id) => setView(id)}
          continueLabel="Continue to account setup"
          onContinue={() => dispatch({ type: "azure/review" })}
        />
      ) : null}
      {stage === "study" && azure.reviewedSite ? (
        <StudyView study={STUDIES.azure} continueLabel="Back to virtual machines" onContinue={() => setView("vms")} />
      ) : null}
      {stage === "portal" ? <AzureHome account={azure.email} vms={azure.vms} onOpen={setView} /> : null}
      {stage === "signup" ? (
        <AccountForm
          heading="Create an Azure account"
          lede="Azure for Students is the path that usually avoids a card. Skybench records that choice and never asks for one."
          ack="I understand a standard Azure free account asks for a card, while Azure for Students normally does not. This lab collects neither a card nor a real SMS."
          emailDefault={STUDENT.email}
          showStudent
          onCreate={({ email, student }) => dispatch({ type: "azure/signup", email, student })}
        />
      ) : null}
      {stage === "signin" ? <SignInCard email={azure.email} onSignIn={() => dispatch({ type: "azure/signin" })} /> : null}
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
        <div className="grid gap-3">
          <h1 className="font-heading text-3xl">VMware shell</h1>
          <p className="max-w-2xl text-sm leading-6 text-[#4d463c]">
            Install Azure CLI here, run az login, create the resource group and VM, then SSH. Deleting the group is the cleanup step.
          </p>
          <Terminal platform="azure" />
        </div>
      ) : null}
      {stage === "billing" ? (
        <BillingPanel
          title="Cost management"
          note="Compute in this model stops billing when the VM is stopped. Disks on a real subscription can keep charging. Delete the resource group to remove the VM and the group together."
          budget={azure.budgetUsd}
          vms={azure.vms}
          now={now}
          fastForward={{ type: "azure/fast-forward" }}
          onBudget={(amount) => ({ type: "azure/budget", amount })}
        />
      ) : null}
      <ConnectDialog platform="azure" vm={connectVm} open={connectVm != null} onOpenChange={(open) => !open && setConnectId(null)} />
      <Dialog open={groupToDelete != null} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {groupToDelete}?</DialogTitle>
            <DialogDescription>
              Every VM in the group is removed. This is the cleanup the practical asks for, and the habit that prevents a leftover disk from billing a real subscription.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGroupToDelete(null)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!groupToDelete) return
                tell(dispatch({ type: "azure/delete-group", name: groupToDelete }))
                setGroupToDelete(null)
              }}
            >
              Delete resource group
            </Button>
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
  const services = [
    { label: "Create a resource", id: "create", icon: Plus },
    { label: "Virtual machines", id: "vms", icon: Monitor },
    { label: "Resource groups", id: "groups", icon: Boxes },
    { label: "Cost management", id: "billing", icon: Wallet },
    { label: "Products and pricing", id: "study", icon: AppWindow },
    { label: "VMware shell", id: "shell", icon: SquareTerminal },
  ]
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="text-xl font-semibold">Azure services</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {services.map((service) => (
            <button key={service.id} type="button" onClick={() => onOpen(service.id)} className="grid w-28 justify-items-center gap-2 px-1 text-center text-xs text-[#0078d4]">
              <service.icon className="size-7" strokeWidth={1.5} />
              {service.label}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Resources</h2>
        <div className="mt-3 flex gap-4 border-b border-[#e1dfdd] text-sm">
          <span className="border-b-2 border-[#0078d4] pb-2 font-semibold text-[#0078d4]">Recent</span>
          <span className="pb-2 text-[#616161]">Favorite</span>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-[#616161]">
            <tr>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Last Viewed</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-[#616161]">No resources have been viewed recently</td>
              </tr>
            ) : (
              visible.map((vm) => (
                <tr key={vm.id} className="border-t border-[#edebe9]">
                  <td className="py-2 text-[#0078d4]">{vm.name}</td>
                  <td className="py-2">Virtual machine</td>
                  <td className="py-2">{vm.state}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-[#616161]">Signed in as {account}. This portal is local and does not open a real subscription.</p>
      </section>
      {continueLabel && onContinue ? (
        <Button type="button" className="h-9 w-fit bg-[#0078d4] text-white hover:bg-[#006cbe]" onClick={onContinue}>
          {continueLabel}
        </Button>
      ) : null}
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
  const visible = vms.filter((vm) => vm.state !== "terminated")
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">Virtual machines</h1>
          <p className="mt-1 text-sm text-[#4d463c]">Addresses use the documentation range 198.51.100.0/24. Cleanup is deleting the resource group, not only stopping the VM.</p>
        </div>
        <Button type="button" className={CTA} onClick={onCreate}>
          Create virtual machine
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Azure virtual machines</caption>
          <thead className="border-b text-xs tracking-wide text-[#6d6256] uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Resource group</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Public IP</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[#4d463c]">
                  No virtual machines. Create a resource group, then a small Ubuntu VM, and run uname -a over SSH.
                </td>
              </tr>
            ) : (
              visible.map((vm) => (
                <tr key={vm.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{vm.name}</td>
                  <td className="px-3 py-2">{vm.resourceGroup}</td>
                  <td className="px-3 py-2"><StateBadge state={vm.state} /></td>
                  <td className="px-3 py-2">{vm.sizeId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{vm.publicIp ?? "pending"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="outline" disabled={vm.state !== "running"} onClick={() => onConnect(vm.id)}>Connect</Button>
                      <Button type="button" size="sm" variant="outline" disabled={vm.state !== "running"} onClick={() => onStop(vm.id)}>Stop</Button>
                      <Button type="button" size="sm" variant="outline" disabled={vm.state !== "stopped"} onClick={() => onStart(vm.id)}>Start</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateVm({ onDone }: { onDone: () => void }) {
  const azure = useLabState().azure
  const [group, setGroup] = useState(azure.resourceGroups[0]?.name ?? "lab-rg")
  const [location, setLocation] = useState(azure.location)
  const [name, setName] = useState("vm-lab")
  const [imageId, setImageId] = useState(AZURE_IMAGES[0].id)
  const [sizeId, setSizeId] = useState(AZURE_SIZES[0].id)
  const [username, setUsername] = useState("azureuser")
  const [keyName, setKeyName] = useState(azure.keyPairs[0]?.name ?? "vm-lab-key")
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="font-heading text-3xl">Create a virtual machine</h1>
        <p className="mt-2 text-sm leading-6 text-[#4d463c]">The VM has to live in a resource group. Create the group first if the list is empty.</p>
      </div>
      {azure.resourceGroups.length === 0 ? (
        <form
          className="grid gap-3 rounded-xl border border-dashed border-[#8fb6db] bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault()
            const outcome = dispatch({ type: "azure/group", name: group, location })
            if (outcome.error) setError(outcome.error)
            else {
              setError(null)
              toast.success(outcome.message ?? "Resource group created.")
            }
          }}
        >
          <p className="text-sm text-[#0f3b66]">No resource groups yet. This is the empty state the portal would show before the first VM.</p>
          <Labeled id="az-group" label="Resource group">
            <Input id="az-group" value={group} onChange={(event) => setGroup(event.target.value)} />
          </Labeled>
          <Labeled id="az-location" label="Location">
            <NativeSelect id="az-location" value={location} onChange={setLocation}>
              {AZURE_LOCATIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </NativeSelect>
          </Labeled>
          <Button type="submit" className={CTA}>Create resource group</Button>
        </form>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const outcome = dispatch({
              type: "azure/launch",
              name,
              group,
              imageId,
              sizeId,
              keyName,
              username,
            })
            if (outcome.error) setError(outcome.error)
            else {
              toast.success(outcome.message ?? "Creating the VM.")
              onDone()
            }
          }}
        >
          <Labeled id="az-existing-group" label="Resource group">
            <NativeSelect id="az-existing-group" value={group} onChange={setGroup}>
              {azure.resourceGroups.map((item) => (
                <option key={item.name} value={item.name}>{item.name} · {item.location}</option>
              ))}
            </NativeSelect>
          </Labeled>
          <Labeled id="az-vm-name" label="Virtual machine name">
            <Input id="az-vm-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Labeled>
          <Labeled id="az-image" label="Image">
            <NativeSelect id="az-image" value={imageId} onChange={setImageId}>
              {AZURE_IMAGES.map((image) => (
                <option key={image.id} value={image.id}>{image.label}</option>
              ))}
            </NativeSelect>
          </Labeled>
          <Labeled id="az-size" label="Size">
            <NativeSelect id="az-size" value={sizeId} onChange={setSizeId}>
              {AZURE_SIZES.map((item) => (
                <option key={item.id} value={item.id}>{item.label} · {item.ram} · {hourlyLabel(item.hourlyUsd)}</option>
              ))}
            </NativeSelect>
          </Labeled>
          <Labeled id="az-user" label="Admin username">
            <Input id="az-user" value={username} onChange={(event) => setUsername(event.target.value)} />
          </Labeled>
          <div className="flex flex-wrap gap-2">
            <Input aria-label="SSH key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="max-w-52" />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const outcome = dispatch({ type: "azure/key", name: keyName })
                if (outcome.error) setError(outcome.error)
                else {
                  setError(null)
                  toast.success(outcome.message ?? "Key created.")
                }
              }}
            >
              Create SSH key
            </Button>
            {azure.keyPairs.some((key) => key.name === keyName) ? (
              <Button type="button" variant="outline" onClick={() => downloadPem(keyName)}>
                Download prop key
              </Button>
            ) : null}
          </div>
          {azure.keyPairs.length === 0 ? (
            <p className="text-sm text-[#6a4b12]">Create the SSH key before the VM. The download is a prop, not a private key.</p>
          ) : null}
          {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
          <Button type="submit" className={CTA}>Create virtual machine</Button>
        </form>
      )}
      {azure.resourceGroups.length === 0 && error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
    </div>
  )
}

function Groups({ onDelete }: { onDelete: (name: string) => void }) {
  const azure = useLabState().azure
  const [name, setName] = useState("lab-rg")
  const [location, setLocation] = useState(azure.location)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-3xl">Resource groups</h1>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const outcome = dispatch({ type: "azure/group", name, location })
          if (outcome.error) setError(outcome.error)
          else {
            setError(null)
            toast.success(outcome.message ?? "Resource group created.")
          }
        }}
      >
        <Labeled id="group-name" label="Name">
          <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Labeled>
        <Labeled id="group-location" label="Location">
          <NativeSelect id="group-location" value={location} onChange={setLocation}>
            {AZURE_LOCATIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </NativeSelect>
        </Labeled>
        <Button type="submit" className={CTA}>Create</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
      {azure.resourceGroups.length === 0 ? (
        <p className="text-sm text-[#4d463c]">No resource groups. Create lab-rg in Central India, then put the VM inside it.</p>
      ) : (
        <ul className="grid gap-2">
          {azure.resourceGroups.map((group) => (
            <li key={group.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <span>
                <span className="font-medium">{group.name}</span>
                <span className="ml-2 text-sm text-[#6d6256]">{group.location}</span>
              </span>
              <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(group.name)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Labeled({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function NativeSelect({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-lg border border-input bg-white px-2 text-sm">
      {children}
    </select>
  )
}
