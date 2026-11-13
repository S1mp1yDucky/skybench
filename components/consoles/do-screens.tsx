"use client"

import { useState } from "react"
import { flash } from "@/lib/flash"
import { DO_IMAGES, DO_REGIONS, DO_SIZES } from "@/lib/catalog"
import { dispatch, useLabState } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Vm } from "@/lib/types"

const DISKS: Record<string, string> = {
  "s-1vcpu-512mb-10gb": "10 GB",
  "s-1vcpu-1gb": "25 GB",
  "s-1vcpu-2gb": "50 GB",
}
const TRANSFER: Record<string, string> = {
  "s-1vcpu-512mb-10gb": "500 GiB",
  "s-1vcpu-1gb": "1 TB",
  "s-1vcpu-2gb": "2 TB",
}

export function DoHome({ onCreate, onProject, onBilling, onSignUp }: { onCreate: () => void; onProject: () => void; onBilling: () => void; onSignUp?: () => void }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8">
      <div>
        <p className="text-[13px] text-[#8b969c]">Friday, Nov 13, 2026</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[32px] font-semibold tracking-tight">Welcome aboard!</h1>
          {onSignUp ? <button type="button" onClick={onSignUp} className="h-9 rounded-full bg-[#7ebac2] px-4 text-[14px] font-semibold text-[#102226]">Sign up</button> : null}
        </div>
        <p className="mt-3 inline-flex items-center gap-2 text-[14px]"><TeamDot /> My Team</p>
      </div>
      <article className="grid overflow-hidden rounded-xl border border-[#2c3438] bg-[#171c1e] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-6">
          <p className="text-[12px] text-[#8b969c]">DigitalOcean Signals <span className="float-right">1/6</span></p>
          <h2 className="mt-3 text-[22px] font-semibold">See How Your Agents Really Behave in Production</h2>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#b7c0c4]">Signals watches production traffic on Managed Agents and Serverless Inference, flagging problems across user sentiment, tool execution, and infrastructure, with nothing extra to instrument. Any flagged session becomes an evaluation scenario in one click.</p>
          <button type="button" className="mt-5 h-9 rounded-full border border-[#7ebac2] px-4 text-[14px] text-[#d7eef1]" onClick={() => flash("Signals stays a preview in this lab.")}>Enable Signals</button>
        </div>
        <div className="grid min-h-40 place-items-center bg-[#10181a]" aria-hidden>
          <svg viewBox="0 0 220 160" className="h-36 w-56">
            <circle cx="110" cy="80" r="58" fill="none" stroke="#7ebac2" strokeOpacity="0.35" />
            <circle cx="110" cy="80" r="36" fill="none" stroke="#e8a15a" strokeOpacity="0.8" />
            <circle cx="110" cy="80" r="16" fill="none" stroke="#7ebac2" />
          </svg>
        </div>
      </article>
      <section>
        <h2 className="text-[14px] font-semibold">Quick Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill onClick={() => flash("Support tickets are not sent from this lab.")}>Create a ticket</Pill>
          <Pill onClick={() => flash("This lab has one team: My Team.")}>Invite team members</Pill>
          <Pill onClick={onBilling}>View billing</Pill>
          <Pill onClick={onCreate}>Create a Droplet</Pill>
          <Pill onClick={() => flash("Resource alerts are not collected in this lab.")}>Create resource alerts</Pill>
          <Pill onClick={onProject}>Create a Project</Pill>
        </div>
      </section>
      <section>
        <h2 className="text-[14px] font-semibold">Finish your onboarding</h2>
        <button type="button" onClick={() => flash("The $5 signup credit stands in for a payment method. No card is collected.")} className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#2c3438] bg-[#171c1e] px-4 py-4 text-left">
          <span>
            <span className="block text-[15px] font-semibold">Add a Payment Method</span>
            <span className="mt-1 block text-[13px] text-[#8b969c]">Activate your account and start creating resources.</span>
          </span>
          <span aria-hidden className="text-[#8b969c]">→</span>
        </button>
      </section>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold">The Daily Tide</h2>
          <div className="flex gap-2 text-[13px] text-[#7ebac2]">
            <span className="rounded-full border border-[#3a4248] px-3 py-1">Blogs</span>
            <span className="rounded-full border border-[#3a4248] px-3 py-1">Tutorials</span>
          </div>
        </div>
        <input readOnly placeholder="Search tutorials, documentation, and guides" className="mt-3 h-10 w-full rounded-md border border-[#3a4248] bg-transparent px-3 text-[13px] outline-none placeholder:text-[#8b969c]" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Tide title="QM, Y Combinator's Open-Source Agent Harness, Now Deploys in One Click" date="November 10, 2026" />
          <Tide title="Introducing DigitalOcean Cuttlefish: Get more done with agents on the go" date="November 5, 2026" />
          <Tide title="Inside DigitalOcean Simulations: how user simulation, execution, and validation work" date="October 29, 2026" />
        </div>
      </section>
    </div>
  )
}

