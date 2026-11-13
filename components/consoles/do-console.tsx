"use client"

import { useState } from "react"
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
import { DO_IMAGES, DO_REGIONS, DO_SIZES, STUDENT, STUDIES } from "@/lib/catalog"
import { hourlyLabel, usd } from "@/lib/format"
import { isMetering, platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { doSteps } from "@/lib/steps"
import type { Vm } from "@/lib/types"

const CTA = "h-10 bg-[#0069ff] text-white hover:bg-[#0056d6]"

export function DoConsole() {
  const lab = useLabState()
  const ocean = lab.do
  const [view, setView] = useState("droplets")
  const [connectId, setConnectId] = useState<string | null>(null)
  const [destroyId, setDestroyId] = useState<string | null>(null)
  const stage = !ocean.reviewedSite ? "study" : !ocean.accountCreated ? "signup" : !ocean.signedIn ? "signin" : view
  const metering = ocean.droplets.some((vm) => isMetering(vm))
  const now = useNow(stage === "billing" || metering)
  const spend = now == null ? 0 : platformCost(lab, "do", now)
  const alert =
    now != null && spend > ocean.budgetUsd
      ? `Simulated spend is ${usd(spend)}, past the ${usd(ocean.budgetUsd)} alert. Destroy the Droplet. Powering it off does not stop the meter.`
      : null
  const connectVm = ocean.droplets.find((vm) => vm.id === connectId) ?? null
  const destroyVm = ocean.droplets.find((vm) => vm.id === destroyId) ?? null

  return (
    <ConsoleFrame
      theme="do"
      product="DigitalOcean"
      account={ocean.signedIn ? ocean.email : "Signed out"}
      region={
        ocean.signedIn ? (
          <span className="flex items-center gap-2">
            <RegionSelect
              label="DigitalOcean region"
              value={ocean.region}
              options={DO_REGIONS}
              onChange={(region) => {
                const outcome = dispatch({ type: "do/region", region })
                if (outcome.error) toast.error(outcome.error)
              }}
            />
            <Button type="button" variant="ghost" onClick={() => dispatch({ type: "do/signout" })}>
              Sign out
            </Button>
          </span>
        ) : null
      }
      nav={[
        { id: "droplets", label: "Droplets" },
        { id: "create", label: "Create Droplet" },
        { id: "keys", label: "SSH keys" },
        { id: "spaces", label: "Spaces" },
        { id: "shell", label: "VMware shell" },
        { id: "billing", label: "Billing" },
        { id: "study", label: "Products and pricing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!ocean.reviewedSite || !ocean.accountCreated || !ocean.signedIn}
      steps={doSteps(lab)}
      alert={alert}
    >
      {stage === "study" ? (
        <StudyView
          study={STUDIES.do}
          continueLabel={ocean.accountCreated ? "Back to Droplets" : "Continue to account setup"}
          onContinue={() => {
            if (!ocean.reviewedSite) dispatch({ type: "do/review" })
            else setView("droplets")
          }}
        />
      ) : null}
      {stage === "signup" ? (
        <AccountForm
          heading="Create a DigitalOcean account"
          lede="A real account verifies email and then asks for a card or PayPal. Skybench applies a simulated promo credit instead."
          ack="I understand DigitalOcean requires a card or PayPal, and that a powered-off Droplet still bills until it is destroyed. This lab takes no payment method."
          emailDefault={STUDENT.email}
          onCreate={({ email }) => dispatch({ type: "do/signup", email })}
        />
      ) : null}
      {stage === "signin" ? <SignInCard email={ocean.email} onSignIn={() => dispatch({ type: "do/signin" })} /> : null}
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
        <div className="grid gap-3">
          <h1 className="font-heading text-3xl">VMware shell</h1>
          <p className="max-w-2xl text-sm leading-6 text-[#4d463c]">
            Generate a key, install doctl, authenticate, create the Droplet, then ssh root@the address. Destroy it before you close the recording.
          </p>
          <Terminal platform="do" />
        </div>
      ) : null}
      {stage === "billing" ? (
        <BillingPanel
          title="Billing"
          note="DigitalOcean bills a Droplet until it is destroyed, including while it is powered off. The meter here does the same, so you can see the difference from AWS and Azure."
          budget={ocean.budgetUsd}
          vms={ocean.droplets}
          now={now}
          fastForward={{ type: "do/fast-forward" }}
          onBudget={(amount) => ({ type: "do/budget", amount })}
        />
      ) : null}
      <ConnectDialog platform="do" vm={connectVm} open={connectVm != null} onOpenChange={(open) => !open && setConnectId(null)} />
      <Dialog open={destroyVm != null} onOpenChange={(open) => !open && setDestroyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destroy {destroyVm?.name}?</DialogTitle>
            <DialogDescription>
              Destroy is the only action that stops DigitalOcean billing. Power off leaves the Droplet on the invoice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDestroyId(null)}>Keep it</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!destroyVm) return
                tell(dispatch({ type: "do/destroy", id: destroyVm.id }))
                setDestroyId(null)
              }}
            >
              Destroy
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
  const visible = droplets.filter((vm) => vm.state !== "terminated")
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">Droplets</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#4d463c]">Project bscs-lab. Addresses use 192.0.2.0/24, which is reserved for documentation and is not routable.</p>
        </div>
        <Button type="button" className={CTA} onClick={onCreate}>Create Droplet</Button>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#b9c8e6] bg-white px-4 py-10">
          <p className="font-medium">No Droplets in this project.</p>
          <p className="mt-1 max-w-lg text-sm leading-6 text-[#4d463c]">Add an SSH key, pick Ubuntu and a basic plan, then destroy the Droplet when you are done. Powering it off is not cleanup.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {visible.map((vm) => (
            <li key={vm.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{vm.name}</p>
                  <p className="mt-1 font-mono text-sm">{vm.publicIp ?? "Assigning address…"}</p>
                  <p className="mt-1 text-xs text-[#6d6256]">{vm.region} · {vm.sizeLabel} · {vm.imageLabel}</p>
                </div>
                <StateBadge state={vm.state} />
              </div>
              {vm.state === "stopped" ? (
                <p className="mt-3 text-sm text-[#6a4b12]">Powered off, and still on the meter. Destroy it to stop simulated billing.</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={vm.state !== "running"} onClick={() => onConnect(vm.id)}>Console SSH</Button>
                <Button type="button" size="sm" variant="outline" disabled={vm.state !== "running"} onClick={() => onPower(vm.id, false)}>Power off</Button>
                <Button type="button" size="sm" variant="outline" disabled={vm.state !== "stopped"} onClick={() => onPower(vm.id, true)}>Power on</Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => onDestroy(vm.id)}>Destroy</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CreateDroplet({ onDone }: { onDone: () => void }) {
  const ocean = useLabState().do
  const [name, setName] = useState("droplet-lab")
  const [region, setRegion] = useState(ocean.region)
  const [imageId, setImageId] = useState(DO_IMAGES[0].id)
  const [sizeId, setSizeId] = useState(DO_SIZES[1].id)
  const [keyName, setKeyName] = useState(ocean.keys[0]?.name ?? "skybench")
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="mx-auto grid max-w-2xl gap-4"
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
      <div>
        <h1 className="font-heading text-3xl">Create Droplet</h1>
        <p className="mt-2 text-sm leading-6 text-[#4d463c]">Basic shared CPU, Ubuntu, and an SSH key. root is the login.</p>
      </div>
      {ocean.keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#b9c8e6] bg-white p-4 text-sm leading-6">
          <p className="font-medium">No SSH keys on the account.</p>
          <p className="mt-1 text-[#4d463c]">DigitalOcean will not create a Droplet you can enter until a public key is attached. Generate one, then submit the form.</p>
        </div>
      ) : null}
      <Labeled id="do-name" label="Hostname">
        <Input id="do-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Labeled>
      <Labeled id="do-region" label="Region">
        <NativeSelect id="do-region" value={region} onChange={setRegion}>
          {DO_REGIONS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </NativeSelect>
      </Labeled>
      <Labeled id="do-image" label="Image">
        <NativeSelect id="do-image" value={imageId} onChange={setImageId}>
          {DO_IMAGES.map((image) => (
            <option key={image.id} value={image.id}>{image.label}</option>
          ))}
        </NativeSelect>
      </Labeled>
      <Labeled id="do-size" label="Plan">
        <NativeSelect id="do-size" value={sizeId} onChange={setSizeId}>
          {DO_SIZES.map((item) => (
            <option key={item.id} value={item.id}>{item.label} · {hourlyLabel(item.hourlyUsd)} · {item.note}</option>
          ))}
        </NativeSelect>
      </Labeled>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="SSH key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="max-w-52" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const outcome = dispatch({ type: "do/key", name: keyName })
            if (outcome.error) setError(outcome.error)
            else {
              setError(null)
              toast.success(outcome.message ?? "Key added.")
            }
          }}
        >
          Generate SSH key
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
      <Button type="submit" className={CTA}>Create Droplet</Button>
    </form>
  )
}

function Keys() {
  const keys = useLabState().do.keys
  const [name, setName] = useState("skybench")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-3xl">SSH keys</h1>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const outcome = dispatch({ type: "do/key", name })
          if (outcome.error) setError(outcome.error)
          else {
            setError(null)
            toast.success(outcome.message ?? "Key added.")
          }
        }}
      >
        <Labeled id="key-name" label="Key name">
          <Input id="key-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Labeled>
        <Button type="submit" className={CTA}>Add key</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
      {keys.length === 0 ? (
        <p className="text-sm text-[#4d463c]">No keys yet. In the shell: ssh-keygen -t ed25519 -f ~/.ssh/skybench with an empty passphrase.</p>
      ) : (
        <ul className="grid gap-2">
          {keys.map((key) => (
            <li key={key.name} className="rounded-xl border border-black/10 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{key.name}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => downloadPem(key.name)}>Download prop key</Button>
              </div>
              <p className="mt-1 font-mono text-xs text-[#6d6256]">{key.fingerprint}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Spaces() {
  const ocean = useLabState().do
  const [name, setName] = useState("hassan-notes")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-heading text-3xl">Spaces</h1>
        <p className="mt-1 text-sm text-[#4d463c]">Object storage with a short name. This list never leaves the browser.</p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const outcome = dispatch({ type: "do/space", name })
          if (outcome.error) setError(outcome.error)
          else {
            setError(null)
            toast.success(outcome.message ?? "Space created.")
          }
        }}
      >
        <Labeled id="space-name" label="Space name">
          <Input id="space-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Labeled>
        <Button type="submit" className={CTA}>Create Space</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
      {ocean.spaces.length === 0 ? (
        <p className="text-sm text-[#4d463c]">No Spaces yet. Use lowercase letters and hyphens.</p>
      ) : (
        <ul className="grid gap-2">
          {ocean.spaces.map((space) => (
            <li key={space.name} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
              <span className="font-mono text-sm">{space.name}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => tell(dispatch({ type: "do/delete-space", name: space.name }))}>
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
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full rounded-lg border border-input bg-white px-2 text-sm">
      {children}
    </select>
  )
}
