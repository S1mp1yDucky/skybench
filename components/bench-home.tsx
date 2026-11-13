"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { STUDENT } from "@/lib/catalog"
import { formatPkt } from "@/lib/format"
import { dispatch, useLabState } from "@/lib/store"
import { awsSteps, azureSteps, doneCount, doSteps } from "@/lib/steps"

const BAYS = [
  {
    href: "/aws",
    name: "Amazon Web Services",
    machine: "EC2 instance",
    cli: "AWS CLI",
    edge: "border-[#ff9900]",
    open: "Open AWS",
  },
  {
    href: "/azure",
    name: "Microsoft Azure",
    machine: "Virtual machine",
    cli: "Azure CLI",
    edge: "border-[#0078d4]",
    open: "Open Azure",
  },
  {
    href: "/digitalocean",
    name: "DigitalOcean",
    machine: "Droplet",
    cli: "doctl",
    edge: "border-[#0069ff]",
    open: "Open DigitalOcean",
  },
] as const

export function BenchHome() {
  const lab = useLabState()
  const [resetOpen, setResetOpen] = useState(false)
  const progress = [awsSteps(lab), azureSteps(lab), doSteps(lab)]

  return (
    <div className="flex-1 bg-[#efe6d6] text-[#221c16]">
      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-12">
        <header className="grid gap-6 border-b border-[#d9cbb6] pb-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-[#8a5a32] uppercase">
              {STUDENT.subject} · {STUDENT.program}
            </p>
            <h1 className="mt-3 max-w-3xl font-heading text-5xl leading-[0.95] text-[#1c1915] sm:text-7xl">
              Three clouds, on the bench.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#4d463c]">
              Skybench walks the same practical as the AWS, Azure, and DigitalOcean assignment: read the service, create an account, install the CLI, launch a Linux machine, SSH in, run uname -a, and clean up. It all stays in this browser. Amazon, Microsoft, and DigitalOcean are never called, and there is nothing to put a card on.
            </p>
          </div>
          <aside className="rounded-2xl border border-[#d9cbb6] bg-[#f7f1e6] p-4">
            <p className="text-xs tracking-[0.16em] text-[#8a5a32] uppercase">Submitted by</p>
            <p className="mt-2 font-heading text-2xl">{STUDENT.name}</p>
            <dl className="mt-3 grid gap-1 text-sm text-[#4d463c]">
              <div className="flex justify-between gap-3"><dt>Enrollment</dt><dd>{STUDENT.enrollment}</dd></div>
              <div className="flex justify-between gap-3"><dt>Email</dt><dd className="break-all text-right">{STUDENT.email}</dd></div>
              <div className="flex justify-between gap-3"><dt>Submitted to</dt><dd>{STUDENT.instructor}</dd></div>
              <div className="flex justify-between gap-3"><dt>Lab progress</dt><dd>{progress.reduce((sum, steps) => sum + doneCount(steps), 0)}/21</dd></div>
            </dl>
          </aside>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          {BAYS.map((bay, index) => {
            const steps = progress[index]
            const done = doneCount(steps)
            return (
              <article key={bay.href} className={`flex flex-col rounded-2xl border border-[#e2d6c4] border-l-4 bg-[#f7f1e6] p-4 ${bay.edge}`}>
                <h2 className="font-heading text-2xl">{bay.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[#4d463c]">
                  {bay.machine} through the {bay.cli}. {done} of 7 steps are done in this browser.
                </p>
                <ol className="mt-3 grid gap-1 text-xs text-[#6d6256]">
                  {steps.map((step) => (
                    <li key={step.n}>
                      {step.done ? "Done" : "Open"} · {step.title}
                    </li>
                  ))}
                </ol>
                <Link href={bay.href} className={buttonVariants({ className: "mt-auto h-10" })}>
                  {bay.open}
                </Link>
              </article>
            )
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-heading text-3xl">What cloud computing means here</h2>
            <p className="mt-3 text-sm leading-7 text-[#4d463c]">
              Cloud computing is using servers, storage, databases, networking, and software over the internet instead of owning the machines. The provider runs the data center. The customer pays for what they use. The useful parts for this practical are no hardware purchase, fast scale-up, access from anywhere, and less maintenance. The part that gets students in trouble is the bill for something they forgot to delete.
            </p>
          </div>
          <div className="rounded-2xl bg-[#23453d] p-5 text-[#f4efe4]">
            <h2 className="font-heading text-2xl">What this lab does not do</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#d7e2da]">
              <li>It does not create a real AWS, Azure, or DigitalOcean resource.</li>
              <li>It does not ask for a card, and it discards passwords, tokens, and access keys.</li>
              <li>SSH addresses come from documentation ranges: 203.0.113.0/24, 198.51.100.0/24, and 192.0.2.0/24.</li>
              <li>Tell Sir Kashif this is a local simulation. The steps match the brief. The invoices do not.</li>
            </ul>
          </div>
        </section>

        <section className="grid min-w-0 gap-3">
          <h2 className="font-heading text-3xl">Service models</h2>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[#e2d6c4] bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-normal">Model</TableHead>
                  <TableHead className="whitespace-normal">Meaning</TableHead>
                  <TableHead className="whitespace-normal">Example</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="whitespace-normal">IaaS</TableCell>
                  <TableCell className="whitespace-normal">Rent virtual machines, storage, and networks.</TableCell>
                  <TableCell className="whitespace-normal">EC2, Azure VM, Droplet</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="whitespace-normal">PaaS</TableCell>
                  <TableCell className="whitespace-normal">A ready platform to build and run an application.</TableCell>
                  <TableCell className="whitespace-normal">Azure App Service, Elastic Beanstalk</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="whitespace-normal">SaaS</TableCell>
                  <TableCell className="whitespace-normal">Software you use over the internet.</TableCell>
                  <TableCell className="whitespace-normal">Microsoft 365, Gmail</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Model title="Public" body="Shared over the internet. AWS, Azure, and DigitalOcean are the three public platforms in this practical." />
          <Model title="Private" body="Used by a single organisation, often in its own data center or a dedicated slice of a provider." />
          <Model title="Hybrid" body="A mix. Some systems stay private and burst, or fail over, into a public cloud." />
        </section>

        <section className="grid gap-3 rounded-2xl border border-[#e2d6c4] bg-[#f7f1e6] p-5">
          <h2 className="font-heading text-3xl">How to record the demonstration</h2>
          <ol className="grid gap-2 text-sm leading-6 text-[#4d463c] md:grid-cols-2">
            <li>1. Open a console and read the product, pricing, and free-tier cards.</li>
            <li>2. Create the lab account. The code is on the page. No SMS is sent.</li>
            <li>3. Sign in and leave the nearby region selected.</li>
            <li>4. Open the VMware shell and run the hinted install and login commands.</li>
            <li>5. Launch the machine and wait until the state says running.</li>
            <li>6. SSH in and run uname -a. The local uname does not count.</li>
            <li>7. Terminate, delete the resource group, or destroy the Droplet.</li>
            <li>8. Repeat for the other two platforms. Compare, then open the report.</li>
          </ol>
          <p className="text-sm leading-6 text-[#4d463c]">
            If the submission has to show VMware itself, open this lab in a browser inside the Ubuntu guest and record that window. Skybench does not require VMware to run. Existing recordings live in the{" "}
            <a className="font-medium underline underline-offset-4" href={STUDENT.drive} target="_blank" rel="noreferrer">
              Google Drive folder
            </a>
            .
          </p>
        </section>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-heading text-3xl">Recent activity</h2>
            <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
              Reset this browser
            </Button>
          </div>
          {lab.logs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#d9cbb6] px-4 py-8 text-sm text-[#6d6256]">
              The bench is quiet. Open a console and the practical will leave a trail here.
            </p>
          ) : (
            <ul className="grid gap-2">
              {lab.logs.slice(0, 8).map((entry) => (
                <li key={entry.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-[#f7f1e6] px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 break-words">{entry.text}</span>
                  <time className="text-[#6d6256]">{formatPkt(entry.at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear the lab on this browser?</DialogTitle>
            <DialogDescription>
              Accounts, machines, keys, and the step checklist for all three platforms will be removed from local storage. Nothing is stored on a server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
              Keep the lab
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const outcome = dispatch({ type: "reset" })
                setResetOpen(false)
                toast.success(outcome.message ?? "Lab reset.")
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Model({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-[#e2d6c4] bg-[#f7f1e6] p-4">
      <h3 className="font-heading text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4d463c]">{body}</p>
    </article>
  )
}
