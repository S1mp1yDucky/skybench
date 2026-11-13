import {
  AWS_IMAGES,
  AWS_REGIONS,
  AWS_SIZES,
  AZURE_IMAGES,
  AZURE_LOCATIONS,
  AZURE_SIZES,
  DO_IMAGES,
  DO_REGIONS,
  DO_SIZES,
} from "@/lib/catalog"
import type {
  Action,
  KeyMaterial,
  LabState,
  PlatformId,
  Vm,
} from "@/lib/types"

const DAY_MS = 24 * 60 * 60 * 1000

export const initialState: LabState = {
  version: 1,
  aws: {
    reviewedSite: false,
    accountCreated: false,
    email: "",
    signedIn: false,
    region: "ap-south-1",
    cliInstalled: false,
    accessKeySet: false,
    secretSet: false,
    outputFormat: "json",
    keyPairs: [],
    instances: [],
    buckets: [],
    sshVerified: false,
    budgetUsd: 1,
    launchedOnce: false,
  },
  azure: {
    reviewedSite: false,
    accountCreated: false,
    email: "",
    studentOffer: false,
    signedIn: false,
    location: "centralindia",
    cliInstalled: false,
    loggedIn: false,
    resourceGroups: [],
    vms: [],
    keyPairs: [],
    sshVerified: false,
    budgetUsd: 1,
    launchedOnce: false,
    subscription: "Azure subscription 1",
  },
  do: {
    reviewedSite: false,
    accountCreated: false,
    email: "",
    creditApplied: false,
    signedIn: false,
    region: "blr1",
    cliInstalled: false,
    authed: false,
    keys: [],
    droplets: [],
    spaces: [],
    sshVerified: false,
    budgetUsd: 1,
    launchedOnce: false,
  },
  logs: [],
}

export interface ReduceResult {
  state: LabState
  error?: string
  message?: string
}

export function awsConfigured(state: LabState): boolean {
  return state.aws.accessKeySet && state.aws.secretSet
}

export function vmsOf(state: LabState, platform: PlatformId): Vm[] {
  if (platform === "aws") return state.aws.instances
  if (platform === "azure") return state.azure.vms
  return state.do.droplets
}

export function findVm(
  state: LabState,
  id: string
): { platform: PlatformId; vm: Vm } | null {
  for (const platform of ["aws", "azure", "do"] as const) {
    const vm = vmsOf(state, platform).find((item) => item.id === id)
    if (vm) return { platform, vm }
  }
  return null
}

export function vmByIp(state: LabState, ip: string): { platform: PlatformId; vm: Vm } | null {
  for (const platform of ["aws", "azure", "do"] as const) {
    const vm = vmsOf(state, platform).find((item) => item.publicIp === ip)
    if (vm) return { platform, vm }
  }
  return null
}

export function isMetering(vm: Vm): boolean {
  if (vm.meterFrom == null) return false
  return vm.state === "running" || (vm.state === "stopped" && vm.billsWhileStopped)
}

export function vmCost(vm: Vm, now: number): number {
  let ms = vm.billedMs
  if (isMetering(vm) && vm.meterFrom != null) {
    ms += Math.max(0, now - vm.meterFrom)
  }
  return (ms / 3_600_000) * vm.hourlyUsd
}

export function platformCost(state: LabState, platform: PlatformId, now: number): number {
  return vmsOf(state, platform).reduce((sum, vm) => sum + vmCost(vm, now), 0)
}

export function apply(state: LabState, action: Action): LabState {
  const result = reduce(state, action)
  if (result.error) throw new Error(result.error)
  return result.state
}

let activeState = initialState

