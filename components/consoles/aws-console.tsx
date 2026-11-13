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
import { AWS_IMAGES, AWS_REGIONS, AWS_SIZES, STUDENT, STUDIES } from "@/lib/catalog"
import { hourlyLabel, usd } from "@/lib/format"
import { platformCost } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { awsSteps } from "@/lib/steps"
import type { Vm } from "@/lib/types"

const CTA = "h-10 bg-[#ff9900] text-[#16191f] hover:bg-[#ec8d00]"

export function AwsConsole() {
  const lab = useLabState()
  const aws = lab.aws
  const [view, setView] = useState("ec2")
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
      account={aws.signedIn ? aws.email : "Signed out"}
      region={
        aws.signedIn ? (
          <span className="flex items-center gap-2">
            <RegionSelect
              label="AWS region"
              value={aws.region}
              options={AWS_REGIONS}
              onChange={(region) => {
                const outcome = dispatch({ type: "aws/region", region })
                if (outcome.error) toast.error(outcome.error)
              }}
            />
            <Button type="button" variant="ghost" className="text-white hover:bg-white/10" onClick={() => dispatch({ type: "aws/signout" })}>
              Sign out
            </Button>
          </span>
        ) : null
      }
      nav={[
        { id: "ec2", label: "EC2 instances" },
        { id: "launch", label: "Launch instance" },
        { id: "keys", label: "Key pairs" },
        { id: "s3", label: "S3 buckets" },
        { id: "shell", label: "VMware shell" },
        { id: "billing", label: "Billing" },
        { id: "study", label: "Products and pricing" },
      ]}
      active={stage}
      onNavigate={setView}
      locked={!aws.reviewedSite || !aws.accountCreated || !aws.signedIn}
      steps={awsSteps(lab)}
      alert={alert}
    >
      {stage === "study" ? (
        <StudyView
          study={STUDIES.aws}
          continueLabel={aws.accountCreated ? "Back to instances" : "Continue to account setup"}
          onContinue={() => {
            if (!aws.reviewedSite) dispatch({ type: "aws/review" })
            else setView("ec2")
          }}
        />
      ) : null}
      {stage === "signup" ? (
        <AccountForm
          heading="Create an AWS account"
          lede="A real account asks for a card after this form. Skybench stops before that and keeps the rest of the practical on this machine."
          ack="I understand a real AWS account requires a debit or credit card. This lab does not collect one, does not send SMS, and discards the password and verification code."
          emailDefault={STUDENT.email}
          onCreate={({ email }) => dispatch({ type: "aws/signup", email })}
        />
      ) : null}
      {stage === "signin" ? (
        <SignInCard email={aws.email} onSignIn={() => dispatch({ type: "aws/signin" })} />
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
        <div className="grid gap-3">
          <h1 className="font-heading text-3xl">VMware shell</h1>
          <p className="max-w-2xl text-sm leading-6 text-[#4d463c]">
            The assignment installs AWS CLI on a local Ubuntu guest, then SSHs to the instance. This panel is that guest. The cloud VM is a second prompt after ssh.
          </p>
          <Terminal platform="aws" />
        </div>
      ) : null}
      {stage === "billing" ? (
        <BillingPanel
          title="Billing"
          note="EC2 compute in this model bills only while the instance is running. On a real account, an EBS volume can keep costing money after you stop it. Termination is the cleanup the practical asks for."
          budget={aws.budgetUsd}
          vms={aws.instances}
          now={now}
          fastForward={{ type: "aws/fast-forward" }}
          onBudget={(amount) => ({ type: "aws/budget", amount })}
        />
      ) : null}
      <ConnectDialog platform="aws" vm={connectVm} open={connectVm != null} onOpenChange={(open) => !open && setConnectId(null)} />
      <Dialog open={killVm != null} onOpenChange={(open) => !open && setKillId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate {killVm?.name}?</DialogTitle>
            <DialogDescription>
              The simulated instance leaves the meter. On a real account, termination deletes the instance and its store-backed disk unless you kept the volume on purpose.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setKillId(null)}>
              Keep it
            </Button>
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
  const visible = instances.filter((vm) => vm.state !== "terminated")
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl">Instances</h1>
          <p className="mt-1 text-sm text-[#4d463c]">Region {region}. Public addresses use the documentation range 203.0.113.0/24.</p>
        </div>
        <Button type="button" className={CTA} onClick={onLaunch}>
          Launch instance
        </Button>
      </div>
      {instances.some((vm) => vm.state === "stopped") ? (
        <p className="text-sm text-[#6a4b12]">A stopped instance is not cleaned up. Terminate it when the practical is finished. Storage can still cost money on a real account.</p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">EC2 instances</caption>
          <thead className="border-b text-xs tracking-wide text-[#6d6256] uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Instance ID</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Public IP</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[#4d463c]">
                  No instances in {region}. Launch one, connect with SSH, and run uname -a.
                </td>
              </tr>
            ) : (
              visible.map((vm) => (
                <tr key={vm.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{vm.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{vm.id}</td>
                  <td className="px-3 py-2"><StateBadge state={vm.state} /></td>
                  <td className="px-3 py-2">{vm.sizeId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{vm.publicIp ?? "pending"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="outline" disabled={vm.state !== "running"} onClick={() => onConnect(vm.id)}>
                        Connect
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={vm.state !== "running"} onClick={() => onStop(vm.id)}>
                        Stop
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={vm.state !== "stopped"} onClick={() => onStart(vm.id)}>
                        Start
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => onTerminate(vm.id)}>
                        Terminate
                      </Button>
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

function LaunchInstance({ onDone }: { onDone: () => void }) {
  const aws = useLabState().aws
  const [name, setName] = useState("web-1")
  const [imageId, setImageId] = useState(AWS_IMAGES[0].id)
  const [sizeId, setSizeId] = useState(AWS_SIZES[0].id)
  const [keyName, setKeyName] = useState(aws.keyPairs[0]?.name ?? "")
  const [newKey, setNewKey] = useState("skybench")
  const [http, setHttp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const size = AWS_SIZES.find((item) => item.id === sizeId)

  return (
    <form
      className="mx-auto grid max-w-2xl gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const outcome = dispatch({
          type: "aws/launch",
          name,
          imageId,
          sizeId,
          keyName,
          allowHttp: http,
        })
        if (outcome.error) setError(outcome.error)
        else {
          toast.success(outcome.message ?? "Launching.")
          onDone()
        }
      }}
    >
      <div>
        <h1 className="font-heading text-3xl">Launch instance</h1>
        <p className="mt-2 text-sm leading-6 text-[#4d463c]">Choose a free-tier size unless you want the billing page to show a larger illustrative rate.</p>
      </div>
      <Labeled id="aws-name" label="Name">
        <Input id="aws-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Labeled>
      <Labeled id="aws-image" label="Image">
        <NativeSelect id="aws-image" value={imageId} onChange={setImageId}>
          {AWS_IMAGES.map((image) => (
            <option key={image.id} value={image.id}>
              {image.label} · user {image.username}
            </option>
          ))}
        </NativeSelect>
      </Labeled>
      <Labeled id="aws-size" label="Instance type">
        <NativeSelect id="aws-size" value={sizeId} onChange={setSizeId}>
          {AWS_SIZES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {item.ram} · {hourlyLabel(item.hourlyUsd)}{item.free ? " · free-tier eligible" : ""}
            </option>
          ))}
        </NativeSelect>
      </Labeled>
      {size ? <p className="text-xs leading-5 text-[#6d6256]">{size.note}</p> : null}
      <div className="grid gap-2 rounded-xl border border-black/10 bg-white p-3">
        <Labeled id="aws-key" label="Key pair">
          <NativeSelect id="aws-key" value={keyName} onChange={setKeyName}>
            <option value="">Select a key pair</option>
            {aws.keyPairs.map((key) => (
              <option key={key.name} value={key.name}>
                {key.name}
              </option>
            ))}
          </NativeSelect>
        </Labeled>
        {aws.keyPairs.length === 0 ? (
          <p className="text-sm text-[#6a4b12]">No key pair yet. Create one here. The .pem download is a prop, not a private key.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Input aria-label="New key pair name" value={newKey} onChange={(event) => setNewKey(event.target.value)} className="max-w-48" />
          <Button
            type="button"
            variant="outline"
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
          </Button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={http} onChange={(event) => setHttp(event.target.checked)} />
        Also allow HTTP on port 80. SSH on port 22 is always opened in this lab.
      </label>
      {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
      <Button type="submit" className={CTA}>Launch</Button>
    </form>
  )
}

function KeyPairs({ keys }: { keys: { name: string; fingerprint: string; publicKey: string }[] }) {
  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-3xl">Key pairs</h1>
      {keys.length === 0 ? (
        <p className="text-sm text-[#4d463c]">No key pairs yet. Create one from Launch instance or with aws ec2 create-key-pair in the shell.</p>
      ) : (
        <ul className="grid gap-2">
          {keys.map((key) => (
            <li key={key.name} className="rounded-xl border border-black/10 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{key.name}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => downloadPem(key.name)}>
                  Download prop .pem
                </Button>
              </div>
              <p className="mt-1 font-mono text-xs text-[#6d6256]">{key.fingerprint}</p>
              <p className="mt-2 break-all font-mono text-xs">{key.publicKey}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Buckets({ region, buckets }: { region: string; buckets: { name: string; region: string }[] }) {
  const [name, setName] = useState("hassan-notes")
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-heading text-3xl">S3 buckets</h1>
        <p className="mt-1 text-sm text-[#4d463c]">Object storage in {region}. Names are local to this lab, not the real global S3 namespace.</p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
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
        <Labeled id="bucket-name" label="Bucket name">
          <Input id="bucket-name" value={name} onChange={(event) => setName(event.target.value)} className="w-56" />
        </Labeled>
        <Button type="submit" className={CTA}>Create bucket</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-[#8a2e24]">{error}</p> : null}
      {buckets.length === 0 ? (
        <p className="text-sm text-[#4d463c]">No buckets yet. Names must be lowercase.</p>
      ) : (
        <ul className="grid gap-2">
          {buckets.map((bucket) => (
            <li key={bucket.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <span className="font-mono text-sm">s3://{bucket.name}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => tell(dispatch({ type: "aws/delete-bucket", name: bucket.name }))}>
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
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-lg border border-input bg-white px-2 text-sm"
    >
      {children}
    </select>
  )
}
