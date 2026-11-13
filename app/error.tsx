"use client"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#efe6d6] px-4 py-16 text-[#221c16]">
      <div className="max-w-md">
        <h1 className="font-heading text-4xl">The lab hit a snag</h1>
        <p className="mt-3 text-sm leading-6 text-[#4d463c]">{error.message || "Something in this page failed to render."}</p>
        <Button type="button" className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
