export type PlatformId = "aws" | "azure" | "do"

export type VmState = "pending" | "running" | "stopped" | "terminated"

export interface Vm {
  id: string
  name: string
  imageId: string
  imageLabel: string
  sizeId: string
  sizeLabel: string
  region: string
  state: VmState
  publicIp: string | null
  privateIp: string
  username: string
  keyName: string
  resourceGroup?: string
  hourlyUsd: number
  billsWhileStopped: boolean
  createdAt: number
  meterFrom: number | null
  billedMs: number
  ram: string
  allowHttp: boolean
}

export interface KeyMaterial {
  name: string
  fingerprint: string
  publicKey: string
  createdAt: number
}

export interface Bucket {
  name: string
  region: string
  createdAt: number
}

export interface ResourceGroup {
  name: string
  location: string
  createdAt: number
}

export interface Space {
  name: string
  region: string
  createdAt: number
}

export interface AwsSlice {
  reviewedSite: boolean
  accountCreated: boolean
  email: string
  signedIn: boolean
  region: string
  cliInstalled: boolean
  accessKeySet: boolean
  secretSet: boolean
  outputFormat: string
  keyPairs: KeyMaterial[]
  instances: Vm[]
  buckets: Bucket[]
  sshVerified: boolean
  budgetUsd: number
  launchedOnce: boolean
}

export interface AzureSlice {
  reviewedSite: boolean
  accountCreated: boolean
  email: string
  studentOffer: boolean
  signedIn: boolean
  location: string
  cliInstalled: boolean
  loggedIn: boolean
  resourceGroups: ResourceGroup[]
  vms: Vm[]
  keyPairs: KeyMaterial[]
  sshVerified: boolean
  budgetUsd: number
  launchedOnce: boolean
  subscription: string
}

export interface DoSlice {
  reviewedSite: boolean
  accountCreated: boolean
  email: string
  creditApplied: boolean
  signedIn: boolean
  region: string
  cliInstalled: boolean
  authed: boolean
  keys: KeyMaterial[]
  droplets: Vm[]
  spaces: Space[]
  sshVerified: boolean
  budgetUsd: number
  launchedOnce: boolean
}

export interface LabLog {
  id: string
  at: number
  platform: PlatformId | "lab"
  text: string
}

export interface LabState {
  version: 1
  aws: AwsSlice
  azure: AzureSlice
  do: DoSlice
  logs: LabLog[]
}

export interface ImageOption {
  id: string
  label: string
  username: string
  os: string
  amiTitle?: string
  amiIds?: string
  freeTier?: boolean
}

export interface SizeOption {
  id: string
  label: string
  vcpu: number
  ram: string
  hourlyUsd: number
  free: boolean
  note: string
}

export interface RegionOption {
  id: string
  label: string
}

export interface ShellLine {
  tone: "out" | "err" | "info"
  text: string
}

export interface ShellResult {
  lines: ShellLine[]
  actions: Action[]
  connect?: string
  clear?: boolean
  wizard?: "aws-configure" | "do-token"
}

type LabAction =
  | { type: "reset" }
  | { type: "promote"; now?: number }
  | { type: "aws/review" }
  | { type: "aws/signup"; email: string }
  | { type: "aws/signin" }
  | { type: "aws/signout" }
  | { type: "aws/region"; region: string }
  | { type: "aws/install-cli" }
  | { type: "aws/credential"; field: "access" | "secret" }
  | { type: "aws/configure"; region: string; format: string; markKeys?: boolean }
  | { type: "aws/key"; name: string }
  | {
      type: "aws/launch"
      name: string
      imageId: string
      sizeId: string
      keyName: string
      allowHttp: boolean
    }
  | { type: "aws/stop"; id: string }
  | { type: "aws/start"; id: string }
  | { type: "aws/terminate"; id: string }
  | { type: "aws/bucket"; name: string }
  | { type: "aws/delete-bucket"; name: string }
  | { type: "aws/ssh-ok" }
  | { type: "aws/budget"; amount: number }
  | { type: "aws/fast-forward"; now?: number }
  | { type: "azure/review" }
  | { type: "azure/signup"; email: string; student: boolean }
  | { type: "azure/signin" }
  | { type: "azure/signout" }
  | { type: "azure/location"; location: string }
  | { type: "azure/install-cli" }
  | { type: "azure/login" }
  | { type: "azure/group"; name: string; location: string }
  | { type: "azure/delete-group"; name: string }
  | { type: "azure/key"; name: string }
  | {
      type: "azure/launch"
      name: string
      group: string
      imageId: string
      sizeId: string
      keyName: string
      username: string
    }
  | { type: "azure/stop"; id: string }
  | { type: "azure/start"; id: string }
  | { type: "azure/ssh-ok" }
  | { type: "azure/budget"; amount: number }
  | { type: "azure/fast-forward"; now?: number }
  | { type: "do/review" }
  | { type: "do/signup"; email: string }
  | { type: "do/signin" }
  | { type: "do/signout" }
  | { type: "do/region"; region: string }
  | { type: "do/install-cli" }
  | { type: "do/auth" }
  | { type: "do/key"; name: string }
  | {
      type: "do/launch"
      name: string
      imageId: string
      sizeId: string
      keyName: string
      region: string
    }
  | { type: "do/stop"; id: string }
  | { type: "do/start"; id: string }
  | { type: "do/destroy"; id: string }
  | { type: "do/space"; name: string }
  | { type: "do/delete-space"; name: string }
  | { type: "do/ssh-ok" }
  | { type: "do/budget"; amount: number }
  | { type: "do/fast-forward"; now?: number }

export type Action = LabAction & { now?: number }