export function reduce(state: LabState, action: Action): ReduceResult {
  activeState = state
  const now = "now" in action && action.now ? action.now : Date.now()

  switch (action.type) {
    case "reset":
      return { state: structuredClone(initialState), message: "Lab cleared on this browser." }
    case "promote":
      return promote(state, now)
    case "aws/review":
      return ok(patchAws(state, { reviewedSite: true }), "aws", "Reviewed the AWS product, pricing, and free-tier pages.", now)
    case "aws/signup": {
      const email = cleanEmail(action.email)
      if (!state.aws.reviewedSite) return err("Review the AWS pages before creating an account.")
      if (!email) return err("Enter an email address with a name and a domain.")
      return ok(
        patchAws(state, { accountCreated: true, email }),
        "aws",
        `Account created for ${email}.`,
        now,
        "Account created. Sign in to open the console."
      )
    }
    case "aws/signin":
      if (!state.aws.accountCreated) return err("Sign up before you sign in.")
      return ok(patchAws(state, { signedIn: true }), "aws", "Signed in to the AWS console.", now, "Signed in.")
    case "aws/signout":
      return ok(patchAws(state, { signedIn: false }), "aws", "Signed out of the AWS console.", now)
    case "aws/region":
      if (!AWS_REGIONS.some((region) => region.id === action.region)) {
        return err(`Unknown region ${action.region}.`)
      }
      return ok(patchAws(state, { region: action.region }), "aws", `Region set to ${action.region}.`, now)
    case "aws/install-cli":
      return ok(patchAws(state, { cliInstalled: true }), "aws", "Setting up awscli (2.27.50) ...", now, "")
    case "aws/credential":
      if (!state.aws.cliInstalled) return err("Install the AWS CLI first.")
      return ok(
        patchAws(state, action.field === "access" ? { accessKeySet: true } : { secretSet: true }),
        "aws",
        action.field === "access" ? "Configured aws_access_key_id." : "Configured aws_secret_access_key.",
        now,
        ""
      )
    case "aws/configure": {
      if (!state.aws.cliInstalled) return err("Install the AWS CLI first.")
      if (!AWS_REGIONS.some((region) => region.id === action.region)) {
        return err(`Unknown region ${action.region}. Try ap-south-1.`)
      }
      const format = action.format === "text" || action.format === "table" ? action.format : "json"
      const keys = action.markKeys ? { accessKeySet: true as const, secretSet: true as const } : {}
      const ready = action.markKeys || (state.aws.accessKeySet && state.aws.secretSet)
      return ok(
        patchAws(state, {
          ...keys,
          region: action.region,
          outputFormat: format,
        }),
        "aws",
        ready
          ? `AWS CLI configured for ${action.region}. Keys were not stored.`
          : `Default region set to ${action.region}.`,
        now
      )
    }
    case "aws/key":
      return addKey(state, "aws", action.name, now)
    case "aws/launch":
      return launchAws(state, action, now)
    case "aws/stop":
      return stopVm(state, "aws", action.id, now)
    case "aws/start":
      return startVm(state, "aws", action.id, now)
    case "aws/terminate":
      return terminateVm(state, "aws", action.id, now, "Terminated")
    case "aws/bucket":
      return createBucket(state, action.name, now)
    case "aws/delete-bucket":
      return deleteBucket(state, action.name, now)
    case "aws/ssh-ok":
      return markSsh(state, "aws", now)
    case "aws/budget":
      return setBudget(state, "aws", action.amount, now)
    case "aws/fast-forward":
      return fastForward(state, "aws", now)
    case "azure/review":
      return ok(patchAzure(state, { reviewedSite: true }), "azure", "Reviewed the Azure product and free-account pages.", now)
    case "azure/signup": {
      const email = cleanEmail(action.email)
      if (!state.azure.reviewedSite) return err("Review the Azure pages before creating an account.")
      if (!email) return err("Enter an email address with a name and a domain.")
      return ok(
        patchAzure(state, { accountCreated: true, email, studentOffer: action.student }),
        "azure",
        `Account created for ${email}.`,
        now,
        "Account created. Sign in to open the portal."
      )
    }
    case "azure/signin":
      if (!state.azure.accountCreated) return err("Sign up before you sign in.")
      return ok(patchAzure(state, { signedIn: true }), "azure", "Signed in to the Azure portal.", now, "Signed in.")
    case "azure/signout":
      return ok(patchAzure(state, { signedIn: false }), "azure", "Signed out of the Azure portal.", now)
    case "azure/location":
      if (!AZURE_LOCATIONS.some((location) => location.id === action.location)) {
        return err(`Unknown location ${action.location}.`)
      }
      return ok(patchAzure(state, { location: action.location }), "azure", `Location set to ${action.location}.`, now)
    case "azure/install-cli":
      return ok(patchAzure(state, { cliInstalled: true }), "azure", "Setting up azure-cli (2.67.0) ...", now, "")
    case "azure/login":
      if (!state.azure.accountCreated) return err("Sign up before you sign in.")
      if (!state.azure.cliInstalled) return err("Install Azure CLI first.")
      return ok(
        patchAzure(state, { loggedIn: true, signedIn: true }),
        "azure",
        "Signed in.",
        now,
        ""
      )
    case "azure/group":
      return createGroup(state, action.name, action.location, now)
    case "azure/delete-group":
      return deleteGroup(state, action.name, now)
    case "azure/key":
      return addKey(state, "azure", action.name, now)
    case "azure/launch":
      return launchAzure(state, action, now)
    case "azure/stop":
      return stopVm(state, "azure", action.id, now)
    case "azure/start":
      return startVm(state, "azure", action.id, now)
    case "azure/ssh-ok":
      return markSsh(state, "azure", now)
    case "azure/budget":
      return setBudget(state, "azure", action.amount, now)
    case "azure/fast-forward":
      return fastForward(state, "azure", now)
    case "do/review":
      return ok(patchDo(state, { reviewedSite: true }), "do", "Reviewed DigitalOcean products and pricing.", now)
    case "do/signup": {
      const email = cleanEmail(action.email)
      if (!state.do.reviewedSite) return err("Review the DigitalOcean pages before creating an account.")
      if (!email) return err("Enter an email address with a name and a domain.")
      return ok(
        patchDo(state, { accountCreated: true, email, creditApplied: true }),
        "do",
        `Account created for ${email}.`,
        now,
        "Account created. Sign in to the control panel."
      )
    }
    case "do/signin":
      if (!state.do.accountCreated) return err("Sign up before you sign in.")
      return ok(patchDo(state, { signedIn: true }), "do", "Signed in to the DigitalOcean control panel.", now, "Signed in.")
    case "do/signout":
      return ok(patchDo(state, { signedIn: false }), "do", "Signed out of the control panel.", now)
    case "do/region":
      if (!DO_REGIONS.some((region) => region.id === action.region)) {
        return err(`Unknown region ${action.region}.`)
      }
      return ok(patchDo(state, { region: action.region }), "do", `Region set to ${action.region}.`, now)
    case "do/install-cli":
      return ok(patchDo(state, { cliInstalled: true }), "do", "doctl 1.120.0-release installed.", now, "")
    case "do/auth":
      if (!state.do.accountCreated) return err("Sign up before you sign in.")
      if (!state.do.cliInstalled) return err("Install doctl first.")
      return ok(patchDo(state, { authed: true }), "do", "Validating token... OK", now, "")
    case "do/key":
      return addKey(state, "do", action.name, now)
    case "do/launch":
      return launchDo(state, action, now)
    case "do/stop":
      return stopVm(state, "do", action.id, now)
    case "do/start":
      return startVm(state, "do", action.id, now)
    case "do/destroy":
      return terminateVm(state, "do", action.id, now, "Destroyed")
    case "do/space":
      return createSpace(state, action.name, now)
    case "do/delete-space":
      return deleteSpace(state, action.name, now)
    case "do/ssh-ok":
      return markSsh(state, "do", now)
    case "do/budget":
      return setBudget(state, "do", action.amount, now)
    case "do/fast-forward":
      return fastForward(state, "do", now)
    default:
      return err("Unknown action.")
  }
}

