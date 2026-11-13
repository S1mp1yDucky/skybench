"use client"

import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { dispatch, pendingSignature, useLabState } from "@/lib/store"

function Promoter() {
  const lab = useLabState()
  const pending = pendingSignature(lab)

  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => dispatch({ type: "promote" }), 1400)
    return () => window.clearTimeout(timer)
  }, [pending])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={300}>
      <div className="flex min-h-0 flex-1 flex-col">
        {children}
        <Promoter />
      </div>
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}
