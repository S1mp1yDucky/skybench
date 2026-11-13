"use client"

import { useSyncExternalStore } from "react"
import { initialState, reduce } from "@/lib/simulator"
import type { Action, LabState } from "@/lib/types"

const STORAGE_KEY = "skybench.v1"

let state: LabState = initialState
let hydrated = false
const listeners = new Set<() => void>()

function readStorage(): LabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as LabState
    if (parsed?.version !== 1) return initialState
    if (!Array.isArray(parsed.aws?.instances)) return initialState
    if (!Array.isArray(parsed.azure?.vms)) return initialState
    if (!Array.isArray(parsed.do?.droplets)) return initialState
    if (!Array.isArray(parsed.logs)) return { ...parsed, logs: [] }
    return parsed
  } catch {
    return initialState
  }
}

function ensure() {
  if (hydrated || typeof window === "undefined") return
  state = readStorage()
  hydrated = true
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  ensure()
  return state
}

export function useLabState(): LabState {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState)
}

export function dispatch(action: Action): { error?: string; message?: string } {
  ensure()
  const result = reduce(state, action)
  if (result.error) return { error: result.error }
  state = result.state
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The session still works if this browser refuses storage.
  }
  for (const listener of [...listeners]) listener()
  return { message: result.message }
}

export function pendingSignature(lab: LabState): string {
  return [...lab.aws.instances, ...lab.azure.vms, ...lab.do.droplets]
    .filter((vm) => vm.state === "pending")
    .map((vm) => vm.id)
    .join(",")
}