function promote(state: LabState, now: number): ReduceResult {
  let changed = false
  const logs: string[] = []
  const lift = (vm: Vm, platform: PlatformId): Vm => {
    if (vm.state !== "pending") return vm
    changed = true
    const publicIp = publicAddress(platform, vm.id)
    logs.push(`${vm.name} is running at ${publicIp}.`)
    return { ...vm, state: "running", publicIp, meterFrom: now }
  }
  if (!hasPending(state)) return { state }
  const next: LabState = {
    ...state,
    aws: { ...state.aws, instances: state.aws.instances.map((vm) => lift(vm, "aws")) },
    azure: { ...state.azure, vms: state.azure.vms.map((vm) => lift(vm, "azure")) },
    do: { ...state.do, droplets: state.do.droplets.map((vm) => lift(vm, "do")) },
  }
  if (!changed) return { state }
  let logged = next
  for (const text of logs) logged = pushLog(logged, "lab", text, now)
  return { state: logged, message: logs[0] }
}

function launchAws(
  state: LabState,
  action: Extract<Action, { type: "aws/launch" }>,
  now: number
): ReduceResult {
  if (!state.aws.accountCreated) return err("Sign up before you launch an instance.")
  if (!state.aws.signedIn && !awsConfigured(state)) {
    return err("Sign in to the console, or finish aws configure, before launching.")
  }
  const image = AWS_IMAGES.find((item) => item.id === action.imageId)
  const size = AWS_SIZES.find((item) => item.id === action.sizeId)
  if (!image) return err(`Unknown image ${action.imageId}. Use ami-al2023 or ami-ubuntu2204.`)
  if (!size) return err(`Unknown instance type ${action.sizeId}.`)
  const requested = action.name.trim()
  const name = requested ? cleanName(requested, false) : "lab-vm"
  if (!name) return err("Instance name may use letters, numbers, dots, and hyphens.")
  const key = state.aws.keyPairs.find((item) => item.name === action.keyName)
  if (!key) return err(`Key pair ${action.keyName || "(missing)"} does not exist. Create one first.`)
  const vm = makeVm({
    id: `i-${hex(17)}`,
    name,
    image,
    size,
    region: state.aws.region,
    username: image.username,
    keyName: key.name,
    hourlyUsd: size.hourlyUsd,
    billsWhileStopped: false,
    now,
    allowHttp: action.allowHttp,
  })
  return ok(
    patchAws(state, { instances: [vm, ...state.aws.instances], launchedOnce: true }),
    "aws",
    `Launching ${vm.id} (${vm.name}) in ${vm.region}.`,
    now,
    `Successfully initiated launch of instance ${vm.id}.`
  )
}

