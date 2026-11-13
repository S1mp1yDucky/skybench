"use client"

import { useEffect, useId, useRef, useState } from "react"
import { runCommand, runRemote, redact } from "@/lib/shell"
import { findVm } from "@/lib/simulator"
import { dispatch, useLabState } from "@/lib/store"
import { shellHint } from "@/lib/steps"
import type { Action, PlatformId, ShellLine } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Row {
  id: string
  tone: "cmd" | "out" | "err" | "info"
  text: string
}

type Mode =
  | { kind: "local" }
  | { kind: "remote"; vmId: string }
  | { kind: "aws-key" }
  | { kind: "aws-secret" }
  | { kind: "aws-region" }
  | { kind: "aws-format"; region: string }
  | { kind: "do-token" }

let rowCounter = 0

function row(tone: Row["tone"], text: string): Row {
  rowCounter += 1
  return { id: `row-${rowCounter}`, tone, text }
}

function sshAction(platform: PlatformId): Action {
  if (platform === "aws") return { type: "aws/ssh-ok" }
  if (platform === "azure") return { type: "azure/ssh-ok" }
  return { type: "do/ssh-ok" }
}

export function Terminal({
  platform,
  lockedVmId,
  onExit,
  className,
}: {
  platform: PlatformId
  lockedVmId?: string
  onExit?: () => void
  className?: string
}) {
  const lab = useLabState()
  const inputId = useId()
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [lines, setLines] = useState<Row[]>(() => welcome().map((text) => row("info", text)))
  const [mode, setMode] = useState<Mode>(lockedVmId ? { kind: "remote", vmId: lockedVmId } : { kind: "local" })
  const [value, setValue] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [lines, mode])

  const prompt = promptFor(mode, lab)
  const secret = mode.kind === "aws-secret" || mode.kind === "do-token" || mode.kind === "aws-key"
  const hint = mode.kind === "local" && !lockedVmId ? shellHint(lab, platform) : null

  function push(items: Row[]) {
    setLines((current) => [...current, ...items].slice(-220))
  }

  function applyActions(actions: Action[], success: ShellLine[]) {
    const notes: Row[] = []
    for (const action of actions) {
      const outcome = dispatch(action)
      if (outcome.error) {
        push([row("err", outcome.error)])
        return false
      }
      if (outcome.message) notes.push(row("info", outcome.message))
    }
    push([...success.map((line) => row(line.tone, line.text)), ...notes])
    return true
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const raw = value
    const trimmed = raw.trim()
    setValue("")
    setHistoryIndex(-1)

    if (mode.kind === "aws-key" || mode.kind === "aws-secret" || mode.kind === "do-token") {
      if (trimmed === "cancel") {
        push([row("info", "Cancelled.")])
        setMode({ kind: "local" })
        return
      }
      push([row("cmd", `${prompt} ****`)])
      if (!trimmed) {
        push([row("err", "The value cannot be empty. Type cancel to stop.")])
        return
      }
      if (mode.kind === "aws-key") setMode({ kind: "aws-secret" })
      else if (mode.kind === "aws-secret") setMode({ kind: "aws-region" })
      else {
        const outcome = dispatch({ type: "do/auth" })
        push([outcome.error ? row("err", outcome.error) : row("info", outcome.message ?? "doctl authenticated.")])
        if (!outcome.error) setMode({ kind: "local" })
      }
      return
    }

    if (mode.kind === "aws-region") {
      if (trimmed === "cancel") {
        push([row("info", "Cancelled.")])
        setMode({ kind: "local" })
        return
      }
      const region = trimmed || lab.aws.region
      push([row("cmd", `${prompt} ${region}`)])
      setMode({ kind: "aws-format", region })
      return
    }

    if (mode.kind === "aws-format") {
      if (trimmed === "cancel") {
        push([row("info", "Cancelled.")])
        setMode({ kind: "local" })
        return
      }
      const format = trimmed || "json"
      push([row("cmd", `${prompt} ${format}`)])
      const outcome = dispatch({
        type: "aws/configure",
        region: mode.region,
        format,
        markKeys: true,
      })
      push([outcome.error ? row("err", outcome.error) : row("info", outcome.message ?? "Configured.")])
      setMode(outcome.error ? { kind: "aws-region" } : { kind: "local" })
      return
    }

    if (mode.kind === "remote") {
      const found = findVm(lab, mode.vmId)
      push([row("cmd", `${prompt} ${trimmed}`)])
      if (!found || found.vm.state !== "running") {
        push([row("err", "Connection closed. The machine is not running.")])
        if (lockedVmId) onExit?.()
        else setMode({ kind: "local" })
        return
      }
      if (trimmed === "exit" || trimmed === "logout") {
        push([row("info", "Connection closed.")])
        if (lockedVmId) onExit?.()
        else setMode({ kind: "local" })
        return
      }
      const result = runRemote(found.platform, found.vm, trimmed)
      push(result.lines.map((line) => row(line.tone, line.text)))
      if (result.verified) {
        const outcome = dispatch(sshAction(found.platform))
        if (outcome.error) push([row("err", outcome.error)])
        else if (outcome.message) push([row("info", outcome.message)])
      }
      if (trimmed) setHistory((current) => [...current, trimmed])
      return
    }

    const shown = redact(trimmed)
    if (trimmed) {
      push([row("cmd", `${prompt} ${shown}`)])
      setHistory((current) => [...current, shown])
    }
    const result = runCommand(platform, lab, raw)
    if (result.clear) {
      setLines([])
      return
    }
    if (result.wizard) {
      push(result.lines.map((line) => row(line.tone, line.text)))
      setMode(result.wizard === "aws-configure" ? { kind: "aws-key" } : { kind: "do-token" })
      return
    }
    const ok = result.actions.length === 0 || applyActions(result.actions, result.lines)
    if (ok && result.actions.length === 0) {
      push(result.lines.map((line) => row(line.tone, line.text)))
    }
    if (ok && result.connect) setMode({ kind: "remote", vmId: result.connect })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (mode.kind !== "local" && mode.kind !== "remote") return
    if (event.key === "ArrowUp") {
      event.preventDefault()
      const next = historyIndex + 1
      const command = history[history.length - 1 - next]
      if (command === undefined) return
      setHistoryIndex(next)
      setValue(command)
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      const next = historyIndex - 1
      if (next < 0) {
        setHistoryIndex(-1)
        setValue("")
        return
      }
      const command = history[history.length - 1 - next]
      if (command === undefined) return
      setHistoryIndex(next)
      setValue(command)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {hint ? <p className="font-mono text-[12px] text-[#9db0a2]">{hint}</p> : null}
      <div className="overflow-hidden rounded-xl border border-[#1c2420] bg-[#121816] text-[#d7e4d8] shadow-sm">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 font-mono text-[12px] text-[#9db0a2]">
          <span className="size-2 rounded-full bg-[#3dd68c]" aria-hidden />
          {prompt}
        </div>
        <div
          ref={scroller}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="h-80 overflow-auto px-3 py-3 font-mono text-[13px] leading-6"
        >
          {lines.map((line) => (
            <p
              key={line.id}
              className={cn(
                "whitespace-pre-wrap break-words",
                line.tone === "err" && "text-[#ffb4a8]",
                line.tone === "info" && "text-[#e7c98a]",
                line.tone === "cmd" && "text-white"
              )}
            >
              {line.text}
            </p>
          ))}
        </div>
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
          <label htmlFor={inputId} className="sr-only">
            Command
          </label>
          <span className="shrink-0 font-mono text-[13px] text-[#e7c98a]" aria-hidden>
            {prompt}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            type={secret ? "password" : "text"}
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white outline-none"
          />
        </form>
      </div>
    </div>
  )
}

function welcome(): string[] {
  return [
    "Welcome to Ubuntu 24.04.3 LTS (GNU/Linux 6.8.0-45-generic x86_64)",
    "",
    " * Documentation:  https://help.ubuntu.com",
    "",
  ]
}

function promptFor(mode: Mode, lab: ReturnType<typeof useLabState>): string {
  if (mode.kind === "remote") {
    const found = findVm(lab, mode.vmId)
    if (!found?.vm.publicIp) return "guest:~$"
    return `${found.vm.username}@${found.vm.publicIp}:~$`
  }
  if (mode.kind === "aws-key") return "AWS Access Key ID [None]:"
  if (mode.kind === "aws-secret") return "AWS Secret Access Key [None]:"
  if (mode.kind === "aws-region") return `Default region name [${lab.aws.region}]:`
  if (mode.kind === "aws-format") return "Default output format [json]:"
  if (mode.kind === "do-token") return "DigitalOcean access token:"
  return "ubuntu@ubuntu:~$"
}
