"use client"

import { useEffect, useMemo, useState } from "react"
import "@cloudscape-design/global-styles/index.css"
import StatusIndicator from "@cloudscape-design/components/status-indicator"
import { ConsoleSelect } from "@/components/console-select"
import { flash } from "@/lib/flash"
import { AccountForm, SignInCard } from "@/components/account-form"
import { BrandGlyph } from "@/components/brand-marks"
import { BillingPanel } from "@/components/billing-panel"
import { AwsRegionMenu, ConsoleFrame } from "@/components/console-frame"
import { ConnectDialog, downloadPem } from "@/components/connect-dialog"
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
import { AWS_IMAGES, AWS_REGIONS, AWS_SIZES, STUDENT } from "@/lib/catalog"
import { hourlyLabel, usd } from "@/lib/format"
import { platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { KeyMaterial, Vm } from "@/lib/types"

const ORANGE = "inline-flex h-8 items-center justify-center rounded-[2px] bg-[#ec7211] px-5 text-[14px] font-bold text-white hover:bg-[#eb5f07] disabled:cursor-not-allowed disabled:opacity-50"
const GHOST = "inline-flex h-8 items-center justify-center rounded-[2px] border border-[#8d9aa8] bg-white px-3 text-[14px] text-[#16191f] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-40"

export function AwsConsole() {
  const lab = useLabState()
  const aws = lab.aws
  const [view, setView] = useState("home")
  const [detailId, setDetailId] = useState<string | null>(null)
  const [connectId, setConnectId] = useState<string | null>(null)
  const [killId, setKillId] = useState<string | null>(null)
  const stage = !aws.reviewedSite ? "study" : !aws.accountCreated ? "signup" : !aws.signedIn ? "signin" : view
  const metering = aws.instances.some((vm) => vm.state === "running")
  const now = useNow(stage === "billing" || metering)
  const spend = now == null ? 0 : platformCost(lab, "aws", now)
  const alert =
    now != null && spend > aws.budgetUsd
      ? `Your budget of ${usd(aws.budgetUsd)} has been exceeded. Month-to-date cost is ${usd(spend)}.`
      : null
  const connectVm = aws.instances.find((vm) => vm.id === connectId) ?? null
  const killVm = aws.instances.find((vm) => vm.id === killId) ?? null

  if (stage === "signup") {
    return (
      <AccountForm
        accent="aws"
        emailDefault={STUDENT.email}
        onCreate={({ email }) => dispatch({ type: "aws/signup", email })}
      />
    )
  }
  if (stage === "signin") {
    return <SignInCard accent="aws" email={aws.email} onSignIn={() => dispatch({ type: "aws/signin" })} />
  }

  return (
    <ConsoleFrame
      theme="aws"
      product="AWS console"
      account={aws.email || STUDENT.email}
      onSignOut={aws.signedIn ? () => dispatch({ type: "aws/signout" }) : undefined}
      region={
        <AwsRegionMenu
          value={aws.region}
          options={AWS_REGIONS}
          onChange={(region) => {
            const outcome = dispatch({ type: "aws/region", region })
            if (outcome.error) flash(outcome.error, "error")
          }}
        />
      }
      nav={[
        { id: "home", label: "EC2 Dashboard" },
        { id: "ec2", label: "Instances" },
        { id: "launch", label: "Launch instance" },
        { id: "keys", label: "Key Pairs" },
        { id: "s3", label: "S3" },
        { id: "shell", label: "CloudShell" },
        { id: "billing", label: "Billing and Cost Management" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!aws.reviewedSite || !aws.accountCreated || !aws.signedIn}
      alert={alert}
    >
      {stage === "study" && !aws.reviewedSite ? (
        <Ec2Home
          region={aws.region}
          instances={aws.instances}
          onLaunch={() => undefined}
          onOpenInstances={() => undefined}
          continueLabel="Create an AWS account"
          onContinue={() => dispatch({ type: "aws/review" })}
          keys={aws.keyPairs.length}
        />
      ) : null}
      {stage === "home" ? (
        <Ec2Home region={aws.region} instances={aws.instances} keys={aws.keyPairs.length} onLaunch={() => setView("launch")} onOpenInstances={() => setView("ec2")} />
      ) : null}
      {stage === "ec2" && detailId ? (
        <InstanceDetail id={detailId} region={aws.region} onBack={() => setDetailId(null)} />
      ) : null}
      {stage === "ec2" && !detailId ? (
        <InstanceTable
          region={aws.region}
          instances={aws.instances}
          onLaunch={() => setView("launch")}
          onConnect={setConnectId}
          onStop={(id) => tell(dispatch({ type: "aws/stop", id }))}
          onStart={(id) => tell(dispatch({ type: "aws/start", id }))}
          onTerminate={setKillId}
          onOpen={setDetailId}
        />
      ) : null}
      {stage === "launch" ? <LaunchInstance onDone={() => setView("ec2")} /> : null}
      {stage === "keys" ? <KeyPairs keys={aws.keyPairs} /> : null}
      {stage === "s3" ? <Buckets region={aws.region} buckets={aws.buckets} /> : null}
      {stage === "shell" ? <CloudShellPanel region={aws.region} /> : null}
      {stage === "billing" ? (
        <div className="p-6">
          <BillingPanel
            title="Billing and Cost Management"
            note="On-Demand Linux instances are billed by the second, with a one-minute minimum. EBS volumes continue to incur charges after an instance is stopped."
            budget={aws.budgetUsd}
            vms={aws.instances}
            now={now}
            fastForward={{ type: "aws/fast-forward" }}
            onBudget={(amount) => ({ type: "aws/budget", amount })}
          />
        </div>
      ) : null}
      <ConnectDialog platform="aws" vm={connectVm} open={connectVm != null} onOpenChange={(open) => !open && setConnectId(null)} />
      <Dialog open={killVm != null} onOpenChange={(open) => !open && setKillId(null)}>
        <DialogContent className="rounded-[2px] border border-[#d5dbdb] bg-white text-[#16191f] shadow-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terminate instance {killVm?.id}?</DialogTitle>
            <DialogDescription>
              On termination, the instance and its root volume are deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setKillId(null)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!killVm) return
                tell(dispatch({ type: "aws/terminate", id: killVm.id }))
                setKillId(null)
              }}
            >
              Terminate (delete)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsoleFrame>
  )
}

