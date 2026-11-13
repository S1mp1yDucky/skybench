import type { LabState, PlatformId, Vm } from "@/lib/types"
import { awsConfigured, vmsOf } from "@/lib/simulator"

export interface LabStep {
  n: number
  title: string
  detail: string
  done: boolean
}

function active(vms: Vm[]): Vm[] {
  return vms.filter((vm) => vm.state === "pending" || vm.state === "running" || vm.state === "stopped")
}

export function awsSteps(state: LabState): LabStep[] {
  const aws = state.aws
  const machines = aws.instances
  return [
    {
      n: 1,
      title: "Review the service",
      detail: "Read products, pricing, and the free tier, then continue.",
      done: aws.reviewedSite,
    },
    {
      n: 2,
      title: "Create an account",
      detail: "Email, a discarded password, and the on-screen lab code. No card is collected.",
      done: aws.accountCreated,
    },
    {
      n: 3,
      title: "Sign in and choose a region",
      detail: "Open the console. ap-south-1 (Mumbai) is the nearby default.",
      done: aws.signedIn,
    },
    {
      n: 4,
      title: "Install and configure the CLI",
      detail: "sudo apt install -y awscli, then aws configure. Keys are discarded.",
      done: aws.cliInstalled && awsConfigured(state),
    },
    {
      n: 5,
      title: "Launch an EC2 instance",
      detail: "Free-tier size, a key pair, and SSH allowed.",
      done: aws.launchedOnce,
    },
    {
      n: 6,
      title: "Connect and run uname -a",
      detail: "ssh -i key.pem ec2-user@203.0.113.x, then uname -a on the instance.",
      done: aws.sshVerified,
    },
    {
      n: 7,
      title: "Terminate it",
      detail: "Stop is not enough. Terminate so nothing is left running or stopped.",
      done: aws.launchedOnce && active(machines).length === 0,
    },
  ]
}

export function azureSteps(state: LabState): LabStep[] {
  const azure = state.azure
  return [
    {
      n: 1,
      title: "Review the service",
      detail: "Read the portal overview, student offer, and pricing.",
      done: azure.reviewedSite,
    },
    {
      n: 2,
      title: "Create an account",
      detail: "Use the student offer if you want the path that skips a card.",
      done: azure.accountCreated,
    },
    {
      n: 3,
      title: "Sign in to the portal",
      detail: "portal.azure.com, simulated here. Pick a location such as Central India.",
      done: azure.signedIn,
    },
    {
      n: 4,
      title: "Install Azure CLI and sign in",
      detail: "sudo apt install -y azure-cli, then az login.",
      done: azure.cliInstalled && azure.loggedIn,
    },
    {
      n: 5,
      title: "Create a resource group and a VM",
      detail: "Ubuntu, a small size, and port 22.",
      done: azure.launchedOnce,
    },
    {
      n: 6,
      title: "Connect and run uname -a",
      detail: "ssh azureuser@198.51.100.x on the running VM.",
      done: azure.sshVerified,
    },
    {
      n: 7,
      title: "Delete the resource group",
      detail: "Deleting the group removes the VM and anything else you put in it.",
      done: azure.launchedOnce && azure.resourceGroups.length === 0,
    },
  ]
}

export function doSteps(state: LabState): LabStep[] {
  const ocean = state.do
  return [
    {
      n: 1,
      title: "Review the service",
      detail: "Read products, pricing, and the docs overview.",
      done: ocean.reviewedSite,
    },
    {
      n: 2,
      title: "Create an account",
      detail: "Verify email, then apply lab credit instead of a card or PayPal.",
      done: ocean.accountCreated,
    },
    {
      n: 3,
      title: "Open the control panel",
      detail: "Sign in. blr1 (Bangalore) is the nearby default.",
      done: ocean.signedIn,
    },
    {
      n: 4,
      title: "SSH key and doctl",
      detail: "ssh-keygen, install doctl, then doctl auth init.",
      done: ocean.cliInstalled && ocean.authed && ocean.keys.length > 0,
    },
    {
      n: 5,
      title: "Create a Droplet",
      detail: "Ubuntu, a basic shared-CPU plan, and the SSH key.",
      done: ocean.launchedOnce,
    },
    {
      n: 6,
      title: "Connect and run uname -a",
      detail: "ssh root@192.0.2.x once the Droplet is running.",
      done: ocean.sshVerified,
    },
    {
      n: 7,
      title: "Destroy the Droplet",
      detail: "Power off still bills. Destroy is the step that stops the meter.",
      done: ocean.launchedOnce && active(ocean.droplets).length === 0,
    },
  ]
}

export function stepsFor(state: LabState, platform: PlatformId): LabStep[] {
  if (platform === "aws") return awsSteps(state)
  if (platform === "azure") return azureSteps(state)
  return doSteps(state)
}

export function doneCount(steps: LabStep[]): number {
  return steps.filter((step) => step.done).length
}

export function shellHint(state: LabState, platform: PlatformId): string {
  if (platform === "aws") {
    if (!state.aws.cliInstalled) return "sudo apt install -y awscli"
    if (!awsConfigured(state)) return "aws configure"
    if (state.aws.keyPairs.length === 0) return "aws ec2 create-key-pair --key-name MyKeyPair"
    if (!state.aws.launchedOnce) {
      return "aws ec2 run-instances --image-id ami-al2023 --instance-type t2.micro --key-name MyKeyPair"
    }
    const running = state.aws.instances.find((vm) => vm.state === "running")
    if (running && !state.aws.sshVerified && running.publicIp) {
      return `ssh -i ${running.keyName}.pem ${running.username}@${running.publicIp}`
    }
    const leftover = active(state.aws.instances)[0]
    if (leftover) return `aws ec2 terminate-instances --instance-ids ${leftover.id}`
    return "aws ec2 describe-instances"
  }
  if (platform === "azure") {
    if (!state.azure.cliInstalled) return "sudo apt install -y azure-cli"
    if (!state.azure.loggedIn) return "az login"
    if (state.azure.resourceGroups.length === 0) return "az group create --name lab-rg --location centralindia"
    if (state.azure.keyPairs.length === 0) return "ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N \"\""
    if (!state.azure.launchedOnce) {
      return "az vm create --resource-group lab-rg --name vm-lab --image Ubuntu2204 --size Standard_B1s --admin-username azureuser --generate-ssh-keys"
    }
    const running = state.azure.vms.find((vm) => vm.state === "running")
    if (running && !state.azure.sshVerified && running.publicIp) {
      return `ssh ${running.username}@${running.publicIp}`
    }
    const group = state.azure.resourceGroups[0]
    if (group) return `az group delete --name ${group.name} --yes`
    return "az vm list --output table"
  }
  if (!state.do.cliInstalled) return "sudo snap install doctl"
  if (!state.do.authed) return "doctl auth init"
  if (state.do.keys.length === 0) return "ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N \"\""
  if (!state.do.launchedOnce) {
    const key = state.do.keys[0]?.name ?? "MyKeyPair"
    return `doctl compute droplet create web --image ubuntu-22-04-x64 --size s-1vcpu-1gb --region blr1 --ssh-keys ${key}`
  }
  const running = state.do.droplets.find((vm) => vm.state === "running")
  if (running && !state.do.sshVerified && running.publicIp) return `ssh root@${running.publicIp}`
  const leftover = active(state.do.droplets)[0]
  if (leftover) return `doctl compute droplet delete ${leftover.id} --force`
  return "doctl compute droplet list"
}

export function runningVm(state: LabState, platform: PlatformId): Vm | undefined {
  return vmsOf(state, platform).find((vm) => vm.state === "running")
}