function launchAzure(
  state: LabState,
  action: Extract<Action, { type: "azure/launch" }>,
  now: number
): ReduceResult {
  if (!state.azure.accountCreated) return err("Sign up before you create a virtual machine.")
  if (!state.azure.signedIn && !state.azure.loggedIn) {
    return err("Sign in to the portal or run az login before creating a VM.")
  }
  const group = state.azure.resourceGroups.find((item) => item.name === action.group)
  if (!group) return err(`Resource group ${action.group || "(missing)"} was not found.`)
  const image = AZURE_IMAGES.find((item) => item.id === action.imageId)
  const size = AZURE_SIZES.find((item) => item.id === action.sizeId)
  if (!image) return err("Unknown image. Use Ubuntu2204 or Debian12.")
  if (!size) return err("Unknown size. Use Standard_B1s, Standard_B1ms, or Standard_B2s.")
  const name = cleanName(action.name, false)
  if (!name) return err("VM name may use letters, numbers, dots, and hyphens.")
  const username = action.username.trim() || "azureuser"
  if (!/^[a-z_][a-z0-9_-]{0,30}$/.test(username)) {
    return err("Admin username must start with a letter and stay lowercase.")
  }
  const key = state.azure.keyPairs.find((item) => item.name === action.keyName)
  if (!key) return err(`SSH key ${action.keyName || "(missing)"} was not found.`)
  const vm = makeVm({
    id: `vm-${hex(8)}`,
    name,
    image,
    size,
    region: group.location,
    username,
    keyName: key.name,
    hourlyUsd: size.hourlyUsd,
    billsWhileStopped: false,
    now,
    allowHttp: false,
    resourceGroup: group.name,
  })
  return ok(
    patchAzure(state, { vms: [vm, ...state.azure.vms], launchedOnce: true }),
    "azure",
    `Creating ${vm.name} in ${group.name}.`,
    now,
    `${vm.name} is launching. The address appears when the state is running.`
  )
}

