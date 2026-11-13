"use client"

import { useEffect, useState } from "react"

export function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setNow(Date.now())
    const first = window.setTimeout(update, 0)
    if (!active) return () => window.clearTimeout(first)
    const timer = window.setInterval(update, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [active])

  return now
}
