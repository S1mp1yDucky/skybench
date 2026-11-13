"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AccountForm, SignInCard } from "@/components/account-form"
import { BillingPanel } from "@/components/billing-panel"
import { AwsRegionMenu, ConsoleFrame } from "@/components/console-frame"
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
import { AWS_IMAGES, AWS_REGIONS, AWS_SIZES, STUDENT, STUDIES } from "@/lib/catalog"
import { hourlyLabel, usd } from "@/lib/format"
import { platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { awsSteps } from "@/lib/steps"
import { cn } from "@/lib/utils"
import type { KeyMaterial, Vm } from "@/lib/types"

const ORANGE = "inline-flex h-8 items-center justify-center rounded-sm bg-[#ec7211] px-3 text-[14px] font-bold text-white hover:bg-[#eb5f07] disabled:cursor-not-allowed disabled:opacity-50"
const GHOST = "inline-flex h-8 items-center justify-center rounded-sm border border-[#8d9aa8] bg-white px-3 text-[14px] text-[#16191f] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-40"

export function AwsConsole() {
  const lab = useLabState()
  const aws = lab.aws
  const [view, setView] = useState("home")
  const [connectId, setConnectId] = useState<string | null>(null)
  const [killId, setKillId] = useState<string | null>(null)
  const stage = !aws.reviewedSite ? "study" : !aws.accountCreated ? "signup" : !aws.signedIn ? "signin" : view
  const metering = aws.instances.some((vm) => vm.state === "running")
  const now = useNow(stage === "billing" || metering)
  const spend = now == null ? 0 : platformCost(lab, "aws", now)
  const alert =
    now != null && spend > aws.budgetUsd
      ? `Simulated spend is ${usd(spend)}, past the ${usd(aws.budgetUsd)} alert. Terminate unused instances.`
      : null
  const connectVm = aws.instances.find((vm) => vm.id === connectId) ?? null
  const killVm = aws.instances.find((vm) => vm.id === killId) ?? null

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
            if (outcome.error) toast.error(outcome.error)
          }}
        />
      }
      nav={[
        { id: "home", label: "EC2 Dashboard" },
        { id: "ec2", label: "Instances" },
        { id: "launch", label: "Launch instance" },
        { id: "keys", label: "Key Pairs" },
        { id: "s3", label: "S3" },
        { id: "shell", label: "VMware shell" },
        { id: "billing", label: "Billing and Cost Management" },
        { id: "study", label: "Products and pricing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!aws.reviewedSite || !aws.accountCreated || !aws.signedIn}
      steps={awsSteps(lab)}
      alert={alert}
    >
      {stage === "study" && !aws.reviewedSite ? (
        <Ec2Home
          region={aws.region}
          instances={aws.instances}
          onLaunch={() => undefined}
          onOpenInstances={() => undefined}
          continueLabel="Continue to account setup"
          onContinue={() => dispatch({ type: "aws/review" })}
        />
      ) : null}
      {stage === "study" && aws.reviewedSite ? (
        <div className="p-6">
          <StudyView study={STUDIES.aws} continueLabel="Back to instances" onContinue={() => setView("ec2")} />
        </div>
      ) : null}
      {stage === "home" ? (
        <Ec2Home region={aws.region} instances={aws.instances} onLaunch={() => setView("launch")} onOpenInstances={() => setView("ec2")} />
      ) : null}
      {stage === "signup" ? (
        <div className="p-6">
          <AccountForm
            accent="aws"
            heading="Create an AWS account"
            lede="A real account asks for a card after this form. Skybench stops before that and keeps the rest of the practical on this machine."
            ack="I understand a real AWS account requires a debit or credit card. This lab does not collect one, does not send SMS, and discards the password and verification code."
            emailDefault={STUDENT.email}
            onCreate={({ email }) => dispatch({ type: "aws/signup", email })}
          />
        </div>
      ) : null}
      {stage === "signin" ? (
        <div className="p-6">
          <SignInCard accent="aws" email={aws.email} onSignIn={() => dispatch({ type: "aws/signin" })} />
        </div>
      ) : null}
      {stage === "ec2" ? (
        <InstanceTable
          region={aws.region}
          instances={aws.instances}
          onLaunch={() => setView("launch")}
          onConnect={setConnectId}
          onStop={(id) => tell(dispatch({ type: "aws/stop", id }))}
          onStart={(id) => tell(dispatch({ type: "aws/start", id }))}
          onTerminate={setKillId}
        />
      ) : null}
      {stage === "launch" ? <LaunchInstance onDone={() => setView("ec2")} /> : null}
      {stage === "keys" ? <KeyPairs keys={aws.keyPairs} /> : null}
      {stage === "s3" ? <Buckets region={aws.region} buckets={aws.buckets} /> : null}
      {stage === "shell" ? (
        <div className="grid gap-3 p-6">
          <h1 className="text-[28px] font-bold">CloudShell</h1>
          <p className="max-w-2xl text-[13px] leading-5 text-[#545b64]">
            The practical installs AWS CLI on the local Ubuntu guest, then connects to the instance. This is that guest. The cloud VM is a second prompt after ssh.
          </p>
          <Terminal platform="aws" />
        </div>
      ) : null}
      {stage === "billing" ? (
        <div className="p-6">
          <BillingPanel
            title="Billing and Cost Management"
            note="EC2 compute in this model bills only while the instance is running. On a real account, an EBS volume can keep costing money after you stop it. Termination is the cleanup the practical asks for."
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate instance {killVm?.id}?</DialogTitle>
            <DialogDescription>
              On termination, the instance and its root volume are deleted. This stops the simulated meter. A real account deletes the instance unless you kept the volume on purpose.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setKillId(null)}>Keep it</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!killVm) return
                tell(dispatch({ type: "aws/terminate", id: killVm.id }))
                setKillId(null)
              }}
            >
              Terminate
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
}: {
  region: string
  instances: Vm[]
  onLaunch: () => void
  onOpenInstances: () => void
  continueLabel?: string
  onContinue?: () => void
}) {
  const visible = instances.filter((vm) => vm.state !== "terminated")
  const running = visible.filter((vm) => vm.state === "running").length
  const resources: [string, string, (() => void) | undefined][] = [
    ["Instances (running)", String(running), onOpenInstances],
    ["Dedicated Hosts", "0", undefined],
    ["Instances", String(visible.length), onOpenInstances],
    ["Capacity Reservations", "0", undefined],
    ["Elastic IPs", "0", undefined],
    ["Key pairs", "0", undefined],
    ["Load balancers", "0", undefined],
    ["Placement groups", "0", undefined],
    ["Security groups", "1", undefined],
    ["Snapshots", "0", undefined],
    ["Volumes", String(visible.length), undefined],
    ["Auto Scaling groups", "0", undefined],
  ]
  return (
    <div className="px-5 py-4">
      {continueLabel && onContinue ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#0073bb] bg-[#f2f8fd] px-3 py-2">
          <p>Review the EC2 console. A real account is created on aws.amazon.com. This lab records that you reviewed it.</p>
          <button type="button" className={ORANGE} onClick={onContinue}>{continueLabel}</button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-[28px] leading-9 font-bold">
          EC2 Dashboard
          <Info />
        </h1>
        <button type="button" className={ORANGE} onClick={onLaunch}>Launch instance</button>
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4">
          <section className="border border-[#d5dbdb] bg-white">
            <header className="flex items-center justify-between border-b border-[#eaeded] px-4 py-3">
              <h2 className="text-[18px] font-bold">Resources</h2>
              <span className="text-[#545b64]" aria-hidden>⚙</span>
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
              <button type="button" className={cn(ORANGE, "mt-3")} onClick={onLaunch}>Launch instance</button>
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
            <span aria-hidden>↻</span>
          </header>
          <div className="px-4 py-3">
            <p className="text-[12px] font-bold text-[#545b64]">Settings</p>
            <ul className="mt-2 grid gap-1.5 text-[13px] text-[#0073bb]">
              {["Data protection and security", "Allowed AMIs", "Zones", "EC2 Serial Console", "Default credit specification", "Managed resources", "EC2 console preferences"].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-2 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-[#545b64]">Supported platforms</dt><dd>VPC</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#545b64]">Default VPC</dt><dd className="font-mono text-[12px]">vpc-0a438202</dd></div>
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
}: {
  region: string
  instances: Vm[]
  onLaunch: () => void
  onConnect: (id: string) => void
  onStop: (id: string) => void
  onStart: (id: string) => void
  onTerminate: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const visible = instances.filter((vm) => vm.state !== "terminated").filter((vm) => {
    const blob = `${vm.name} ${vm.id} ${vm.publicIp ?? ""} ${vm.sizeId}`.toLowerCase()
    return blob.includes(query.trim().toLowerCase())
  })
  return (
    <div className="px-5 py-4">
      <p className="text-[12px] text-[#545b64]">EC2 <span className="px-1">›</span> Instances</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-[28px] font-bold">Instances <Info /></h1>
      </div>
      <div className="mt-3 border border-[#d5dbdb] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eaeded] px-3 py-2">
          <button type="button" className={ORANGE} onClick={onLaunch}>Launch instances</button>
          <button type="button" className={GHOST} disabled>Instance state</button>
          <button type="button" className={GHOST} disabled>Actions</button>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find instance by attribute or tag (case-sensitive)" className="ml-auto h-8 w-full max-w-sm rounded-sm border border-[#aab7b8] px-2 text-[13px] outline-none focus:border-[#0073bb]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <caption className="sr-only">EC2 instances</caption>
            <thead className="bg-[#fafafa] text-[12px] text-[#16191f]">
              <tr className="border-b border-[#eaeded]">
                {["", "Name", "Instance ID", "Instance state", "Instance type", "Status check", "Availability Zone", "Public IPv4 address", "Security group name", "Key name", ""].map((heading, index) => (
                  <th key={`${heading}-${index}`} className="px-3 py-2 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-[#545b64]">No instances to display</td>
                </tr>
              ) : (
                visible.map((vm) => (
                  <tr key={vm.id} className={cn("border-b border-[#eaeded] hover:bg-[#fafafa]", selected === vm.id && "bg-[#f2f8fd]")} onClick={() => setSelected(vm.id)}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selected === vm.id} onChange={() => setSelected(vm.id)} aria-label={`Select ${vm.name}`} /></td>
                    <td className="px-3 py-2">{vm.name}</td>
                    <td className="px-3 py-2 font-mono text-[12px] text-[#0073bb]">{vm.id}</td>
                    <td className="px-3 py-2"><StateBadge state={vm.state} provider="aws" /></td>
                    <td className="px-3 py-2">{vm.sizeId}</td>
                    <td className="px-3 py-2">{vm.state === "running" ? "2/2 checks passed" : "—"}</td>
                    <td className="px-3 py-2">{region}a</td>
                    <td className="px-3 py-2 font-mono text-[12px]">{vm.publicIp ?? "—"}</td>
                    <td className="px-3 py-2 text-[#0073bb]">{vm.allowHttp ? "launch-wizard-http" : "launch-wizard-1"}</td>
                    <td className="px-3 py-2">{vm.keyName}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 whitespace-nowrap">
                        <button type="button" className="text-[#0073bb] hover:underline disabled:text-[#aab7b8]" disabled={vm.state !== "running"} onClick={() => onConnect(vm.id)}>Connect</button>
                        <button type="button" className="text-[#0073bb] hover:underline disabled:text-[#aab7b8]" disabled={vm.state !== "running"} onClick={() => onStop(vm.id)}>Stop</button>
                        <button type="button" className="text-[#0073bb] hover:underline disabled:text-[#aab7b8]" disabled={vm.state !== "stopped"} onClick={() => onStart(vm.id)}>Start</button>
                        <button type="button" className="text-[#0073bb] hover:underline" onClick={() => onTerminate(vm.id)}>Terminate</button>
                      </div>
                    </td>
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
  { id: "ami-al2023", name: "Amazon Linux", free: true },
  { id: "mac", name: "macOS", free: false },
  { id: "ami-ubuntu2204", name: "Ubuntu", free: true },
  { id: "win", name: "Windows", free: false },
  { id: "rhel", name: "Red Hat", free: false },
  { id: "suse", name: "SUSE Linux", free: false },
  { id: "deb", name: "Debian", free: false },
]

function LaunchInstance({ onDone }: { onDone: () => void }) {
  const aws = useLabState().aws
  const [name, setName] = useState("web-1")
  const [imageId, setImageId] = useState(AWS_IMAGES[0].id)
  const [osHint, setOsHint] = useState<string | null>(null)
  const [sizeId, setSizeId] = useState(AWS_SIZES[0].id)
  const [keyName, setKeyName] = useState(aws.keyPairs[0]?.name ?? "")
  const [newKey, setNewKey] = useState("skybench")
  const [http, setHttp] = useState(false)
  const [count, setCount] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const size = AWS_SIZES.find((item) => item.id === sizeId)
  const image = AWS_IMAGES.find((item) => item.id === imageId)
  const summary = useMemo(() => [
    ["Name", name || "—"],
    ["AMI", image?.label ?? "—"],
    ["Instance type", sizeId],
    ["Key pair", keyName || "—"],
    ["Security group", http ? "launch-wizard-http" : "launch-wizard-1"],
    ["Storage", "1 volume, 8 GiB gp3"],
  ], [name, image, sizeId, keyName, http])

  return (
    <form
      className="px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (count !== 1) {
          setError("This lab launches one instance at a time.")
          return
        }
        const outcome = dispatch({ type: "aws/launch", name, imageId, sizeId, keyName, allowHttp: http })
        if (outcome.error) setError(outcome.error)
        else {
          toast.success(outcome.message ?? "Launching.")
          onDone()
        }
      }}
    >
      <p className="text-[12px] text-[#545b64]">EC2 <span className="px-1">›</span> Instances <span className="px-1">›</span> Launch an instance</p>
      <h1 className="mt-1 flex items-center gap-2 text-[28px] font-bold">Launch an instance <Info /></h1>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4">
          <Card title="Name and tags">
            <Field id="aws-name" label="Name">
              <Input id="aws-name" value={name} onChange={(event) => setName(event.target.value)} className="h-8 max-w-md rounded-sm" />
            </Field>
            <p className="text-[12px] text-[#545b64]">The name is a tag. Key: Name. Value: the name you enter.</p>
          </Card>
          <Card title="Application and OS Images (Amazon Machine Image)">
            <p className="text-[13px] font-bold">Quick Start</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK.map((os) => {
                const known = AWS_IMAGES.some((item) => item.id === os.id)
                const selected = known && imageId === os.id
                return (
                  <button
                    key={os.name}
                    type="button"
                    onClick={() => {
                      if (known) {
                        setImageId(os.id)
                        setOsHint(null)
                      } else setOsHint(`${os.name} is listed in Quick Start. This practical uses Amazon Linux 2023 or Ubuntu Server 22.04 LTS.`)
                    }}
                    className={cn("grid h-[72px] w-[104px] place-items-center rounded-sm border bg-white text-[13px]", selected ? "border-[#0073bb] ring-1 ring-[#0073bb]" : "border-[#d5dbdb] hover:border-[#0073bb]")}
                  >
                    <OsMark name={os.name} />
                    <span>{os.name}</span>
                    {os.free && known ? <span className="text-[10px] text-[#1d8102]">Free tier eligible</span> : null}
                  </button>
                )
              })}
            </div>
            {osHint ? <p className="text-[13px] text-[#6a4b12]">{osHint}</p> : null}
            <Field id="aws-ami" label="Amazon Machine Image (AMI)">
              <select id="aws-image" value={imageId} onChange={(event) => setImageId(event.target.value)} className="h-8 w-full max-w-xl rounded-sm border border-[#aab7b8] bg-white px-2">
                {AWS_IMAGES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label} AMI · user {item.username} · 64-bit (x86)</option>
                ))}
              </select>
            </Field>
            <p className="text-[12px] text-[#545b64]">Architecture: 64-bit (x86)</p>
          </Card>
          <Card title="Instance type">
            <Field id="aws-size" label="Instance type">
              <select id="aws-size" value={sizeId} onChange={(event) => setSizeId(event.target.value)} className="h-8 w-full max-w-md rounded-sm border border-[#aab7b8] bg-white px-2">
                {AWS_SIZES.map((item) => (
                  <option key={item.id} value={item.id}>{item.id}</option>
                ))}
              </select>
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
            {size ? <p className="text-[12px] text-[#545b64]">{size.note}</p> : null}
          </Card>
          <Card title="Key pair (login)">
            <p className="text-[13px] leading-5 text-[#545b64]">You can use an existing key pair, or create a new key pair. EC2 uses the public key to encrypt the login password, and you use the private key to decrypt it.</p>
            <Field id="aws-key-label" label="Key pair name">
              <select id="aws-key" value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-8 w-full max-w-md rounded-sm border border-[#aab7b8] bg-white px-2">
                <option value="">Select a key pair</option>
                {aws.keyPairs.map((key) => (
                  <option key={key.name} value={key.name}>{key.name}</option>
                ))}
              </select>
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Input aria-label="New key pair name" value={newKey} onChange={(event) => setNewKey(event.target.value)} className="h-8 max-w-52 rounded-sm" />
              <button
                type="button"
                className={GHOST}
                onClick={() => {
                  const outcome = dispatch({ type: "aws/key", name: newKey })
                  if (outcome.error) setError(outcome.error)
                  else {
                    setKeyName(newKey.trim())
                    setError(null)
                    toast.success(outcome.message ?? "Key created.")
                  }
                }}
              >
                Create key pair
              </button>
            </div>
            <p className="text-[12px] text-[#545b64]">Key pair type RSA, private key file format .pem. The download on the Key Pairs page is a lab prop, not a private key.</p>
          </Card>
          <Card title="Network settings">
            <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
              <div><dt className="text-[#545b64]">VPC</dt><dd>vpc-0a438202 (default)</dd></div>
              <div><dt className="text-[#545b64]">Subnet</dt><dd>No preference (default subnet in any AZ)</dd></div>
              <div><dt className="text-[#545b64]">Auto-assign public IP</dt><dd>Enable</dd></div>
              <div><dt className="text-[#545b64]">Firewall</dt><dd>Create security group</dd></div>
            </dl>
            <p className="text-[13px] font-bold">Inbound security group rules</p>
            <div className="overflow-x-auto border border-[#eaeded]">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#fafafa]"><tr>{["Type", "Protocol", "Port range", "Source"].map((heading) => <th key={heading} className="px-3 py-2 font-bold">{heading}</th>)}</tr></thead>
                <tbody>
                  <tr className="border-t border-[#eaeded]"><td className="px-3 py-2">ssh</td><td className="px-3 py-2">TCP</td><td className="px-3 py-2">22</td><td className="px-3 py-2">0.0.0.0/0</td></tr>
                  {http ? <tr className="border-t border-[#eaeded]"><td className="px-3 py-2">http</td><td className="px-3 py-2">TCP</td><td className="px-3 py-2">80</td><td className="px-3 py-2">0.0.0.0/0</td></tr> : null}
                </tbody>
              </table>
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={http} onChange={(event) => setHttp(event.target.checked)} />
              Allow HTTP traffic from the internet
            </label>
          </Card>
          <Card title="Configure storage">
            <div className="overflow-x-auto border border-[#eaeded]">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-[#fafafa]"><tr>{["Volume", "Size (GiB)", "Type", "IOPS", "Delete on termination"].map((heading) => <th key={heading} className="px-3 py-2 font-bold">{heading}</th>)}</tr></thead>
                <tbody><tr><td className="px-3 py-2">Root</td><td className="px-3 py-2">8</td><td className="px-3 py-2">gp3</td><td className="px-3 py-2">3000</td><td className="px-3 py-2">Yes</td></tr></tbody>
              </table>
            </div>
          </Card>
          <details className="border border-[#d5dbdb] bg-white px-4 py-3">
            <summary className="cursor-pointer text-[18px] font-bold">Advanced details</summary>
            <p className="mt-2 text-[13px] text-[#545b64]">Tenancy: Shared. IAM instance profile: None. Metadata version: V2 only. Credit specification: standard. These stay at the console defaults for this practical.</p>
          </details>
          {error ? <p role="alert" className="border border-[#d13212] bg-[#fdf3f1] px-3 py-2 text-[13px] text-[#d13212]">{error}</p> : null}
        </div>
        <aside className="sticky top-4 border border-[#d5dbdb] bg-white p-4">
          <h2 className="text-[18px] font-bold">Summary</h2>
          <label className="mt-3 grid gap-1 text-[13px]">
            Number of instances
            <input type="number" min={1} max={1} value={count} onChange={(event) => setCount(Number(event.target.value))} className="h-8 w-24 rounded-sm border border-[#aab7b8] px-2" />
          </label>
          <dl className="mt-3 grid gap-2 text-[13px]">
            {summary.map(([label, value]) => (
              <div key={label}><dt className="text-[#545b64]">{label}</dt><dd className="break-words">{value}</dd></div>
            ))}
          </dl>
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
          <p className="px-4 py-8 text-[13px] text-[#545b64]">No key pairs to display. Create one from Launch an instance, or with aws ec2 create-key-pair in CloudShell.</p>
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
  const [name, setName] = useState("talal-notes")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="px-5 py-4">
      <h1 className="text-[28px] font-bold">Buckets</h1>
      <p className="mt-1 text-[13px] text-[#545b64]">Amazon S3 · {region}. Names in this lab stay in the browser. They are not the real global S3 namespace.</p>
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const outcome = dispatch({ type: "aws/bucket", name })
          if (outcome.error) setError(outcome.error)
          else {
            setError(null)
            toast.success(outcome.message ?? "Bucket created.")
          }
        }}
      >
        <label className="grid gap-1 text-[13px]">Bucket name
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border border-[#d5dbdb] bg-white p-4">
      <h2 className="text-[18px] font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="grid gap-1 text-[13px] font-bold">
      {label}
      <span className="font-normal">{children}</span>
    </label>
  )
}

function Info() {
  return <span className="grid size-4 place-items-center rounded-full border border-[#545b64] text-[10px] font-bold text-[#545b64]" aria-hidden>i</span>
}

function OsMark({ name }: { name: string }) {
  const letter = name.slice(0, 1)
  return <span className="grid size-6 place-items-center rounded-sm bg-[#232f3e] text-[12px] font-bold text-white">{letter}</span>
}