function launchDo(
  state: LabState,
  action: Extract<Action, { type: "do/launch" }>,
  now: number
): ReduceResult {
  if (!state.do.accountCreated) return err("Sign up before you create a Droplet.")
  if (!state.do.signedIn && !state.do.authed) {
    return err("Sign in to the control panel, or run doctl auth init, before creating a Droplet.")
  }
  if (!DO_REGIONS.some((region) => region.id === action.region)) {
    return err(`Unknown region ${action.region}.`)
  }
  const image = DO_IMAGES.find((item) => item.id === action.imageId)
  const size = DO_SIZES.find((item) => item.id === action.sizeId)
  if (!image) return err(`Unknown image ${action.imageId}.`)
  if (!size) return err("Unknown size.")
  const name = action.name.trim().toLowerCase()
  if (!/^[a-z0-9-]{1,32}$/.test(name)) {
    return err("Droplet names are lowercase letters, numbers, and hyphens.")
  }
  const key = state.do.keys.find((item) => item.name === action.keyName)
  if (!key) return err(`SSH key ${action.keyName || "(missing)"} is not on the account. Run ssh-keygen first.`)
  const vm = makeVm({
    id: String(20000000 + Math.floor(Math.random() * 70000000)),
    name,
    image,
    size,
    region: action.region,
    username: "root",
    keyName: key.name,
    hourlyUsd: size.hourlyUsd,
    billsWhileStopped: true,
    now,
    allowHttp: false,
  })
  return ok(
    patchDo(state, { droplets: [vm, ...state.do.droplets], launchedOnce: true, region: action.region }),
    "do",
    `Creating Droplet ${vm.name} (${vm.id}) in ${vm.region}.`,
    now,
    `${vm.name} is launching. The address appears when the state is running.`
  )
}

function stopVm(state: LabState, platform: PlatformId, id: string, now: number): ReduceResult {
  return updateVm(state, platform, id, now, (vm) => {
    if (vm.state === "pending") return "Wait until the machine is running."
    if (vm.state === "stopped") return "It is already stopped."
    if (vm.state === "terminated") return "It has already been removed."
    let billedMs = vm.billedMs
    let meterFrom = vm.meterFrom
    if (!vm.billsWhileStopped && meterFrom != null) {
      billedMs += Math.max(0, now - meterFrom)
      meterFrom = null
    }
    return { ...vm, state: "stopped", billedMs, meterFrom }
  }, (vm) => `Stopped ${vm.name}.`)
}

function startVm(state: LabState, platform: PlatformId, id: string, now: number): ReduceResult {
  return updateVm(state, platform, id, now, (vm) => {
    if (vm.state === "running" || vm.state === "pending") return "It is already on."
    if (vm.state === "terminated") return "This one is gone. Launch a new machine."
    return {
      ...vm,
      state: "running",
      meterFrom: vm.meterFrom ?? now,
      publicIp: vm.publicIp ?? publicAddress(platform, vm.id),
    }
  }, (vm) => `Started ${vm.name}.`)
}

