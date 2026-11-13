import { cn } from "@/lib/utils"
import type { VmState } from "@/lib/types"

const TONE: Record<VmState, string> = {
  pending: "bg-[#f4e2c4] text-[#6a4b12]",
  running: "bg-[#d7ead8] text-[#1d5a32]",
  stopped: "bg-[#e6e2da] text-[#4d463c]",
  terminated: "bg-[#f3d6d2] text-[#8a2e24]",
}

export function StateBadge({ state }: { state: VmState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        TONE[state]
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-current",
          state === "pending" && "animate-pulse motion-reduce:animate-none"
        )}
        aria-hidden
      />
      {state}
    </span>
  )
}
