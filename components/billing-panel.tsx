"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StateBadge } from "@/components/state-badge"
import { usd } from "@/lib/format"
import { dispatch } from "@/lib/store"
import { vmCost } from "@/lib/simulator"
import type { Action, Vm } from "@/lib/types"

export function BillingPanel({
  title,
  note,
  budget,
  vms,
  now,
  fastForward,
  onBudget,
}: {
  title: string
  note: string
  budget: number
  vms: Vm[]
  now: number | null
  fastForward: Action
  onBudget: (amount: number) => Action
}) {
  const [draft, setDraft] = useState(String(budget))
  const [error, setError] = useState<string | null>(null)
  const spend = now == null ? null : vms.reduce((sum, vm) => sum + vmCost(vm, now), 0)

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-heading text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4d463c]">{note}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <figure className="rounded-xl border border-black/10 bg-white p-4">
          <figcaption className="text-xs tracking-wide text-[#6d6256] uppercase">Month-to-date</figcaption>
          <p className="mt-2 font-mono text-2xl">{spend == null ? "—" : usd(spend)}</p>
        </figure>
        <figure className="rounded-xl border border-black/10 bg-white p-4">
          <figcaption className="text-xs tracking-wide text-[#6d6256] uppercase">Budget</figcaption>
          <p className="mt-2 font-mono text-2xl">{usd(budget)}</p>
        </figure>
        <figure className="rounded-xl border border-black/10 bg-white p-4">
          <figcaption className="text-xs tracking-wide text-[#6d6256] uppercase">Machines</figcaption>
          <p className="mt-2 font-mono text-2xl">{vms.filter((vm) => vm.state !== "terminated").length}</p>
        </figure>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const amount = Number(draft)
          const outcome = dispatch(onBudget(amount))
          if (outcome.error) setError(outcome.error)
          else {
            setError(null)
            toast.success(outcome.message ?? "Alert updated.")
          }
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="budget">Budget amount</Label>
          <Input
            id="budget"
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="w-32"
          />
        </div>
        <Button type="submit" variant="outline">
          Save alert
        </Button>
        <Button
          type="button"
          onClick={() => {
            const outcome = dispatch(fastForward)
            if (outcome.error) toast.error(outcome.error)
            else toast.success(outcome.message ?? "Fast-forwarded.")
          }}
        >
          Include the next 24 hours
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-[#8a2e24]">
          {error}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-[#6d6256]">
        Month-to-date cost includes running resources. Stopped EC2 instances stop compute charges. Azure virtual machines that are stopped (deallocated) stop compute charges. Droplets are billed until they are destroyed.
      </p>
      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Charges by resource</caption>
          <thead className="border-b text-xs tracking-wide text-[#6d6256] uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Accrued</th>
            </tr>
          </thead>
          <tbody>
            {vms.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-[#6d6256]">
                  Nothing has been launched, so the meter is at zero.
                </td>
              </tr>
            ) : (
              vms.map((vm) => (
                <tr key={vm.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{vm.name}</td>
                  <td className="px-3 py-2">
                    <StateBadge state={vm.state} />
                  </td>
                  <td className="px-3 py-2 font-mono">{usd(vm.hourlyUsd)}/hr</td>
                  <td className="px-3 py-2 font-mono">{now == null ? "—" : usd(vmCost(vm, now))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