function terminateVm(
  state: LabState,
  platform: PlatformId,
  id: string,
  now: number,
  verb: string
): ReduceResult {
  return updateVm(state, platform, id, now, (vm) => {
    if (vm.state === "terminated") return "It is already gone."
    let billedMs = vm.billedMs
    if (isMetering(vm) && vm.meterFrom != null) billedMs += Math.max(0, now - vm.meterFrom)
    if (vm.state === "running" && vm.meterFrom != null && !vm.billsWhileStopped) {
      billedMs = vm.billedMs + Math.max(0, now - vm.meterFrom)
    }
    return { ...vm, state: "terminated", billedMs, meterFrom: null, publicIp: null }
  }, (vm) => `${verb} ${vm.name}.`)
}

function createBucket(state: LabState, name: string, now: number): ReduceResult {
  if (!state.aws.signedIn && !awsConfigured(state)) return err("Sign in or configure the CLI first.")
  const bucket = name.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
    return err("Bucket names are 3–63 characters, lowercase, and cannot be only punctuation.")
  }
  if (state.aws.buckets.some((item) => item.name === bucket)) return err(`Bucket ${bucket} already exists.`)
  return ok(
    patchAws(state, {
      buckets: [{ name: bucket, region: state.aws.region, createdAt: now }, ...state.aws.buckets],
    }),
    "aws",
    `Created bucket ${bucket}.`,
    now,
    `Bucket ${bucket} created.`
  )
}

function deleteBucket(state: LabState, name: string, now: number): ReduceResult {
  const bucket = name.trim().toLowerCase()
  if (!state.aws.buckets.some((item) => item.name === bucket)) return err(`Bucket ${bucket} was not found.`)
  return ok(
    patchAws(state, { buckets: state.aws.buckets.filter((item) => item.name !== bucket) }),
    "aws",
    `Deleted bucket ${bucket}.`,
    now
  )
}

function createGroup(state: LabState, name: string, location: string, now: number): ReduceResult {
  if (!state.azure.signedIn && !state.azure.loggedIn) return err("Sign in or run az login first.")
  const group = name.trim()
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(group)) return err("Resource group names use letters, numbers, underscores, and hyphens.")
  if (!AZURE_LOCATIONS.some((item) => item.id === location)) return err(`Unknown location ${location}.`)
  if (state.azure.resourceGroups.some((item) => item.name === group)) return err(`Resource group ${group} already exists.`)
  return ok(
    patchAzure(state, {
      resourceGroups: [{ name: group, location, createdAt: now }, ...state.azure.resourceGroups],
    }),
    "azure",
    `Created resource group ${group} in ${location}.`,
    now,
    `Resource group ${group} created.`
  )
}

function deleteGroup(state: LabState, name: string, now: number): ReduceResult {
  const group = state.azure.resourceGroups.find((item) => item.name === name)
  if (!group) return err(`Resource group ${name || "(missing)"} was not found.`)
  const vms = state.azure.vms.map((vm) => {
    if (vm.resourceGroup !== group.name || vm.state === "terminated") return vm
    let billedMs = vm.billedMs
    if (vm.meterFrom != null && (vm.state === "running" || vm.state === "pending")) {
      billedMs += Math.max(0, now - vm.meterFrom)
    }
    return { ...vm, state: "terminated" as const, billedMs, meterFrom: null, publicIp: null }
  })
  return ok(
    patchAzure(state, {
      resourceGroups: state.azure.resourceGroups.filter((item) => item.name !== group.name),
      vms,
    }),
    "azure",
    `Deleted resource group ${group.name} and everything inside it.`,
    now,
    `Deleted ${group.name}.`
  )
}

function createSpace(state: LabState, name: string, now: number): ReduceResult {
  if (!state.do.signedIn && !state.do.authed) return err("Sign in or authenticate doctl first.")
  const space = name.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(space)) {
    return err("Space names are lowercase letters, numbers, and hyphens.")
  }
  if (state.do.spaces.some((item) => item.name === space)) return err(`Space ${space} already exists.`)
  return ok(
    patchDo(state, { spaces: [{ name: space, region: state.do.region, createdAt: now }, ...state.do.spaces] }),
    "do",
    `Created Space ${space}.`,
    now
  )
}

