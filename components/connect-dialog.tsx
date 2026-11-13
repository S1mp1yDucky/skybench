"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Terminal } from "@/components/terminal"
import type { PlatformId, Vm } from "@/lib/types"

export function sshCommand(platform: PlatformId, vm: Vm): string {
  if (!vm.publicIp) return "The public address appears when the machine is running."
  if (platform === "aws") return `ssh -i ${vm.keyName}.pem ${vm.username}@${vm.publicIp}`
  if (platform === "azure") return `ssh ${vm.username}@${vm.publicIp}`
  return `ssh root@${vm.publicIp}`
}

export function ConnectDialog({
  platform,
  vm,
  open,
  onOpenChange,
}: {
  platform: PlatformId
  vm: Vm | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [session, setSession] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setSession((value) => value + 1)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
          <DialogDescription>
            {vm ? sshCommand(platform, vm) : "Choose a running machine."}
          </DialogDescription>
        </DialogHeader>
        {vm?.state === "running" ? (
          <div className="grid gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const command = sshCommand(platform, vm)
                navigator.clipboard?.writeText(command).then(
                  () => toast.success("Command copied."),
                  () => toast.error("Copy it from the dialog title instead.")
                )
              }}
            >
              Copy SSH command
            </Button>
            <Terminal key={session} platform={platform} lockedVmId={vm.id} onExit={() => onOpenChange(false)} />
          </div>
        ) : (
          <p className="text-sm text-[#4d463c]">
            {vm?.state === "pending"
              ? "This machine is still pending. The address and SSH session appear when it is running."
              : vm?.state === "stopped"
                ? "Start the machine before opening SSH."
                : "This machine is gone. Launch another one."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function downloadPem(name: string) {
  const body = [
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "SKYBENCH SIMULATED KEY — NOT A REAL PRIVATE KEY",
    `name: ${name}`,
    "This file exists so a screen recording can show a download.",
    "Do not use it with a real server.",
    "-----END OPENSSH PRIVATE KEY-----",
    "",
  ].join("\n")
  const blob = new Blob([body], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${name}.pem`
  anchor.click()
  URL.revokeObjectURL(url)
}
