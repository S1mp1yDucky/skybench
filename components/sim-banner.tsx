"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const LINKS = [
  ["/", "Bench"],
  ["/aws", "AWS"],
  ["/azure", "Azure"],
  ["/digitalocean", "DigitalOcean"],
  ["/compare", "Compare"],
  ["/report", "Report"],
] as const

export function SimBanner() {
  const pathname = usePathname()

  return (
    <div className="no-print border-b border-[#1a332e] bg-[#23453d] text-[#f4efe4]">
      <div className="flex flex-col gap-1 px-3 py-1.5 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-[11px] leading-4">
          <span className="font-semibold tracking-[0.14em] uppercase">Simulated lab</span>
          <span className="mx-2 text-[#c9d5cc]">·</span>
          <span className="text-[#d7e2da]">
            No provider is contacted, no card is taken, and nothing is billed.
          </span>
        </p>
        <nav aria-label="Lab" className="flex flex-wrap gap-x-3 gap-y-1 sm:ml-auto">
          {LINKS.map(([href, label]) => {
            const current = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "text-[11px] underline-offset-4 hover:underline",
                  current ? "font-semibold text-white" : "text-[#d7e2da]"
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