function AwsStatus({ state }: { state: Vm["state"] }) {
  const type = state === "running" ? "success" : state === "stopped" ? "stopped" : state === "terminated" ? "error" : "loading"
  const label = state === "pending" ? "Pending" : state === "stopping" ? "Stopping" : state === "shutting-down" ? "Shutting-down" : state === "running" ? "Running" : state === "stopped" ? "Stopped" : "Terminated"
  return <StatusIndicator type={type}>{label}</StatusIndicator>
}

function CloudShellPanel({ region }: { region: string }) {
  const [ready, setReady] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 700)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className="flex min-h-[520px] flex-col bg-[#161d26] text-white">
      <div className="relative flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2 text-[13px]">
        <span className="rounded-t bg-[#232f3e] px-3 py-1">{region}</span>
        <button type="button" className="rounded px-2 py-1 hover:bg-white/10" onClick={() => setMenu(menu === "actions" ? null : "actions")}>Actions</button>
        <button type="button" className="rounded px-2 py-1 hover:bg-white/10" onClick={() => setMenu(menu === "prefs" ? null : "prefs")}>Preferences</button>
        {menu ? (
          <div className="absolute top-10 left-24 z-20 grid min-w-48 gap-1 rounded-sm border border-white/10 bg-[#232f3e] p-2 text-[#d5dbdb] shadow-xl">
            {(menu === "actions" ? ["New tab", "Restart", "Delete environment"] : ["Font size", "Tabs layout"]).map((item) => <p key={item} className="px-2 py-1">{item}</p>)}
          </div>
        ) : null}
      </div>
      <p className="px-4 py-2 text-[13px] text-[#d5dbdb]">{ready ? "Environment ready." : "Preparing your CloudShell environment…"}</p>
      <div className="px-3 pb-3"><Terminal platform="aws" /></div>
    </div>
  )
}

