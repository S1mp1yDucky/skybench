import { LOCAL_UNAME } from "../lib/guest"
import { redact, runCommand, runRemote } from "../lib/shell"
import { apply, initialState, reduce, vmCost } from "../lib/simulator"
import { awsSteps, azureSteps, doSteps } from "../lib/steps"
import type { Action, LabState } from "../lib/types"

function applyAll(state: LabState, actions: Action[]): LabState {
  return actions.reduce((current, action) => apply(current, action), state)
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const secret = "SUPERSECRET99"
assert(redact(`aws configure set aws_secret_access_key ${secret}`).includes("****"), "redact hides the secret")
assert(!redact(`aws configure set aws_secret_access_key ${secret}`).includes(secret), "redact removes the secret")

let state = initialState
state = apply(state, { type: "aws/review" })
state = apply(state, { type: "aws/signup", email: "hassan@student.skybench.test" })
state = apply(state, { type: "aws/signin" })

let shell = runCommand("aws", state, "sudo apt install -y awscli")
state = applyAll(state, shell.actions)
shell = runCommand("aws", state, "aws --version")
assert(shell.lines.some((line) => line.text.includes("aws-cli/2")), "aws version")

shell = runCommand("aws", state, `aws configure set aws_secret_access_key ${secret}`)
assert(!JSON.stringify(shell).includes(secret), "shell result drops the secret")
state = applyAll(state, shell.actions)
assert(!JSON.stringify(state).includes(secret), "state drops the secret")
shell = runCommand("aws", state, "aws configure set aws_access_key_id AKIASIMULATED")
state = applyAll(state, shell.actions)
assert(!JSON.stringify(state).includes("AKIASIMULATED"), "access key is not stored")

shell = runCommand("aws", state, "aws ec2 create-key-pair --key-name skybench")
state = applyAll(state, shell.actions)
shell = runCommand("aws", state, "aws ec2 run-instances --image-id ami-al2023 --instance-type t2.micro --key-name skybench")
state = applyAll(state, shell.actions)
assert(state.aws.instances[0]?.state === "pending", "instance pending")
const denied = runCommand("aws", state, "ssh ec2-user@203.0.113.10")
assert(denied.lines.some((line) => line.tone === "err"), "ssh without a match fails")

state = apply(state, { type: "promote", now: 1_700_000_000_000 })
const vm = state.aws.instances[0]
assert(vm?.state === "running", "instance running")
assert(vm?.publicIp?.startsWith("203.0.113."), "aws documentation address")
shell = runCommand("aws", state, `ssh -i skybench.pem ${vm.username}@${vm.publicIp}`)
assert(shell.connect === vm.id, "ssh connects")
const remote = runRemote("aws", vm, "uname -a")
assert(remote.verified, "uname verifies")
assert(remote.lines[0]?.text.includes("amzn2023"), "amazon linux kernel")
const local = runCommand("aws", state, "uname -a")
assert(local.lines.some((line) => line.text.includes(LOCAL_UNAME.split(" ")[0])), "local uname")
assert(!local.actions.some((action) => action.type === "aws/ssh-ok"), "local uname does not verify ssh")
state = apply(state, { type: "aws/ssh-ok" })

const beforeStop = vmCost(state.aws.instances[0], 1_700_000_001_000)
state = apply(state, { type: "aws/stop", id: vm.id, now: 1_700_000_001_000 })
const stoppedCost = vmCost(state.aws.instances[0], 1_700_000_001_000)
state = apply(state, { type: "aws/fast-forward", now: 1_700_000_002_000 })
assert(vmCost(state.aws.instances[0], 1_700_000_002_000) === stoppedCost, "stopped EC2 does not keep billing")
assert(stoppedCost >= beforeStop, "stop settles the running time")

shell = runCommand("aws", state, `aws ec2 terminate-instances --instance-ids ${vm.id}`)
state = applyAll(state, shell.actions)
assert(awsSteps(state).every((step) => step.done), `aws steps incomplete: ${awsSteps(state).filter((step) => !step.done).map((step) => step.title).join(", ")}`)

const bad = reduce(state, { type: "aws/bucket", name: "NOT_VALID" })
assert(bad.error, "bad bucket errors")
assert(bad.state === state, "failed action keeps state")

state = apply(state, { type: "azure/review" })
state = apply(state, { type: "azure/signup", email: "hassan@student.skybench.test", student: true })
state = apply(state, { type: "azure/signin" })
shell = runCommand("azure", state, "sudo apt install -y azure-cli")
state = applyAll(state, shell.actions)
shell = runCommand("azure", state, "az login")
state = applyAll(state, shell.actions)
shell = runCommand("azure", state, "az group create --name lab-rg --location centralindia")
state = applyAll(state, shell.actions)
const refused = runCommand("azure", state, "az group delete --name lab-rg")
assert(refused.actions.length === 0, "group delete needs --yes")
shell = runCommand("azure", state, "az vm create -g lab-rg -n vm-lab --image Ubuntu2204 --size Standard_B1s --admin-username azureuser --generate-ssh-keys")
state = applyAll(state, shell.actions)
state = apply(state, { type: "promote", now: 1_700_000_003_000 })
const azureVm = state.azure.vms[0]
assert(azureVm?.publicIp?.startsWith("198.51.100."), "azure documentation address")
shell = runCommand("azure", state, `ssh ${azureVm.username}@${azureVm.publicIp}`)
assert(shell.connect === azureVm.id, "azure ssh")
assert(runRemote("azure", azureVm, "uname -a").verified, "azure uname")
state = apply(state, { type: "azure/ssh-ok" })
shell = runCommand("azure", state, "az group delete --name lab-rg --yes")
state = applyAll(state, shell.actions)
assert(state.azure.resourceGroups.length === 0, "group deleted")
assert(azureSteps(state).every((step) => step.done), `azure steps incomplete: ${azureSteps(state).filter((step) => !step.done).map((step) => step.title).join(", ")}`)

state = apply(state, { type: "do/review" })
state = apply(state, { type: "do/signup", email: "hassan@student.skybench.test" })
state = apply(state, { type: "do/signin" })
shell = runCommand("do", state, "sudo snap install doctl")
state = applyAll(state, shell.actions)
shell = runCommand("do", state, "doctl auth init --access-token tokensecret")
assert(!JSON.stringify(shell).includes("tokensecret"), "token not echoed")
state = applyAll(state, shell.actions)
assert(!JSON.stringify(state).includes("tokensecret"), "token not stored")
shell = runCommand("do", state, 'ssh-keygen -t ed25519 -f ~/.ssh/skybench -N ""')
state = applyAll(state, shell.actions)
shell = runCommand("do", state, "doctl compute droplet create droplet-lab --image ubuntu-22-04-x64 --size s-1vcpu-1gb --region blr1 --ssh-keys skybench")
state = applyAll(state, shell.actions)
state = apply(state, { type: "promote", now: 1_700_000_004_000 })
const droplet = state.do.droplets[0]
assert(droplet?.publicIp?.startsWith("192.0.2."), "do documentation address")
state = apply(state, { type: "do/stop", id: droplet.id, now: 1_700_000_005_000 })
const sample = 1_700_000_006_000
const before = vmCost(state.do.droplets[0], sample)
state = apply(state, { type: "do/fast-forward", now: sample })
const after = vmCost(state.do.droplets[0], sample)
assert(Math.abs(after - before - 24 * droplet.hourlyUsd) < 1e-9, "powered-off droplet keeps billing")
shell = runCommand("do", state, `ssh root@${droplet.publicIp}`)
assert(shell.connect === undefined, "stopped droplet refuses ssh")
state = apply(state, { type: "do/start", id: droplet.id, now: sample })
const running = state.do.droplets[0]
shell = runCommand("do", state, `ssh root@${running.publicIp}`)
assert(shell.connect === running.id, "do ssh")
assert(runRemote("do", running, "uname -a").verified, "do uname")
state = apply(state, { type: "do/ssh-ok" })
shell = runCommand("do", state, `doctl compute droplet delete ${running.id} --force`)
state = applyAll(state, shell.actions)
assert(doSteps(state).every((step) => step.done), `do steps incomplete: ${doSteps(state).filter((step) => !step.done).map((step) => step.title).join(", ")}`)

console.log("skybench checks passed")