function deleteSpace(state: LabState, name: string, now: number): ReduceResult {
  if (!state.do.spaces.some((item) => item.name === name)) return err(`Space ${name} was not found.`)
  return ok(
    patchDo(state, { spaces: state.do.spaces.filter((item) => item.name !== name) }),
    "do",
    `Deleted Space ${name}.`,
    now
  )
}

function addKey(state: LabState, platform: PlatformId, rawName: string, now: number): ReduceResult {
  const name = rawName.trim().replace(/\.pem$/, "").split("/").pop() || ""
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(name)) {
    return err("Key names use letters, numbers, dots, underscores, and hyphens.")
  }
  const list = keysOf(state, platform)
  if (list.some((item) => item.name === name)) return err(`Key ${name} already exists.`)
  const key: KeyMaterial = {
    name,
    fingerprint: `SHA256:${hex(16)}`,
    publicKey: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${hex(16)} talal@ubuntu`,
    createdAt: now,
  }
  if (platform === "aws") return ok(patchAws(state, { keyPairs: [...state.aws.keyPairs, key] }), "aws", `Key pair ${name} created.`, now, `Key pair ${name} created.`)
  if (platform === "azure") return ok(patchAzure(state, { keyPairs: [...state.azure.keyPairs, key] }), "azure", `SSH key ${name} created.`, now, `SSH key ${name} created.`)
  return ok(patchDo(state, { keys: [...state.do.keys, key] }), "do", `SSH key ${name} added to the account.`, now, `SSH key ${name} added.`)
}

function markSsh(state: LabState, platform: PlatformId, now: number): ReduceResult {
  const running = vmsOf(state, platform).some((vm) => vm.state === "running")
  if (!running) return err("There is no running machine to verify.")
  if (platform === "aws") {
    if (state.aws.sshVerified) return { state }
    return ok(patchAws(state, { sshVerified: true }), "aws", "uname -a succeeded on the EC2 instance.", now, "")
  }
  if (platform === "azure") {
    if (state.azure.sshVerified) return { state }
    return ok(patchAzure(state, { sshVerified: true }), "azure", "uname -a succeeded on the Azure VM.", now, "")
  }
  if (state.do.sshVerified) return { state }
  return ok(patchDo(state, { sshVerified: true }), "do", "uname -a succeeded on the Droplet.", now, "")
}

function setBudget(state: LabState, platform: PlatformId, amount: number, now: number): ReduceResult {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000) return err("Use a budget between 0 and 1000 dollars.")
  const text = `Billing alert set to $${amount.toFixed(2)}.`
  if (platform === "aws") return ok(patchAws(state, { budgetUsd: amount }), "aws", text, now, text)
  if (platform === "azure") return ok(patchAzure(state, { budgetUsd: amount }), "azure", text, now, text)
  return ok(patchDo(state, { budgetUsd: amount }), "do", text, now, text)
}

function fastForward(state: LabState, platform: PlatformId, now: number): ReduceResult {
  const bump = (vm: Vm): Vm => (isMetering(vm) ? { ...vm, billedMs: vm.billedMs + DAY_MS } : vm)
  const text = "Cost updated for the next 24 hours."
  if (platform === "aws") return ok(patchAws(state, { instances: state.aws.instances.map(bump) }), "aws", text, now, text)
  if (platform === "azure") return ok(patchAzure(state, { vms: state.azure.vms.map(bump) }), "azure", text, now, text)
  return ok(patchDo(state, { droplets: state.do.droplets.map(bump) }), "do", text, now, text)
}

function updateVm(
  state: LabState,
  platform: PlatformId,
  id: string,
  now: number,
  change: (vm: Vm) => Vm | string,
  describe: (vm: Vm) => string
): ReduceResult {
  const list = vmsOf(state, platform)
  const current = list.find((vm) => vm.id === id)
  if (!current) return err(`No machine with id ${id}.`)
  const next = change(current)
  if (typeof next === "string") return err(next)
  const machines = list.map((vm) => (vm.id === id ? next : vm))
  const patched =
    platform === "aws"
      ? patchAws(state, { instances: machines })
      : platform === "azure"
        ? patchAzure(state, { vms: machines })
        : patchDo(state, { droplets: machines })
  return ok(patched, platform, describe(next), now, describe(next))
}

function makeVm(input: {
  id: string
  name: string
  image: { id: string; label: string }
  size: { id: string; label: string; ram: string }
  region: string
  username: string
  keyName: string
  hourlyUsd: number
  billsWhileStopped: boolean
  now: number
  allowHttp: boolean
  resourceGroup?: string
}): Vm {
  return {
    id: input.id,
    name: input.name,
    imageId: input.image.id,
    imageLabel: input.image.label,
    sizeId: input.size.id,
    sizeLabel: input.size.label,
    region: input.region,
    state: "pending",
    publicIp: null,
    privateIp: privateAddress(input.id),
    username: input.username,
    keyName: input.keyName,
    resourceGroup: input.resourceGroup,
    hourlyUsd: input.hourlyUsd,
    billsWhileStopped: input.billsWhileStopped,
    createdAt: input.now,
    meterFrom: null,
    billedMs: 0,
    ram: input.size.ram,
    allowHttp: input.allowHttp,
  }
}

function keysOf(state: LabState, platform: PlatformId): KeyMaterial[] {
  if (platform === "aws") return state.aws.keyPairs
  if (platform === "azure") return state.azure.keyPairs
  return state.do.keys
}

function hasPending(state: LabState): boolean {
  return [state.aws.instances, state.azure.vms, state.do.droplets].some((list) =>
    list.some((vm) => vm.state === "pending")
  )
}

function publicAddress(platform: PlatformId, seed: string): string {
  const host = octet(seed)
  if (platform === "aws") return `203.0.113.${host}`
  if (platform === "azure") return `198.51.100.${host}`
  return `192.0.2.${host}`
}

function privateAddress(seed: string): string {
  const host = octet(seed)
  return `10.0.${host % 4}.${(host % 200) + 10}`
}

function octet(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0
  return (hash % 200) + 20
}

function hex(length: number): string {
  let value = ""
  for (let i = 0; i < length; i += 1) {
    value += "0123456789abcdef"[Math.floor(Math.random() * 16)]
  }
  return value
}

function cleanEmail(email: string): string | null {
  const value = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  return value
}

function cleanName(name: string, lower: boolean): string | null {
  const value = (lower ? name.trim().toLowerCase() : name.trim()) || ""
  if (!value) return null
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(value)) return null
  return value
}

function patchAws(state: LabState, patch: Partial<LabState["aws"]>): LabState {
  return { ...state, aws: { ...state.aws, ...patch } }
}

function patchAzure(state: LabState, patch: Partial<LabState["azure"]>): LabState {
  return { ...state, azure: { ...state.azure, ...patch } }
}

function patchDo(state: LabState, patch: Partial<LabState["do"]>): LabState {
  return { ...state, do: { ...state.do, ...patch } }
}

function pushLog(state: LabState, platform: LabState["logs"][number]["platform"], text: string, now: number): LabState {
  return {
    ...state,
    logs: [{ id: `log-${hex(8)}`, at: now, platform, text }, ...state.logs].slice(0, 40),
  }
}

function ok(
  state: LabState,
  platform: LabState["logs"][number]["platform"],
  text: string,
  now: number,
  message?: string
): ReduceResult {
  return { state: pushLog(state, platform, text, now), message: message ?? text }
}

function err(error: string): ReduceResult {
  return { state: activeState, error }
}