export function DoProject({ droplets, onCreate }: { droplets: Vm[]; onCreate: () => void }) {
  const visible = droplets.filter((vm) => vm.state !== "terminated")
  return (
    <div className="grid gap-8 px-6 py-6">
      <section className="grid items-center gap-6 overflow-hidden rounded-xl bg-[#163a66] px-6 py-6 text-white lg:grid-cols-[1fr_180px]">
        <div>
          <h1 className="text-[28px] font-semibold">Finish Account Set Up</h1>
          <p className="mt-2 max-w-xl text-[14px] text-[#d5e4f5]">Add a payment method to seamlessly spin up your first resource. Still exploring? Check out our docs to learn more about what you can accomplish with DigitalOcean.</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" className="h-9 rounded-full bg-[#7ebac2] px-4 text-[14px] font-semibold text-[#102226]" onClick={() => flash("The $5 signup credit stands in for a payment method. No card is collected.")}>Add Payment Method</button>
            <span className="text-[14px] text-[#d5e4f5]">Visit Docs ↗</span>
          </div>
        </div>
        <Submarine />
      </section>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-lg bg-[#2f6bff] text-white" aria-hidden>◆</span>
        <div>
          <p className="flex items-center gap-2 text-[22px] font-semibold">first-project <span className="rounded-full border border-[#3a4248] px-2 py-0.5 text-[11px] font-medium text-[#c5cdd0]">Default</span></p>
          <p className="text-[13px] text-[#8b969c]">Update your project information under Settings</p>
        </div>
      </div>
      <div className="flex gap-6 border-b border-[#2c3438] text-[14px]">
        <span className="border-b-2 border-[#7ebac2] pb-2 text-[#e8eeef]">Resources</span>
        <span className="pb-2 text-[#8b969c]">Activity</span>
        <span className="pb-2 text-[#8b969c]">Settings</span>
      </div>
      <section className="rounded-xl border border-[#2c3438] p-5">
        <h2 className="text-[18px] font-semibold">Welcome to DigitalOcean</h2>
        <p className="mt-2 text-[14px] text-[#b7c0c4]">Browse popular solutions users are building on DigitalOcean. Not sure where to start? Let us help you understand where to begin.</p>
        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <ProductTile title="Droplets" kicker="Flexible Virtual Machines" body="Spin up powerful, customizable servers with full control over your infrastructure." action="Create Droplet" onClick={onCreate} art="drop" />
          <ProductTile title="App Platform" kicker="Managed App Hosting" body="Deploy and scale full-stack applications directly from your git repository." action="Create App" art="app" />
          <ProductTile title="DigitalOcean AI" kicker="Unified AI Platform" body="Build and train AI agents or access multiple LLMs through one endpoint." action="Create AI Agent" art="ai" />
          <ProductTile title="Managed Databases" kicker="Secure Data Storage" body="Create popular database engines with automated failover and backups." action="Create Database" art="db" />
        </div>
      </section>
      <Catalog onCreate={onCreate} />
      {visible.length > 0 ? (
        <section>
          <h2 className="text-[13px] font-semibold tracking-[0.08em] text-[#8b969c]">DROPLETS IN THIS PROJECT</h2>
          <ul className="mt-3 divide-y divide-[#2c3438] rounded-xl border border-[#2c3438]">
            {visible.map((vm) => (
              <li key={vm.id} className="flex items-center justify-between px-4 py-3 text-[14px]">
                <span>{vm.name}</span>
                <span className="font-mono text-[13px] text-[#8b969c]">{vm.publicIp ?? vm.state}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="pb-6 text-center text-[13px] text-[#7ebac2]">Support · Status · Docs · Tutorials · Blog · Pricing · Careers · Privacy · Terms</p>
    </div>
  )
}

export function DoNewProject({ onCancel }: { onCancel: () => void }) {
  const [name, setName] = useState("")
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ol className="flex justify-center gap-8 text-[13px] text-[#8b969c]">
        <li className="text-[#e8eeef]"><span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-[#7ebac2] text-[12px] text-[#102226]">1</span>Create project</li>
        <li><span className="mr-2 inline-grid size-5 place-items-center rounded-full border border-[#3a4248] text-[12px]">2</span>Assign resources</li>
      </ol>
      <form className="mx-auto mt-8 max-w-2xl rounded-xl border border-[#2c3438] bg-[#171c1e] p-6" onSubmit={(event) => { event.preventDefault(); flash(name.trim() ? `Project “${name.trim()}” stays as first-project in this lab.` : "Enter a project name."); }}>
        <h1 className="text-[22px] font-semibold">Create new project</h1>
        <Field label="Project name *">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter project name" className={fieldClass} />
        </Field>
        <Field label="Add environment type *">
          <select aria-label="Environment type" className={fieldClass} defaultValue=""><option value="">Select environment type</option><option>Development</option><option>Staging</option><option>Production</option></select>
        </Field>
        <Field label="Tell us what it's for *">
          <p className="-mt-1 text-[12px] text-[#8b969c]">This will help us to provide a more relevant experience.</p>
          <select aria-label="Purpose" className={fieldClass} defaultValue=""><option value="">Select purpose</option><option>Class project</option><option>Web service</option><option>Just trying DigitalOcean</option></select>
        </Field>
        <Field label="Add a description">
          <p className="-mt-1 text-[12px] text-[#8b969c]">Helpful for teams or differentiating between projects with similar names.</p>
          <input placeholder="Enter project description" className={fieldClass} />
        </Field>
        <button type="submit" className="mt-6 h-11 w-full rounded-full bg-[#7ebac2] text-[15px] font-semibold text-[#102226]">Create Project</button>
      </form>
      <button type="button" onClick={onCancel} className="mx-auto mt-4 block text-[14px] text-[#c5cdd0]">Cancel</button>
    </div>
  )
}

export function DoCreate({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const ocean = useLabState().do
  const [name, setName] = useState("ubuntu-s-1vcpu-1gb-blr1")
  const [region, setRegion] = useState(ocean.region)
  const [imageId, setImageId] = useState("ubuntu-24-04-x64")
  const [sizeId, setSizeId] = useState(DO_SIZES[1]?.id ?? DO_SIZES[0].id)
  const [cpu, setCpu] = useState("intel")
  const [keyName, setKeyName] = useState(ocean.keys[0]?.name ?? "lab-key")
  const [addingKey, setAddingKey] = useState(false)
  const [ipv6, setIpv6] = useState(false)
  const [monitor, setMonitor] = useState(true)
  const [volume, setVolume] = useState(false)
  const [backups, setBackups] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const size = DO_SIZES.find((item) => item.id === sizeId) ?? DO_SIZES[0]
  const monthly = Math.round(size.hourlyUsd * 730)
  const image = DO_IMAGES.find((item) => item.id === imageId)
  const created = creating ? ocean.droplets.find((vm) => vm.name === creating) : null
  const selectedKey = ocean.keys.find((key) => key.name === keyName) ?? ocean.keys[0]

  if (creating) {
    const ready = Boolean(created?.publicIp)
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-[28px] font-semibold">{creating}</h1>
        <p className="mt-2 text-[14px] text-[#8b969c]">{ready ? "Your Droplet is ready." : "Creating your Droplet…"}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#243033]"><div className={cn("h-full bg-[#7ebac2]", ready ? "w-full" : "w-2/3 animate-pulse")} /></div>
        <p className="mt-3 font-mono text-[14px]">{created?.publicIp ?? "Assigning a public IP address"}</p>
        {ready ? <button type="button" className="mt-4 h-9 rounded-full bg-[#7ebac2] px-4 text-[14px] font-semibold text-[#102226]" onClick={onDone}>Back to Droplets</button> : null}
      </div>
    )
  }

  return (
    <form className="grid gap-8 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={(event) => {
      event.preventDefault()
      const outcome = dispatch({ type: "do/launch", name, imageId, sizeId, keyName: selectedKey?.name ?? keyName, region })
      if (outcome.error) setError(outcome.error)
      else {
        setError(null)
        flash(outcome.message ?? "Creating Droplet.")
        setCreating(name.trim().toLowerCase())
      }
    }}>
      <div className="min-w-0">
        <button type="button" onClick={onBack} className="text-[13px] text-[#8b969c]">← Back to Droplets</button>
        <h1 className="mt-3 text-center text-[32px] font-semibold">Create Droplet</h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2c3438] bg-[#171c1e] px-4 py-4">
          <div>
            <p className="font-semibold">Payment method required</p>
            <p className="mt-1 text-[13px] text-[#8b969c]">Add a payment method to continue creating Droplets. Your selections are kept. This lab applies the $5 signup credit instead of a card.</p>
          </div>
          <button type="button" className="h-9 rounded-full bg-[#7ebac2] px-4 text-[13px] font-semibold text-[#102226]" onClick={() => flash("The $5 signup credit stands in for a payment method. No card is collected.")}>Add Payment Method</button>
        </div>

        <Block title="Choose a datacenter region">
          <select aria-label="Datacenter region" value={region} onChange={(event) => setRegion(event.target.value)} className={fieldClass}>
            {DO_REGIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </Block>

        <Block title="Choose an image">
          <div className="flex flex-wrap gap-4 border-b border-[#2c3438] text-[13px] text-[#8b969c]">
            <span className="border-b-2 border-[#7ebac2] pb-2 text-[#e8eeef]">OS</span>
            <span className="pb-2">Solutions (13)</span>
            <span className="pb-2">Agents (13)</span>
            <span className="pb-2">Custom Images</span>
          </div>
          <ImageRow name="Ubuntu" selected={imageId.startsWith("ubuntu")} recommended onClick={() => setImageId("ubuntu-24-04-x64")}>
            <select aria-label="Ubuntu version" value={imageId.startsWith("ubuntu") ? imageId : "ubuntu-24-04-x64"} onClick={(event) => event.stopPropagation()} onChange={(event) => setImageId(event.target.value)} className="h-8 rounded-md border border-[#3a4248] bg-[#121618] px-2 text-[13px]">
              {DO_IMAGES.filter((item) => item.id.startsWith("ubuntu")).map((item) => <option key={item.id} value={item.id}>{item.label.replace("Ubuntu ", "")}</option>)}
            </select>
          </ImageRow>
          <ImageRow name="Debian" note="Requires an SSH Key" selected={imageId.startsWith("debian")} onClick={() => setImageId("debian-12-x64")}>
            <span className="text-[13px] text-[#8b969c]">13 x64</span>
          </ImageRow>
          <ImageRow name="Fedora" note="Requires an SSH Key" selected={imageId.startsWith("fedora")} onClick={() => setImageId("fedora-43-x64")}>
            <span className="text-[13px] text-[#8b969c]">44 x64</span>
          </ImageRow>
        </Block>

        <Block title="Choose a Droplet Plan">
          <div className="flex flex-wrap gap-2 text-[13px]">
            {["Basic", "General Purpose", "CPU-Optimized", "Memory-Optimized"].map((plan) => (
              <span key={plan} className={cn("rounded-full px-3 py-1", plan === "Basic" ? "bg-[#243033] text-[#e8eeef]" : "text-[#8b969c]")}>{plan}</span>
            ))}
          </div>
          <p className="text-[13px] text-[#8b969c]">Shared CPU</p>
          <p className="text-[14px] font-medium">CPU Options</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <CpuOption label="Regular" detail="Disk Type: SSD" selected={cpu === "regular"} onClick={() => setCpu("regular")} />
            <CpuOption label="Premium AMD" detail="Disk Type: NVMe SSD" selected={cpu === "amd"} onClick={() => setCpu("amd")} />
            <CpuOption label="Premium Intel" detail="Disk Type: NVMe SSD" selected={cpu === "intel"} onClick={() => setCpu("intel")} />
          </div>
          <p className="text-[14px] font-medium">Select a Plan</p>
          <div className="grid gap-2">
            {DO_SIZES.map((item) => (
              <button key={item.id} type="button" onClick={() => setSizeId(item.id)} className={cn("rounded-lg border px-4 py-3 text-left", sizeId === item.id ? "border-[#7ebac2]" : "border-[#2c3438]")}>
                <span className="block font-semibold">${Math.round(item.hourlyUsd * 730)}.00/mo</span>
                <span className="text-[13px] text-[#b7c0c4]">{item.vcpu} vCPU · {item.ram} RAM · {DISKS[item.id] ?? "25 GB"} NVMe SSD · {TRANSFER[item.id] ?? "1 TB"} Transfer</span>
              </button>
            ))}
          </div>
        </Block>

        <Block title="Volumes Block Storage">
          <CheckCard checked={volume} onClick={() => setVolume((value) => !value)} title="Add additional storage" body="Volumes are NVMe network block storage. You can use them to move between Droplets and GPU Droplets by detaching and attaching at any time." />
        </Block>
        <Block title="Backups">
          <CheckCard checked={backups} onClick={() => setBackups((value) => !value)} title="Enable automated backups" body="Restore your Droplet quickly if it fails. Configure backup frequency and retention. With usage-based pricing, pay only for the backup's restorable file size." />
        </Block>
        <Block title="Authentication">
          <div className="flex gap-4 text-[14px]">
            <span className="border-b-2 border-[#7ebac2] pb-1">SSH Keys</span>
            <span className="pb-1 text-[#8b969c]">Password</span>
          </div>
          <h3 className="text-[16px] font-semibold">Add an SSH Key for authentication</h3>
          <p className="text-[13px] text-[#8b969c]">An SSH key pair is a more secure way to connect to your Droplet.</p>
          {ocean.keys.length === 0 && !addingKey ? (
            <div className="rounded-xl border border-[#2c3438] px-4 py-6 text-center">
              <p className="font-semibold">Create an SSH key for secure, password-free access</p>
              <p className="mt-1 text-[13px] text-[#8b969c]">We will walk you through it. It is painless, we promise.</p>
              <button type="button" className="mt-4 h-9 rounded-full border border-[#7ebac2] px-4 text-[14px]" onClick={() => setAddingKey(true)}>Add an SSH Key</button>
            </div>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-[13px]">Key name
                <input value={keyName} onChange={(event) => setKeyName(event.target.value)} className={fieldClass} />
              </label>
              <button type="button" className="h-9 w-fit rounded-full border border-[#7ebac2] px-4 text-[14px]" onClick={() => {
                const outcome = dispatch({ type: "do/key", name: keyName })
                if (outcome.error) setError(outcome.error)
                else { setError(null); flash(outcome.message ?? "SSH key added.") }
              }}>Add an SSH Key</button>
              {ocean.keys.length > 0 ? <ul className="grid gap-1 text-[13px] text-[#b7c0c4]">{ocean.keys.map((key) => <li key={key.name}>{key.name} · <span className="font-mono text-[12px]">{key.fingerprint}</span></li>)}</ul> : null}
            </div>
          )}
        </Block>
        <Block title="Networking">
          <p className="text-[13px] text-[#8b969c]">Public IP addresses are optional. A private IPv4 address is always assigned for secure internal traffic within the same VPC.</p>
          <CheckCard checked title="Public IPv4 address" body="Allows your Droplet to send and receive traffic from the public Internet. Disable to restrict this Droplet to your VPC." />
          <CheckCard checked={ipv6} onClick={() => setIpv6((value) => !value)} title="Public IPv6 address" body="Built-in authentication and privacy support, and makes it difficult for hackers to launch scanning attacks." />
        </Block>
        <Block title="Monitoring">
          <CheckCard checked={monitor} onClick={() => setMonitor((value) => !value)} title="Improved Metrics and monitoring (Free)" body="This will install our DigitalOcean Metrics Agent to collect and graph expanded system-level metrics, track performance, and set up alerts instantly within the control panel." />
        </Block>
        <Block title="Additional Options">
          <CheckCard title="Startup scripts (Free)" body="Add scripts to run on initial Droplet boot-up — great for repetitive or initialization tasks." />
          <CheckCard title="Add a worry-free Managed Database" body="$15.00 / month. A scalable database cluster service includes daily backups with PITR, no downtime scaling, automated failover, and end-to-end SSL." />
        </Block>
        <Block title="Quantity">
          <p className="text-[14px]">Deploy multiple Droplets with the same configuration.</p>
          <div className="flex items-center gap-3">
            <button type="button" className="size-8 rounded-md border border-[#3a4248]" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
            <span className="w-6 text-center">{quantity}</span>
            <button type="button" className="size-8 rounded-md border border-[#3a4248]" onClick={() => setQuantity((value) => Math.min(3, value + 1))}>+</button>
          </div>
          {quantity > 1 ? <p className="text-[12px] text-[#8b969c]">This lab creates one Droplet per submit. Run Create again for another.</p> : null}
        </Block>
        <Block title="Give your Droplet a name">
          <p className="text-[13px] text-[#8b969c]">Can only contain alphanumeric characters, dashes, and periods.</p>
          <input id="do-name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
        </Block>
        <Block title="Finalize">
          <p className="text-[14px] font-medium">Select a project</p>
          <select aria-label="Project" className={fieldClass} defaultValue="first-project"><option>first-project</option></select>
          <p className="text-[14px] font-medium">Tags</p>
          <p className="text-[13px] text-[#8b969c]">May contain letters, numbers, colons, dashes, and underscores.</p>
          <input placeholder="Enter tag name" className={fieldClass} />
        </Block>
        {error ? <p role="alert" className="text-[13px] text-[#f0a8a4]">{error}</p> : null}
      </div>
      <aside className="h-fit rounded-xl border border-[#2c3438] bg-[#171c1e] p-4 xl:sticky xl:top-4">
        <h2 className="text-[16px] font-semibold">Summary</h2>
        <div className="mt-4 flex items-start justify-between gap-3 text-[13px]">
          <div>
            <p className="font-semibold">Compute</p>
            <p className="text-[#8b969c]">Plan Type: Basic</p>
            <p className="text-[#8b969c]">CPU Option: {cpu === "amd" ? "Premium AMD" : cpu === "regular" ? "Regular" : "Premium Intel"}</p>
            <p className="text-[#8b969c]">vCPU: {size.vcpu}</p>
            <p className="text-[#8b969c]">RAM: {size.ram}</p>
            <p className="text-[#8b969c]">Disk: {DISKS[size.id] ?? "25 GB"}</p>
            <p className="text-[#8b969c]">Transfer: {TRANSFER[size.id] ?? "1 TB"}</p>
            <p className="text-[#8b969c]">{image?.label}</p>
          </div>
          <p className="font-semibold">${monthly.toFixed(2)}/mo</p>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-[#2c3438] pt-3">
          <p>Total cost</p>
          <p className="text-right"><span className="block font-semibold">${monthly.toFixed(2)}/month</span><span className="text-[12px] text-[#8b969c]">${size.hourlyUsd.toFixed(4)}/hour</span></p>
        </div>
        <button type="submit" className="mt-4 h-10 w-full rounded-full bg-[#7ebac2] text-[14px] font-semibold text-[#102226]">Add Payment Method and Create Droplet</button>
        <p className="mt-3 text-[13px] text-[#c5cdd0]">{selectedKey ? `SSH key ${selectedKey.name}` : "Select an SSH Key to create this Droplet"}</p>
        <p className="mt-1 text-[13px] text-[#8b969c]">The $5 signup credit covers this lab Droplet. No card is collected.</p>
      </aside>
    </form>
  )
}

function Catalog({ onCreate }: { onCreate: () => void }) {
  return (
    <>
      <section>
        <h2 className="text-[13px] font-semibold tracking-[0.08em] text-[#8b969c]">COMPUTE</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Mini title="GPU Droplets" body="Virtualized GPUs with high-performance computing power on demand." action="Create GPU Droplet" />
          <Mini title="Kubernetes Clusters" body="Manage your containerized applications with Kubernetes." action="Create Cluster" />
          <Mini title="Serverless Functions" body="Deploy and run code without managing servers." action="Create Function" />
        </div>
      </section>
      <section>
        <h2 className="text-[13px] font-semibold tracking-[0.08em] text-[#8b969c]">STORAGE</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Mini title="Spaces Object Storage" body="Store and deliver data with object storage." action="Create Bucket" />
          <Mini title="Container Registry" body="Store and manage your container images securely." action="Create Registry" />
          <Mini title="Network File Storage" body="Shared file system for data consistency." action="Create File Storage" />
        </div>
      </section>
      <section>
        <h2 className="text-[13px] font-semibold tracking-[0.08em] text-[#8b969c]">NETWORKING</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Mini title="Domains" body="Manage your domain names and DNS with DigitalOcean." action="Add Domain" />
          <Mini title="Load Balancers" body="Distribute traffic across multiple resources." action="Create Load Balancer" />
          <Mini title="VPC Networks" body="Isolated networks for your resources." action="Create VPC Network" />
          <Mini title="Firewalls" body="Protect your resources with customizable firewall rules." action="Create Firewall" />
        </div>
      </section>
      <p className="text-[12px] text-[#8b969c]">Droplet creation is the lab path. The other products are shown so the project page matches the control panel. <button type="button" className="text-[#7ebac2]" onClick={onCreate}>Create Droplet</button></p>
    </>
  )
}

function ProductTile({ title, kicker, body, action, onClick, art }: { title: string; kicker: string; body: string; action: string; onClick?: () => void; art: "drop" | "app" | "ai" | "db" }) {
  return (
    <article className="flex flex-col">
      <div className="grid h-28 place-items-center rounded-lg bg-gradient-to-br from-[#2f7bff] to-[#63b3ff]" aria-hidden>
        {art === "drop" ? <svg viewBox="0 0 64 64" className="size-16"><path d="M32 8c10 14 16 22 16 30a16 16 0 1 1-32 0c0-8 6-16 16-30Z" fill="white" /></svg> : null}
        {art === "app" ? <svg viewBox="0 0 64 64" className="size-16"><rect x="12" y="14" width="40" height="30" rx="3" fill="white" /><path d="M18 28h20M18 34h12" stroke="#2f7bff" strokeWidth="2" /></svg> : null}
        {art === "ai" ? <svg viewBox="0 0 64 64" className="size-16"><circle cx="32" cy="32" r="14" fill="white" /><path d="M32 10v8M32 46v8M10 32h8M46 32h8" stroke="white" strokeWidth="3" /></svg> : null}
        {art === "db" ? <svg viewBox="0 0 64 64" className="size-16"><ellipse cx="32" cy="18" rx="16" ry="6" fill="white" /><path d="M16 18v20c0 3 7 6 16 6s16-3 16-6V18" fill="none" stroke="white" strokeWidth="3" /></svg> : null}
      </div>
      <h3 className="mt-3 text-[16px] font-semibold">{title}</h3>
      <p className="text-[13px] text-[#b7c0c4]">{kicker}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#8b969c]">{body}</p>
      <button type="button" onClick={onClick} className="mt-3 h-8 w-fit rounded-full border border-[#3a4248] px-3 text-[13px]">{action}</button>
    </article>
  )
}

function Mini({ title, body, action }: { title: string; body: string; action: string }) {
  return (
    <article className="flex min-h-40 flex-col rounded-xl border border-[#2c3438] p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-[13px] leading-5 text-[#8b969c]">{body}</p>
      <span className="mt-3 text-[13px] text-[#7ebac2]">{action}</span>
    </article>
  )
}

function Tide({ title, date }: { title: string; date: string }) {
  return (
    <article className="rounded-lg border border-[#2c3438] p-4">
      <p className="text-[12px] text-[#8b969c]">Product updates</p>
      <h3 className="mt-2 text-[15px] font-semibold leading-6">{title}</h3>
      <p className="mt-3 text-[12px] text-[#8b969c]">{date}</p>
      <p className="mt-3 text-[13px] text-[#7ebac2]">View →</p>
    </article>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 grid gap-3">
      <h2 className="text-[20px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function ImageRow({ name, note, recommended, selected, onClick, children }: { name: string; note?: string; recommended?: boolean; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === "Enter") onClick() }} className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left", selected ? "border-[#7ebac2]" : "border-[#2c3438]")}>
      <span>
        <span className="font-medium">{name}</span>
        {recommended ? <span className="ml-2 rounded-full bg-[#243033] px-2 py-0.5 text-[11px]">RECOMMENDED</span> : null}
        {note ? <span className="mt-1 block text-[12px] text-[#8b969c]">{note}</span> : null}
      </span>
      {children}
    </div>
  )
}

function CpuOption({ label, detail, selected, onClick }: { label: string; detail: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-lg border px-3 py-3 text-left text-[13px]", selected ? "border-[#7ebac2]" : "border-[#2c3438]")}>
      <span className="block font-medium">{label}</span>
      <span className="text-[#8b969c]">{detail}</span>
    </button>
  )
}

function CheckCard({ title, body, checked = false, onClick }: { title: string; body: string; checked?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-start gap-3 rounded-lg border px-3 py-3 text-left", checked ? "border-[#7ebac2]" : "border-[#2c3438]")}>
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border text-[11px]", checked ? "border-[#7ebac2] bg-[#7ebac2] text-[#102226]" : "border-[#3a4248]")}>{checked ? "✓" : ""}</span>
      <span>
        <span className="block text-[14px] font-medium">{title}</span>
        <span className="mt-1 block text-[13px] leading-5 text-[#8b969c]">{body}</span>
      </span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 grid gap-1.5 text-[13px] font-medium">
      {label}
      {children}
    </label>
  )
}

function Pill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-8 rounded-full border border-[#3a4248] px-3 text-[13px] hover:border-[#7ebac2]">{children}</button>
}

function TeamDot() {
  return <span className="inline-grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#d946ef] to-[#818cf8] text-[9px] font-semibold" aria-hidden>T</span>
}

function Submarine() {
  return (
    <svg viewBox="0 0 180 90" className="h-24 w-44" aria-hidden>
      <ellipse cx="90" cy="52" rx="62" ry="22" fill="#4aa3e8" />
      <rect x="108" y="28" width="22" height="16" rx="4" fill="#7ec8f0" />
      <circle cx="118" cy="36" r="4" fill="#163a66" />
      <path d="M40 52h18M148 48l18 6-18 6" fill="none" stroke="#d7eef8" strokeWidth="3" />
      <circle cx="70" cy="52" r="5" fill="#163a66" />
    </svg>
  )
}

const fieldClass = "h-10 w-full rounded-md border border-[#3a4248] bg-[#121618] px-3 text-[14px] font-normal text-[#e8eeef] outline-none"
