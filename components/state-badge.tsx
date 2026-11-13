import type { VmState } from "@/lib/types"

const LABEL: Record<"aws" | "azure" | "do", Record<VmState, string>> = {
  aws: { pending: "Pending", running: "Running", stopped: "Stopped", terminated: "Terminated" },
  azure: { pending: "Creating", running: "Running", stopped: "Stopped (deallocated)", terminated: "Deleted" },
  do: { pending: "New", running: "Active", stopped: "Off", terminated: "Destroyed" },
}

export function StateBadge({ state, provider = "aws" }: { state: VmState; provider?: "aws" | "azure" | "do" }) {
  const spinning = state === "pending"
  const color = state === "running" ? "#1d8102" : state === "terminated" ? "#d13212" : state === "stopped" ? "#687078" : "#0073bb"
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] text-inherit">
      {spinning ? (
        <svg viewBox="0 0 16 16" className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden>
          <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="2" opacity="0.25" />
          <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : state === "running" ? (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <circle cx="8" cy="8" r="7" fill={provider === "azure" ? "#107c10" : "#1d8102"} />
          <path d="M4.5 8.2 6.8 10.4 11.5 5.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
          <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      )}
      {LABEL[provider][state]}
    </span>
  )
}
