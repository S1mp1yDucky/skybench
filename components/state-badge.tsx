import { cn } from "@/lib/utils"
import type { VmState } from "@/lib/types"

const COLOR: Record<VmState, string> = {
  pending: "#d9822b",
  running: "#1d8102",
  stopped: "#687078",
  terminated: "#d13212",
}

const LABEL: Record<"aws" | "azure" | "do", Record<VmState, string>> = {
  aws: { pending: "Pending", running: "Running", stopped: "Stopped", terminated: "Terminated" },
  azure: { pending: "Creating", running: "Running", stopped: "Stopped (deallocated)", terminated: "Deleted" },
  do: { pending: "New", running: "Active", stopped: "Off", terminated: "Destroyed" },
}

export function StateBadge({ state, provider = "aws" }: { state: VmState; provider?: "aws" | "azure" | "do" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#16191f]">
      <span className={cn("size-2 shrink-0 rounded-full", state === "pending" && "animate-pulse motion-reduce:animate-none")} style={{ background: COLOR[state] }} aria-hidden />
      {LABEL[provider][state]}
    </span>
  )
}