function InstanceDetail({ id, region, onBack }: { id: string; region: string; onBack: () => void }) {
  const vm = useLabState().aws.instances.find((item) => item.id === id)
  const [tab, setTab] = useState("Details")
  if (!vm) return <p className="p-6">This instance is no longer on the list.</p>
  return (
    <div className="px-5 py-4">
      <p className="text-[12px] text-[#545b64]">EC2 <span className="px-1">›</span> <button type="button" className="text-[#0073bb]" onClick={onBack}>Instances</button> <span className="px-1">›</span> {vm.id}</p>
      <h1 className="mt-1 text-[28px] font-bold">{vm.name || vm.id}</h1>
      <div className="mt-2"><AwsStatus state={vm.state} /></div>
      <div className="mt-4 flex gap-4 border-b border-[#d5dbdb] text-[14px]">
        {["Details", "Tags"].map((item) => (
          <button key={item} type="button" className={cn("border-b-2 pb-2", tab === item ? "border-[#0073bb] font-bold text-[#0073bb]" : "border-transparent")} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === "Details" ? (
        <dl className="mt-4 grid max-w-3xl gap-3 text-[14px] sm:grid-cols-2">
          <div><dt className="text-[#545b64]">Instance ID</dt><dd className="font-mono">{vm.id}</dd></div>
          <div><dt className="text-[#545b64]">Instance type</dt><dd>{vm.sizeId}</dd></div>
          <div><dt className="text-[#545b64]">Public IPv4 address</dt><dd className="font-mono">{vm.publicIp ?? "—"}</dd></div>
          <div><dt className="text-[#545b64]">Instance owner</dt><dd>438202302102</dd></div>
          <div><dt className="text-[#545b64]">Launch time</dt><dd>{new Date(vm.createdAt).toUTCString()}</dd></div>
          <div><dt className="text-[#545b64]">Availability Zone</dt><dd>{region}a</dd></div>
        </dl>
      ) : (
        <table className="mt-4 w-full max-w-xl text-left text-[14px]">
          <thead><tr className="border-b"><th className="py-2">Key</th><th>Value</th></tr></thead>
          <tbody><tr><td className="py-2">Name</td><td>{vm.name || "—"}</td></tr></tbody>
        </table>
      )}
    </div>
  )
}

function MenuAction({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f2f8fd] disabled:text-[#aab7b8]">
      {children}
    </button>
  )
}

function tell(outcome: { error?: string; message?: string }) {
  if (outcome.error) flash(outcome.error, "error")
  else if (outcome.message) flash(outcome.message)
}

function regionName(region: string) {
  return AWS_REGIONS.find((item) => item.id === region)?.label.replace(` ${region}`, "") ?? region
}

function Ec2Home({
  region,
  instances,
  onLaunch,
  onOpenInstances,
  continueLabel,
  onContinue,
  keys = 0,
}: {
  region: string
  instances: Vm[]
  onLaunch: () => void
  onOpenInstances: () => void
  continueLabel?: string
  onContinue?: () => void
  keys?: number
}) {
  const visible = instances.filter((vm) => vm.state !== "terminated")
  const running = visible.filter((vm) => vm.state === "running").length
  const resources: [string, string, (() => void) | undefined][] = [
    ["Instances (running)", String(running), onOpenInstances],
    ["Dedicated Hosts", "0", undefined],
    ["Instances", String(visible.length), onOpenInstances],
    ["Capacity Reservations", "0", undefined],
    ["Elastic IPs", "0", undefined],
    ["Key pairs", String(keys), undefined],
    ["Load balancers", "0", undefined],
    ["Placement groups", "0", undefined],
    ["Security groups", "1", undefined],
    ["Snapshots", "0", undefined],
    ["Volumes", String(visible.length), undefined],
    ["Auto Scaling groups", "0", undefined],
  ]
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-[28px] leading-9 font-bold">
          EC2 Dashboard
          <Info />
        </h1>
        {onContinue && continueLabel ? (
          <button type="button" className={ORANGE} onClick={onContinue}>{continueLabel}</button>
        ) : (
          <button type="button" className={ORANGE} onClick={onLaunch}>Launch instance</button>
        )}
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4">
          <section className="border border-[#d5dbdb] bg-white">
            <header className="flex items-center justify-between border-b border-[#eaeded] px-4 py-3">
              <h2 className="text-[18px] font-bold">Resources</h2>
              <span className="text-[#545b64]" aria-hidden><CogMark /></span>
            </header>
            <p className="px-4 pt-3 text-[13px]">You are using the following Amazon EC2 resources in the {regionName(region)} Region ({region}):</p>
            <div className="grid gap-x-8 px-4 py-3 md:grid-cols-2">
              {resources.map(([title, count, action]) => (
                <div key={title} className="flex items-center justify-between border-b border-[#eaeded] py-2">
                  {action ? (
                    <button type="button" onClick={action} className="text-left text-[#0073bb] hover:underline">{title}</button>
                  ) : (
                    <span className="text-[#0073bb]">{title}</span>
                  )}
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="border border-[#d5dbdb] bg-white p-4">
              <h2 className="text-[18px] font-bold">Launch instance</h2>
              <p className="mt-2 text-[13px] leading-5 text-[#545b64]">To get started, launch an Amazon EC2 instance, which is a virtual server in the cloud.</p>
              {onContinue ? null : <button type="button" className={cn(ORANGE, "mt-3")} onClick={onLaunch}>Launch instance</button>}
            </section>
            <section className="border border-[#d5dbdb] bg-white p-4">
              <h2 className="text-[18px] font-bold">Service health</h2>
              <p className="mt-3 flex items-center gap-2 text-[13px]"><span className="size-2 rounded-full bg-[#1d8102]" /> Service is operating normally</p>
              <a className="mt-2 inline-block text-[13px] text-[#0073bb] hover:underline" href="https://health.aws.amazon.com/health/status" target="_blank" rel="noreferrer">AWS Health Dashboard</a>
            </section>
          </div>
        </div>
        <aside className="border border-[#d5dbdb] bg-white">
          <header className="flex items-center justify-between border-b border-[#eaeded] px-4 py-3">
            <h2 className="text-[16px] font-bold">Account attributes</h2>
            <span className="text-[#545b64]" aria-hidden><RefreshMark /></span>
          </header>
          <div className="px-4 py-3">
            <p className="text-[12px] font-bold text-[#545b64]">Settings</p>
            <ul className="mt-2 grid gap-1.5 text-[13px] text-[#0073bb]">
              {["Allowed AMIs", "Data protection and security", "EC2 Serial Console", "Default credit specification", "EC2 console preferences"].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-2 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-[#545b64]">Supported platforms</dt><dd>VPC</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#545b64]">Default VPC</dt><dd className="font-mono text-[12px]">vpc-08f2c1a04b7e93d21</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#545b64]">Resource ID length</dt><dd>Long IDs</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}

function InstanceTable({
  region,
  instances,
  onLaunch,
  onConnect,
  onStop,
  onStart,
  onTerminate,
  onOpen,
}: {
  region: string
  instances: Vm[]
  onLaunch: () => void
  onConnect: (id: string) => void
  onStop: (id: string) => void
  onStart: (id: string) => void
  onTerminate: (id: string) => void
  onOpen: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const visible = instances.filter((vm) => vm.state !== "terminated").filter((vm) => {
    const blob = `${vm.name} ${vm.id} ${vm.publicIp ?? ""} ${vm.sizeId}`.toLowerCase()
    return blob.includes(query.trim().toLowerCase())
  })
  const active = visible.find((vm) => vm.id === selected) ?? visible.find((vm) => vm.state === "running") ?? null
  return (
    <div className="px-5 py-4">
      <p className="text-[12px] text-[#545b64]">EC2 <span className="px-1">›</span> Instances</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-[28px] font-bold">Instances <Info /></h1>
      </div>
      {visible.some((vm) => vm.state === "pending") ? (
        <div role="status" className="mt-3 border-l-8 border-[#1d8102] bg-[#f2fcf3] px-3 py-2 text-[14px]">
          Successfully initiated launch of instance {visible.find((vm) => vm.state === "pending")?.id}.
        </div>
      ) : null}
      <div className="mt-3 border border-[#d5dbdb] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eaeded] px-3 py-2">
          <button type="button" className={ORANGE} onClick={onLaunch}>Launch instances</button>
          <button type="button" className={GHOST} disabled={active?.state !== "running"} onClick={() => active && onConnect(active.id)}>Connect</button>
          <details className="relative">
            <summary className={`${GHOST} cursor-pointer gap-1.5 list-none [&::-webkit-details-marker]:hidden`}>Instance state <Caret /></summary>
            <div className="absolute top-9 left-0 z-20 w-64 border border-[#d5dbdb] bg-white py-1 shadow-xl">
              <MenuAction disabled={active?.state !== "running"} onClick={() => active && onStop(active.id)}>Stop instance</MenuAction>
              <MenuAction disabled={active?.state !== "stopped"} onClick={() => active && onStart(active.id)}>Start instance</MenuAction>
              <MenuAction disabled>Reboot instance</MenuAction>
              <MenuAction disabled>Hibernate instance</MenuAction>
              <MenuAction disabled={!active} onClick={() => active && onTerminate(active.id)}>Terminate (delete) instance</MenuAction>
            </div>
          </details>
          <details className="relative">
            <summary className={`${GHOST} cursor-pointer gap-1.5 list-none [&::-webkit-details-marker]:hidden`}>Actions <Caret /></summary>
            <div className="absolute top-9 left-0 z-20 w-56 border border-[#d5dbdb] bg-white py-1 text-[13px] shadow-xl">
              {["Instance settings", "Networking", "Security", "Image and templates", "Monitor and troubleshoot"].map((item) => (
                <p key={item} className="px-3 py-1.5 text-[#16191f]">{item}</p>
              ))}
            </div>
          </details>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Add filter" className="ml-auto h-8 w-full max-w-sm rounded-sm border border-[#aab7b8] px-2 text-[13px] outline-none focus:border-[#0073bb]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <caption className="sr-only">EC2 instances</caption>
            <thead className="bg-[#fafafa] text-[12px] text-[#16191f]">
              <tr className="border-b border-[#eaeded]">
                {["", "Name", "Instance ID", "Instance state", "Instance type", "Status check", "Availability Zone", "Public IPv4 address", "Security group name", "Key name"].map((heading, index) => (
                  <th key={`${heading}-${index}`} className="px-3 py-2 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-[#545b64]">No instances</td>
                </tr>
              ) : (
                visible.map((vm) => (
                  <tr key={vm.id} className={cn("border-b border-[#eaeded] hover:bg-[#fafafa]", selected === vm.id && "bg-[#f2f8fd]")} onClick={() => setSelected(vm.id)}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selected === vm.id} onChange={() => setSelected(vm.id)} aria-label={`Select ${vm.name}`} /></td>
                    <td className="px-3 py-2">{vm.name}</td>
                    <td className="px-3 py-2 font-mono text-[12px]"><button type="button" className="text-[#0073bb] hover:underline" onClick={(event) => { event.stopPropagation(); onOpen(vm.id) }}>{vm.id}</button></td>
                    <td className="px-3 py-2"><AwsStatus state={vm.state} /></td>
                    <td className="px-3 py-2">{vm.sizeId}</td>
                    <td className="px-3 py-2">{vm.state === "running" ? "2/2 checks passed" : "—"}</td>
                    <td className="px-3 py-2">{region}a</td>
                    <td className="px-3 py-2 font-mono text-[12px]">{vm.publicIp ?? "—"}</td>
                    <td className="px-3 py-2 text-[#0073bb]">{vm.allowHttp ? "launch-wizard-http" : "launch-wizard-1"}</td>
                    <td className="px-3 py-2">{vm.keyName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const QUICK = [
  { id: "ami-al2023", name: "Amazon Linux" },
  { id: "mac", name: "macOS" },
  { id: "ami-ubuntu2204", name: "Ubuntu" },
  { id: "win", name: "Windows" },
  { id: "rhel", name: "Red Hat" },
  { id: "suse", name: "SUSE Linux" },
]

function LaunchInstance({ onDone }: { onDone: () => void }) {
  const aws = useLabState().aws
  const [name, setName] = useState("")
  const [imageId, setImageId] = useState(AWS_IMAGES[0].id)
  const [sizeId, setSizeId] = useState(AWS_SIZES[0].id)
  const [keyName, setKeyName] = useState(aws.keyPairs[0]?.name ?? "")
  const [newKey, setNewKey] = useState("MyKeyPair")
  const [keyType, setKeyType] = useState("RSA")
  const [keyFormat, setKeyFormat] = useState(".pem")
  const [keyMade, setKeyMade] = useState(false)
  const [proceed, setProceed] = useState(false)
  const [ack, setAck] = useState(false)
  const [http, setHttp] = useState(false)
  const [editNet, setEditNet] = useState(false)
  const [sshFrom, setSshFrom] = useState("Anywhere 0.0.0.0/0")
  const [firewall, setFirewall] = useState("create")
  const [storageView, setStorageView] = useState<"simple" | "advanced">("simple")
  const [volumeSize, setVolumeSize] = useState(8)
  const [encrypted, setEncrypted] = useState(true)
  const [extraVolume, setExtraVolume] = useState(false)
  const [tags, setTags] = useState<{ key: string; value: string }[]>([])
  const [catalog, setCatalog] = useState(false)
  const [count, setCount] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const size = AWS_SIZES.find((item) => item.id === sizeId)
  const image = AWS_IMAGES.find((item) => item.id === imageId)
  const summary = useMemo(() => [
    ["Name and tags", name || "—"],
    ["Application and OS Images", image?.amiTitle ?? image?.label ?? "—"],
    ["Instance type", sizeId],
    ["Key pair (login)", proceed ? "Proceed without a key pair" : keyName || "—"],
    ["Network settings", http ? "launch-wizard-http" : "launch-wizard-1"],
    ["Configure storage", `${extraVolume ? 2 : 1} volume(s) - ${volumeSize} GiB`],
    ["Advanced details", "Shared tenancy"],
  ], [name, image, sizeId, proceed, keyName, http, extraVolume, volumeSize])

  return (
    <form
      className="px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (count !== 1) {
          setError("You can launch 1 instance at a time from this page.")
          return
        }
        if (proceed && !ack) {
          setError("Acknowledge that you will not be able to connect without a key pair.")
          return
        }
        const outcome = dispatch({ type: "aws/launch", name, imageId, sizeId, keyName: proceed ? "" : keyName, allowHttp: http, proceedWithoutKey: proceed })
        if (outcome.error) setError(outcome.error)
        else {
          flash(outcome.message ?? "Successfully initiated launch of instance.")
          onDone()
        }
      }}
    >
      <p className="text-[12px] text-[#545b64]">EC2 <span className="px-1">›</span> Instances <span className="px-1">›</span> Launch an instance</p>
      <h1 className="mt-1 flex items-center gap-2 text-[28px] font-bold">Launch an instance <Info /></h1>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4">
          <Card id="launch-1" title="Name and tags">
            <Field id="aws-name" label="Name">
              <Input id="aws-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 max-w-md rounded-sm" />
            </Field>
            <p className="text-[12px] text-[#545b64]">The name is a tag, where the key is Name, and the value is the name that you specify.</p>
            <button type="button" className="w-fit text-[13px] text-[#0073bb] hover:underline" onClick={() => setTags((current) => [...current, { key: "", value: "" }])}>Add additional tags</button>
            {tags.map((tag, index) => (
              <div key={index} className="grid items-end gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_minmax(0,1fr)]">
                <label className="grid gap-1.5 text-[12px] font-bold">Key
                  <Input aria-label="Tag key" value={tag.key} onChange={(event) => setTags((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))} className="h-8 rounded-[2px] font-normal" placeholder="Key" />
                </label>
                <label className="grid gap-1.5 text-[12px] font-bold">Value
                  <Input aria-label="Tag value" value={tag.value} onChange={(event) => setTags((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} className="h-8 rounded-[2px] font-normal" placeholder="Value" />
                </label>
                <p className="pb-2 text-[12px] font-normal text-[#545b64]">Instances, volumes, and network interfaces</p>
              </div>
            ))}
          </Card>
          <Card id="launch-2" title="Application and OS Images (Amazon Machine Image)">
            <div className="flex items-stretch gap-4">
              <div className="min-w-0 flex-1">
                <p className="w-fit border-b-[3px] border-[#0073bb] pb-1.5 text-[14px] font-bold leading-none text-[#0073bb]">Quick Start</p>
                <div className="relative mt-3">
                  <div className="flex items-center gap-2 overflow-x-auto pr-5">
                    {QUICK.map((os) => {
                      const known = AWS_IMAGES.some((item) => item.id === os.id)
                      const selected = known && imageId === os.id
                      return (
                        <button
                          key={os.name}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            if (known) setImageId(os.id)
                          }}
                          className={cn("grid h-[112px] w-[100px] shrink-0 place-items-center border bg-white px-1", selected ? "border-[#0073bb] bg-[#f2f8fd] shadow-[inset_0_0_0_1px_#0073bb]" : "border-[#eaeded] hover:border-[#0073bb]")}
                        >
                          <OsLockup name={os.name} />
                        </button>
                      )
                    })}
                  </div>
                  <span className="pointer-events-none absolute top-1/2 right-0 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-[#d5dbdb] bg-[#f2f3f3] text-[18px] leading-none text-[#545b64] shadow-sm" aria-hidden>›</span>
                </div>
              </div>
              <div className="hidden w-[168px] shrink-0 flex-col justify-center border-l border-[#eaeded] pl-4 sm:flex">
                <svg viewBox="0 0 24 24" className="size-6 text-[#16191f]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.2-3.2" /></svg>
                <p className="mt-2 text-[14px] font-bold leading-5 text-[#0073bb]">Browse more AMIs</p>
                <p className="mt-1 text-[12px] leading-4 text-[#545b64]">Including AMIs from AWS, Marketplace and the Community</p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <p className="text-[13px] font-bold">Amazon Machine Image (AMI)</p>
              <ConsoleSelect id="aws-image" label="Amazon Machine Image (AMI)" theme="aws" value={imageId} onChange={setImageId} options={AWS_IMAGES.map((item) => ({ value: item.id, label: `${item.amiTitle ?? item.label}${item.freeTier ? " — Free tier eligible" : ""}` }))} />
              <p className="text-[12px] text-[#545b64]">Virtualization: hvm · ENA enabled: true · Root device type: ebs{image?.amiIds ? ` · ${image.amiIds}` : ""}</p>
              <button type="button" className="w-fit text-[13px] font-bold text-[#0073bb]" onClick={() => setCatalog((open) => !open)}>Browse more AMIs</button>
              {catalog ? (
                <div className="border border-[#d5dbdb] bg-white">
                  <p className="border-b border-[#eaeded] px-3 py-2 text-[13px] font-bold">Quickstart AMIs · My AMIs · AWS Marketplace AMIs · Community AMIs</p>
                  {AWS_IMAGES.map((item) => (
                    <button key={item.id} type="button" className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#f2f8fd]" onClick={() => { setImageId(item.id); setCatalog(false) }}>{item.amiTitle ?? item.label}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
          <Card id="launch-3" title="Instance type">
            <Field id="aws-size-label" label="Instance type">
              <ConsoleSelect id="aws-size" label="Instance type" theme="aws" value={sizeId} onChange={setSizeId} options={AWS_SIZES.map((item) => ({ value: item.id, label: item.id }))} />
            </Field>
            {size ? (
              <div className="overflow-x-auto border border-[#eaeded]">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="bg-[#fafafa] text-[12px]">
                    <tr>{["Instance type", "vCPUs", "Memory", "Network performance", "On-Demand Linux pricing", "Free tier"].map((heading) => <th key={heading} className="px-3 py-2 font-bold">{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2">{size.id}</td>
                      <td className="px-3 py-2">{size.vcpu}</td>
                      <td className="px-3 py-2">{size.ram}</td>
                      <td className="px-3 py-2">Up to 5 Gigabit</td>
                      <td className="px-3 py-2">{hourlyLabel(size.hourlyUsd)}</td>
                      <td className="px-3 py-2">{size.free ? "Eligible" : "Not eligible"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
          <Card id="launch-4" title="Key pair (login)">
            <p className="text-[13px] leading-5 text-[#545b64]">Amazon EC2 uses public-key cryptography to encrypt and decrypt login information. You must specify a key pair when you launch the instance, and then provide the private key when you connect to it.</p>
            <Field id="aws-key-label" label="Key pair name">
              <ConsoleSelect id="aws-key" label="Key pair name" theme="aws" value={proceed ? "__none__" : keyName} onChange={(value) => { setProceed(value === "__none__"); setKeyName(value === "__none__" ? "" : value) }} options={[{ value: "", label: "Select a key pair" }, { value: "__none__", label: "Proceed without a key pair (Not recommended)" }, ...aws.keyPairs.map((key) => ({ value: key.name, label: key.name }))]} />
            </Field>
            <button
              type="button"
              className="w-fit text-[13px] font-bold text-[#0073bb] hover:underline"
              onClick={() => {
                const outcome = dispatch({ type: "aws/key", name: newKey })
                if (outcome.error) setError(outcome.error)
                else {
                  setKeyName(newKey.trim())
                  setProceed(false)
                  setError(null)
                  setKeyMade(true)
                  flash(outcome.message ?? "Successfully created key pair.")
                }
              }}
            >
              Create key pair
            </button>
            <details className="text-[13px]">
              <summary className="w-fit cursor-pointer text-[#0073bb]">Key pair type and file format</summary>
              <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-3">
                <label className="grid gap-1.5 font-bold">Key pair name
                  <Input aria-label="New key pair name" value={newKey} onChange={(event) => setNewKey(event.target.value)} className="h-8 rounded-[2px] font-normal" />
                </label>
                <label className="grid gap-1.5 font-bold">Key pair type
                  <select aria-label="Key pair type" value={keyType} onChange={(event) => setKeyType(event.target.value)} className="h-8 rounded-[2px] border border-[#7d8998] bg-white px-2 font-normal"><option>RSA</option><option>ED25519</option></select>
                </label>
                <label className="grid gap-1.5 font-bold">Private key file format
                  <select aria-label="Private key file format" value={keyFormat} onChange={(event) => setKeyFormat(event.target.value)} className="h-8 rounded-[2px] border border-[#7d8998] bg-white px-2 font-normal"><option>.pem</option><option>.ppk</option></select>
                </label>
              </div>
            </details>
            {proceed ? <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> I acknowledge that I will not be able to connect to the instance unless I already know how to log in.</label> : null}
            {keyMade ? <p className="border border-[#1d8102] bg-[#f2fcf3] px-3 py-2 text-[13px]">Created {newKey}. Key pair type {keyType}. Private key file format {keyFormat}. <button type="button" className="text-[#0073bb] hover:underline" onClick={() => downloadPem(newKey)}>Download private key</button></p> : null}
          </Card>
          <Card
            id="launch-5"
            title="Network settings"
            action={<button type="button" className="text-[13px] font-bold text-[#0073bb] hover:underline" onClick={() => setEditNet((open) => !open)}>{editNet ? "Close" : "Edit"}</button>}
          >
            <dl className="grid gap-x-10 gap-y-3 text-[13px] sm:grid-cols-2">
              <div><dt className="text-[#545b64]">Network</dt><dd className="mt-0.5">{editNet ? <select aria-label="VPC" className="mt-1 h-8 w-fit rounded-[2px] border border-[#7d8998] bg-white px-2"><option>vpc-08f2c1a04b7e93d21 (default)</option></select> : "vpc-08f2c1a04b7e93d21 (default)"}</dd></div>
              <div><dt className="text-[#545b64]">Subnet</dt><dd className="mt-0.5">{editNet ? <select aria-label="Subnet" className="mt-1 h-8 w-fit rounded-[2px] border border-[#7d8998] bg-white px-2"><option>No preference (default subnet in any availability zone)</option></select> : "No preference (default subnet in any availability zone)"}</dd></div>
              <div><dt className="text-[#545b64]">Auto-assign public IP</dt><dd className="mt-0.5">{editNet ? <select aria-label="Auto-assign public IP" className="mt-1 h-8 w-fit rounded-[2px] border border-[#7d8998] bg-white px-2"><option>Enable</option><option>Disable</option></select> : "Enable"}</dd></div>
              <div><dt className="text-[#545b64]">Firewall (security groups)</dt><dd className="mt-0.5">{editNet ? <select aria-label="Firewall" value={firewall} onChange={(event) => setFirewall(event.target.value)} className="mt-1 h-8 w-fit rounded-[2px] border border-[#7d8998] bg-white px-2"><option value="create">Create security group</option><option value="existing">Select existing security group</option></select> : firewall === "create" ? "Create security group" : "Select existing security group"}</dd></div>
            </dl>
            <label className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="inline-flex items-center gap-2"><input type="checkbox" checked readOnly /> Allow SSH traffic from</span>
              <select aria-label="Allow SSH traffic from" value={sshFrom} onChange={(event) => setSshFrom(event.target.value)} className="h-8 w-fit rounded-[2px] border border-[#7d8998] bg-white px-2">
                <option>Anywhere 0.0.0.0/0</option>
                <option>Custom</option>
                <option>My IP</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" readOnly />
              Allow HTTPS traffic from the internet
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={http} onChange={(event) => setHttp(event.target.checked)} />
              Allow HTTP traffic from the internet
            </label>
          </Card>
          <Card
            id="launch-6"
            title="Configure storage"
            action={<div className="flex gap-4 text-[13px]"><button type="button" className={cn(storageView === "simple" && "font-bold text-[#0073bb]")} onClick={() => setStorageView("simple")}>Simple</button><button type="button" className={cn(storageView === "advanced" && "font-bold text-[#0073bb]")} onClick={() => setStorageView("advanced")}>Advanced</button></div>}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
              <span>1x</span>
              <input aria-label="Volume size" type="number" min={8} value={volumeSize} onChange={(event) => setVolumeSize(Number(event.target.value))} className="h-8 w-16 rounded-[2px] border border-[#7d8998] px-2" />
              <span>GiB</span>
              <select aria-label="Volume type" className="h-8 rounded-[2px] border border-[#7d8998] bg-white px-2"><option>gp3</option><option>gp2</option><option>io1</option></select>
              <span>Root volume</span>
              <label className="ml-2 inline-flex items-center gap-2"><input type="checkbox" checked={encrypted} onChange={(event) => setEncrypted(event.target.checked)} /> Encrypted</label>
              {storageView === "advanced" ? <label className="inline-flex items-center gap-2"><input type="checkbox" defaultChecked /> Delete on termination</label> : null}
            </div>
            {extraVolume ? <p className="text-[13px]">1x 20 GiB gp3 · Data volume</p> : null}
            <button type="button" className="w-fit text-[13px] text-[#0073bb] hover:underline" onClick={() => setExtraVolume(true)}>Add new volume</button>
          </Card>
          <details id="launch-7" className="border border-[#d5dbdb] bg-white px-4 py-3">
            <summary className="cursor-pointer text-[18px] font-bold">Advanced details</summary>
            <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
              <div><dt className="text-[#545b64]">Tenancy</dt><dd>Shared - run a shared hardware instance</dd></div>
              <div><dt className="text-[#545b64]">IAM instance profile</dt><dd>None</dd></div>
              <div><dt className="text-[#545b64]">Metadata version</dt><dd>V2 only (token required)</dd></div>
              <div><dt className="text-[#545b64]">Credit specification</dt><dd>Standard</dd></div>
            </dl>
          </details>
          {error ? <p role="alert" className="border border-[#d13212] bg-[#fdf3f1] px-3 py-2 text-[13px] text-[#d13212]">{error}</p> : null}
        </div>
        <aside className="sticky top-4 border border-[#d5dbdb] bg-white p-4">
          <h2 className="text-[18px] font-bold">Summary</h2>
          <label className="mt-4 grid gap-1.5 text-[13px]">
            Number of instances
            <input type="number" min={1} max={1} value={count} onChange={(event) => setCount(Number(event.target.value))} className="h-8 w-24 rounded-sm border border-[#aab7b8] px-2" />
          </label>
          <ol className="mt-4 grid gap-3 text-[13px]">
            {summary.map(([label, value], index) => (
              <li key={label}><a href={`#launch-${index + 1}`} className="text-[#0073bb] hover:underline">{index + 1}. {label}</a><p className="mt-0.5 break-words text-[#16191f]">{value}</p></li>
            ))}
          </ol>
          <button type="submit" className={cn(ORANGE, "mt-4 w-full")}>Launch instance</button>
        </aside>
      </div>
    </form>
  )
}

function KeyPairs({ keys }: { keys: KeyMaterial[] }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[12px] text-[#545b64]">EC2 <span className="px-1">›</span> Key Pairs</p>
      <h1 className="mt-1 text-[28px] font-bold">Key pairs</h1>
      <div className="mt-3 border border-[#d5dbdb] bg-white">
        {keys.length === 0 ? (
          <p className="px-4 py-8 text-[13px] text-[#545b64]">No key pairs</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#fafafa]"><tr>{["Name", "Type", "Fingerprint", "Created", ""].map((heading) => <th key={heading || "dl"} className="px-3 py-2 font-bold">{heading}</th>)}</tr></thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.name} className="border-t border-[#eaeded]">
                  <td className="px-3 py-2">{key.name}</td>
                  <td className="px-3 py-2">RSA</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{key.fingerprint}</td>
                  <td className="px-3 py-2">{new Date(key.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</td>
                  <td className="px-3 py-2"><button type="button" className={GHOST} onClick={() => downloadPem(key.name)}>Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Buckets({ region, buckets }: { region: string; buckets: { name: string; region: string }[] }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="px-5 py-4">
      <h1 className="text-[28px] font-bold">Buckets</h1>
      <p className="mt-1 text-[13px] text-[#545b64]">Amazon S3 · {region}. General purpose buckets.</p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const outcome = dispatch({ type: "aws/bucket", name })
          if (outcome.error) setError(outcome.error)
          else {
            setError(null)
            flash(outcome.message ?? "Successfully created bucket.")
          }
        }}
      >
        <label className="grid gap-1.5 text-[13px]">Bucket name
          <Input id="bucket-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 w-64 rounded-sm" />
        </label>
        <button type="submit" className={ORANGE}>Create bucket</button>
      </form>
      {error ? <p role="alert" className="mt-2 text-[13px] text-[#d13212]">{error}</p> : null}
      <div className="mt-4 border border-[#d5dbdb] bg-white">
        {buckets.length === 0 ? <p className="px-4 py-8 text-[13px] text-[#545b64]">No buckets to display.</p> : (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#fafafa]"><tr><th className="px-3 py-2 font-bold">Name</th><th className="px-3 py-2 font-bold">Region</th><th className="px-3 py-2" /></tr></thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.name} className="border-t border-[#eaeded]">
                  <td className="px-3 py-2 font-mono">{bucket.name}</td>
                  <td className="px-3 py-2">{bucket.region}</td>
                  <td className="px-3 py-2 text-right"><button type="button" className={GHOST} onClick={() => tell(dispatch({ type: "aws/delete-bucket", name: bucket.name }))}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Card({ title, children, id, action }: { title: string; children: React.ReactNode; id?: string; action?: React.ReactNode }) {
  return (
    <section id={id} className="grid gap-3 border border-[#d5dbdb] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[18px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-[13px] font-bold">
      {label}
      <span className="font-normal">{children}</span>
    </label>
  )
}

function CogMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path fill="currentColor" d="M9.2 1.5 9.7 3.2c.3.1.6.3.9.4l1.6-.6 1.2 2-1.3 1.1c.1.3.1.6 0 .9l1.3 1.1-1.2 2-1.6-.6c-.3.2-.6.3-.9.4l-.5 1.7H6.8l-.5-1.7c-.3-.1-.6-.2-.9-.4l-1.6.6-1.2-2 1.3-1.1a3 3 0 0 1 0-.9L2.6 5l1.2-2 1.6.6c.3-.2.6-.3.9-.4L6.8 1.5h2.4ZM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  )
}

function RefreshMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path d="M13 8a5 5 0 1 1-1.4-3.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.8 2.2v3h-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Info() {
  return <span className="grid size-4 place-items-center rounded-full border border-[#545b64] text-[10px] font-bold text-[#545b64]" aria-hidden>i</span>
}

function Caret() {
  return <svg viewBox="0 0 16 16" className="size-3" aria-hidden><path fill="currentColor" d="M3.2 5.6 8 10.8 12.8 5.6z" /></svg>
}

function OsLockup({ name }: { name: string }) {
  if (name === "Amazon Linux") {
    return (
      <span className="grid justify-items-center text-[#232f3e]">
        <span className="text-center text-[13px] font-semibold leading-[15px]">Amazon<br />Linux</span>
        <span className="mt-1.5 text-[18px] font-bold leading-none tracking-tight">aws</span>
        <svg viewBox="0 0 64 16" className="mt-0.5 h-[10px] w-11" aria-hidden>
          <path d="M6 4c14 10 38 10 52 0" fill="none" stroke="#ff9900" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 2.2 62 6.2 53.2 9.2" fill="#ff9900" />
        </svg>
      </span>
    )
  }
  if (name === "macOS") {
    return (
      <span className="grid h-[78px] w-[62px] justify-items-center rounded-[12px] border border-[#d2d2d7] bg-gradient-to-b from-white to-[#f5f5f7] pt-2.5 shadow-[0_1px_1px_rgba(0,0,0,.06)]">
        <BrandGlyph name="apple" className="size-7 text-[#1d1d1f]" />
        <span className="mt-1 text-[11px] font-medium text-[#1d1d1f]">Mac</span>
      </span>
    )
  }
  if (name === "Ubuntu") {
    return (
      <span className="grid justify-items-center">
        <BrandGlyph name="ubuntu" className="size-8 text-[#e95420]" />
        <span className="mt-1 text-[8px] leading-none tracking-wide text-[#666]">Canonical</span>
        <span className="text-[12px] font-medium leading-4 text-[#e95420]">Ubuntu</span>
      </span>
    )
  }
  if (name === "Windows") {
    return (
      <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
        <rect x="2" y="2" width="13" height="13" fill="#f25022" />
        <rect x="17" y="2" width="13" height="13" fill="#7fba00" />
        <rect x="2" y="17" width="13" height="13" fill="#00a4ef" />
        <rect x="17" y="17" width="13" height="13" fill="#ffb900" />
      </svg>
    )
  }
  if (name === "Red Hat") {
    return (
      <span className="grid justify-items-center gap-1">
        <BrandGlyph name="redhat" className="h-8 w-10 text-[#ee0000]" />
        <span className="text-[11px] font-bold leading-none text-[#111]">Red Hat</span>
      </span>
    )
  }
  return (
    <span className="grid justify-items-center gap-0.5">
      <BrandGlyph name="suse" className="size-9 text-[#30ba78]" />
      <span className="text-[12px] font-bold tracking-[0.14em] text-[#173f35]">SUSE</span>
    </span>
  )
}
