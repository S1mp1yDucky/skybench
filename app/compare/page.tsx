import type { Metadata } from "next"
import Link from "next/link"
import { COMPARE_ROWS } from "@/lib/catalog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Comparison",
}

export default function ComparePage() {
  return (
    <div className="flex-1 bg-[#efe6d6] text-[#221c16]">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header>
          <p className="text-xs tracking-[0.16em] text-[#8a5a32] uppercase">Side by side</p>
          <h1 className="mt-2 font-heading text-5xl">Same job, three consoles.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4d463c]">
            Each platform can hand you a Linux machine, an address, and a bill. The differences that show up in the practical are the catalog, the signup, the cleanup command, and whether powering the machine off actually stops the meter.
          </p>
        </header>
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-[#e2d6c4] bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Point</TableHead>
                <TableHead>AWS</TableHead>
                <TableHead>Azure</TableHead>
                <TableHead>DigitalOcean</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARE_ROWS.map((row) => (
                <TableRow key={row.point}>
                  <TableCell className="font-medium">{row.point}</TableCell>
                  <TableCell>{row.aws}</TableCell>
                  <TableCell>{row.azure}</TableCell>
                  <TableCell>{row.do}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[#e2d6c4] border-l-4 border-l-[#ff9900] bg-[#f7f1e6] p-4">
            <h2 className="font-heading text-2xl">Choose AWS</h2>
            <p className="mt-2 text-sm leading-6 text-[#4d463c]">
              When the next assignment needs more than a VM: functions, object storage, a managed database, or a private network. Budget time to learn the console, and terminate what you launch.
            </p>
            <Link href="/aws" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Open the AWS lab</Link>
          </article>
          <article className="rounded-2xl border border-[#e2d6c4] border-l-4 border-l-[#0078d4] bg-[#f7f1e6] p-4">
            <h2 className="font-heading text-2xl">Choose Azure</h2>
            <p className="mt-2 text-sm leading-6 text-[#4d463c]">
              When the stack is already Microsoft, or when Azure for Students is the account that does not need a card. Delete the resource group, not just the VM.
            </p>
            <Link href="/azure" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Open the Azure lab</Link>
          </article>
          <article className="rounded-2xl border border-[#e2d6c4] border-l-4 border-l-[#0069ff] bg-[#f7f1e6] p-4">
            <h2 className="font-heading text-2xl">Choose DigitalOcean</h2>
            <p className="mt-2 text-sm leading-6 text-[#4d463c]">
              When the job is one Linux server and a clear monthly price. Destroy the Droplet. Power off still bills on a real account, and in this lab too.
            </p>
            <Link href="/digitalocean" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Open the DigitalOcean lab</Link>
          </article>
        </section>
      </div>
    </div>
  )
}
