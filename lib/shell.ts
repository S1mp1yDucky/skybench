import {
  AWS_REGIONS,
  AWS_SIZES,
  AZURE_LOCATIONS,
  DO_REGIONS,
} from "@/lib/catalog"
import { LOCAL_UNAME, memFree, osRelease, remoteUname } from "@/lib/guest"
import { awsConfigured, vmByIp, vmsOf } from "@/lib/simulator"
import type { Action, LabState, PlatformId, ShellLine, ShellResult, Vm } from "@/lib/types"

const out = (text: string): ShellLine => ({ tone: "out", text })
const err = (text: string): ShellLine => ({ tone: "err", text })
const info = (text: string): ShellLine => ({ tone: "info", text })

export function redact(line: string): string {
  return line
    .replace(/(aws_secret_access_key\s+)\S+/gi, "$1****")
    .replace(/(aws_access_key_id\s+)\S+/gi, "$1****")
    .replace(/(--secret-access-key\s+)\S+/gi, "$1****")
    .replace(/(--access-key(?:-id)?\s+)\S+/gi, "$1****")
    .replace(/(--access-token\s+)\S+/gi, "$1****")
}

export function runRemote(platform: PlatformId, vm: Vm, raw: string): { lines: ShellLine[]; verified: boolean } {
  const line = raw.trim()
  if (!line) return { lines: [], verified: false }
  const [cmd, ...rest] = tokenize(line)
  const command = cmd ?? ""
  if (command === "uname" && (rest.length === 0 || rest.includes("-a"))) {
    return { lines: [out(remoteUname(platform, vm))], verified: true }
  }
  if (command === "whoami") return { lines: [out(vm.username)], verified: false }
  if (command === "hostname") return { lines: [out(vm.name)], verified: false }
  if (command === "pwd") return { lines: [out(vm.username === "root" ? "/root" : `/home/${vm.username}`)], verified: false }
  if (command === "ls") return { lines: [out("snap")], verified: false }
  if (command === "uptime") return { lines: [out(" 12:04:11 up 1 min,  1 user,  load average: 0.00, 0.00, 0.00")], verified: false }
  if (command === "free") return { lines: [out(memFree(vm))], verified: false }
  if (command === "df") return { lines: [out("Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        20G  1.8G   18G   10% /")], verified: false }
  if (command === "cat" && rest.join(" ").includes("os-release")) {
    return { lines: [out(osRelease(platform, vm))], verified: false }
  }
  if (command === "echo") return { lines: [out(rest.join(" "))], verified: false }
  if (command === "exit" || command === "logout") {
    return { lines: [info("Connection to the guest closed.")], verified: false }
  }
  if (command === "help") {
    return {
      lines: [
        out("Guest commands: uname -a, whoami, hostname, pwd, ls, free -h, df -h,"),
        out("cat /etc/os-release, uptime, echo, exit"),
        info("The assignment check is uname -a."),
      ],
      verified: false,
    }
  }
  return { lines: [err(`bash: ${command}: command not found`)], verified: false }
}

export function runCommand(platform: PlatformId, state: LabState, raw: string): ShellResult {
  const line = raw.trim()
  if (!line) return { lines: [], actions: [] }
  if (line === "clear") return { lines: [], actions: [], clear: true }

  const argv = tokenize(line)
  const head = argv[0] ?? ""

  if (head === "help") return { lines: help(platform), actions: [] }
  if (isInstall(line)) return install(platform, line)
  if (head === "ssh-keygen") return sshKeygen(platform, argv)
  if (head === "ssh") return ssh(platform, state, argv)
  if (["curl", "wget", "ping"].includes(head)) {
    return {
      lines: [err("This guest only reaches the simulated cloud APIs. Use aws, az, or doctl.")],
      actions: [],
    }
  }
  if (head === "apt" || head === "apt-get" || (head === "sudo" && (argv[1] === "apt" || argv[1] === "apt-get"))) {
    return {
      lines: [info("Package lists are simulated. Install awscli, azure-cli, or doctl with the commands in help.")],
      actions: [],
    }
  }
  if (head === "snap" || (head === "sudo" && argv[1] === "snap")) {
    return { lines: [err("snap: nothing to do. Try: sudo snap install doctl")], actions: [] }
  }

  const local = localCommand(argv)
  if (local) return local

  const program = stripSudo(argv)
  const bin = program[0] ?? ""
  if (bin === "aws") return awsCommand(platform, state, program)
  if (bin === "az") return azureCommand(platform, state, program)
  if (bin === "doctl") return doCommand(platform, state, program)
  return { lines: [err(`bash: ${head}: command not found`)], actions: [] }
}

function localCommand(argv: string[]): ShellResult | null {
  const [cmd, ...rest] = argv
  if (cmd === "pwd") return { lines: [out("/home/ubuntu")], actions: [] }
  if (cmd === "whoami") return { lines: [out("ubuntu")], actions: [] }
  if (cmd === "ls") return { lines: [out("Desktop  snap")], actions: [] }
  if (cmd === "echo") return { lines: [out(rest.join(" "))], actions: [] }
  if (cmd === "uname") {
    return {
      lines: [
        out(LOCAL_UNAME),
        info("This is the local VMware guest, not the cloud VM. SSH over, then run uname -a there."),
      ],
      actions: [],
    }
  }
  return null
}

function install(platform: PlatformId, line: string): ShellResult {
  const wantsAws = /awscli|aws-cli/.test(line) || /^install\s+aws$/.test(line)
  const wantsAzure = /azure-cli|InstallAzureCLIDeb/.test(line) || /^install\s+(az|azure-cli)$/.test(line)
  const wantsDo = /doctl/.test(line)
  if (wantsAws) {
    if (platform !== "aws") return wrongGuest(platform, "AWS CLI")
    return {
      lines: [
        out("Reading package lists..."),
        out("Installing awscli..."),
        out("aws-cli/2.27.50 Python/3.12.3 Linux/6.8.0 source/x86_64"),
        info("The binary is simulated. Nothing was downloaded."),
      ],
      actions: [{ type: "aws/install-cli" }],
    }
  }
  if (wantsAzure) {
    if (platform !== "azure") return wrongGuest(platform, "Azure CLI")
    return {
      lines: [
        out("Reading package lists..."),
        out("Installing azure-cli..."),
        out("azure-cli 2.67.0"),
        info("The binary is simulated. Nothing was downloaded."),
      ],
      actions: [{ type: "azure/install-cli" }],
    }
  }
  if (wantsDo) {
    if (platform !== "do") return wrongGuest(platform, "doctl")
    return {
      lines: [
        out("doctl 1.120.0-release installed"),
        info("The binary is simulated. Nothing was downloaded."),
      ],
      actions: [{ type: "do/install-cli" }],
    }
  }
  return { lines: [err("This lab can install awscli, azure-cli, or doctl.")], actions: [] }
}

function sshKeygen(platform: PlatformId, argv: string[]): ShellResult {
  const flags = flagMap(argv.slice(1))
  const file = typeof flags.f === "string" ? flags.f : "~/.ssh/id_ed25519"
  const name = file.split("/").pop()?.replace(/\.pub$/, "") || "id_ed25519"
  return {
    lines: [
      out("Generating public/private ed25519 key pair."),
      out(`Your identification has been saved in /home/ubuntu/${file.replace("~/", "")}`),
      out(`Your public key has been saved in /home/ubuntu/${file.replace("~/", "")}.pub`),
      info("The private key was not stored. Skybench only keeps a public key placeholder."),
    ],
    actions: [keyAction(platform, name)],
  }
}

function ssh(platform: PlatformId, state: LabState, argv: string[]): ShellResult {
  const parsed = parseSsh(argv.slice(1))
  if (!parsed?.host) {
    return { lines: [err("usage: ssh [-i key.pem] user@public-ip")], actions: [] }
  }
  const found = vmByIp(state, parsed.host)
  if (!found) {
    return { lines: [err(`ssh: connect to host ${parsed.host} port 22: Connection timed out`)], actions: [] }
  }
  if (found.platform !== platform) {
    return {
      lines: [err(`That address belongs to the ${found.platform} lab. Open that console's shell.`)],
      actions: [],
    }
  }
  const vm = found.vm
  if (vm.state === "pending") {
    return { lines: [err(`ssh: connect to host ${parsed.host} port 22: Connection timed out`), info("The machine is still pending.")], actions: [] }
  }
  if (vm.state !== "running") {
    return { lines: [err(`ssh: connect to host ${parsed.host} port 22: Connection refused`)], actions: [] }
  }
  if (parsed.user && parsed.user !== vm.username) {
    return { lines: [err(`Permission denied. This image signs in as ${vm.username}.`)], actions: [] }
  }
  if (platform === "aws") {
    const identity = (parsed.identity ?? "").split("/").pop()?.replace(/\.pem$/, "")
    if (!identity) {
      return { lines: [err(`Permission denied. Try: ssh -i ${vm.keyName}.pem ${vm.username}@${vm.publicIp}`)], actions: [] }
    }
    if (identity !== vm.keyName) {
      return { lines: [err(`Permission denied (publickey). This instance expects ${vm.keyName}.pem.`)], actions: [] }
    }
  }
  return {
    lines: [
      info(`Connected to ${vm.username}@${vm.publicIp}.`),
      info("You are on the cloud guest now. Run uname -a, then exit."),
    ],
    actions: [],
    connect: vm.id,
  }
}

function awsCommand(platform: PlatformId, state: LabState, argv: string[]): ShellResult {
  if (platform !== "aws") return wrongGuest(platform, "aws")
  if (!state.aws.cliInstalled) return missing("aws", "sudo apt install -y awscli")
  const sub = argv[1] ?? ""
  if (!sub || sub === "help" || sub === "--help") return { lines: help("aws"), actions: [] }
  if (sub === "--version" || sub === "version") {
    return { lines: [out("aws-cli/2.27.50 Python/3.12.3 Linux/6.8.0 source/x86_64 Ubuntu")], actions: [] }
  }
  if (sub === "configure" && (argv[2] === undefined)) {
    return { lines: [info("Keys you type next are discarded. Any placeholder is enough.")], actions: [], wizard: "aws-configure" }
  }
  if (sub === "configure" && argv[2] === "list") return { lines: configureList(state), actions: [] }
  if (sub === "configure" && argv[2] === "set") return configureSet(state, argv)
  if (!awsConfigured(state) && sub !== "configure") {
    return { lines: [err("Unable to locate credentials. Run aws configure.")], actions: [] }
  }
  if (sub === "sts" && argv[2] === "get-caller-identity") {
    return {
      lines: [out(JSON.stringify({ Account: "000000000000", Arn: "arn:aws:iam::000000000000:user/skybench", UserId: "SIMULATED" }, null, 2))],
      actions: [],
    }
  }
  if (sub === "s3" && argv[2] === "ls") {
    const lines = state.aws.buckets.length
      ? state.aws.buckets.map((bucket) => out(`s3://${bucket.name}`))
      : [info("No buckets in this lab.")]
    return { lines, actions: [] }
  }
  if (sub === "s3" && argv[2] === "mb") {
    const uri = argv[3] ?? ""
    const name = uri.replace(/^s3:\/\//, "")
    return { lines: [out(`make_bucket: ${name}`)], actions: [{ type: "aws/bucket", name }] }
  }
  if (sub === "s3" && argv[2] === "rb") {
    const name = (argv[3] ?? "").replace(/^s3:\/\//, "")
    return { lines: [out(`remove_bucket: ${name}`)], actions: [{ type: "aws/delete-bucket", name }] }
  }
  if (sub === "ec2" && argv[2] === "create-key-pair") {
    const flags = flagMap(argv.slice(3))
    const name = typeof flags["key-name"] === "string" ? flags["key-name"] : ""
    return {
      lines: [
        out(`Simulated key pair ${name || "(unnamed)"}.`),
        out("No private key is printed. A real CLI would show key material here."),
        info("Download the prop file from Key pairs if a recording needs a file. It will not open a real server."),
      ],
      actions: [{ type: "aws/key", name }],
    }
  }
  if (sub === "ec2" && argv[2] === "describe-key-pairs") {
    if (state.aws.keyPairs.length === 0) return { lines: [info("No key pairs.")], actions: [] }
    return {
      lines: state.aws.keyPairs.map((key) => out(`${key.name.padEnd(20)} ${key.fingerprint}`)),
      actions: [],
    }
  }
  if (sub === "ec2" && argv[2] === "describe-instances") {
    return { lines: describeAws(state), actions: [] }
  }
  if (sub === "ec2" && argv[2] === "run-instances") return runInstances(state, argv.slice(3))
  if (sub === "ec2" && argv[2] === "terminate-instances") {
    return idAction(argv.slice(3), (id) => [{ type: "aws/terminate", id }], "Terminating")
  }
  if (sub === "ec2" && argv[2] === "stop-instances") {
    return idAction(argv.slice(3), (id) => [{ type: "aws/stop", id }], "Stopping")
  }
  if (sub === "ec2" && argv[2] === "start-instances") {
    return idAction(argv.slice(3), (id) => [{ type: "aws/start", id }], "Starting")
  }
  return { lines: [err(`aws: unknown command "${argv.slice(1).join(" ")}". Type help.`)], actions: [] }
}

function azureCommand(platform: PlatformId, state: LabState, argv: string[]): ShellResult {
  if (platform !== "azure") return wrongGuest(platform, "az")
  if (!state.azure.cliInstalled) return missing("az", "sudo apt install -y azure-cli")
  const sub = argv[1] ?? ""
  if (!sub || sub === "help" || sub === "--help") return { lines: help("azure"), actions: [] }
  if (sub === "version" || sub === "--version") {
    return { lines: [out('{\n  "azure-cli": "2.67.0",\n  "azure-cli-core": "2.67.0"\n}')], actions: [] }
  }
  if (sub === "login") {
    return {
      lines: [
        info("A real az login opens https://microsoft.com/devicelogin and waits for a device code."),
        out(`Signed in as ${state.azure.email || "the lab account"}.`),
        out(`Subscription: ${state.azure.subscription} (simulated)`),
      ],
      actions: [{ type: "azure/login" }],
    }
  }
  if (!state.azure.loggedIn) return { lines: [err("Please run 'az login' to set up an account.")], actions: [] }
  if (sub === "account" && argv[2] === "show") {
    return {
      lines: [out(JSON.stringify({ name: state.azure.subscription, user: state.azure.email, state: "Enabled" }, null, 2))],
      actions: [],
    }
  }
  if (sub === "group" && argv[2] === "create") {
    const flags = flagMap(argv.slice(3))
    const name = stringFlag(flags, ["name", "n"])
    const location = stringFlag(flags, ["location", "l"]) || state.azure.location
    return { lines: [out(`Location ${location}`), out(`Resource group ${name} created.`)], actions: [{ type: "azure/group", name, location }] }
  }
  if (sub === "group" && argv[2] === "list") {
    if (state.azure.resourceGroups.length === 0) return { lines: [info("No resource groups.")], actions: [] }
    return { lines: state.azure.resourceGroups.map((group) => out(`${group.name.padEnd(24)} ${group.location}`)), actions: [] }
  }
  if (sub === "group" && argv[2] === "delete") {
    const flags = flagMap(argv.slice(3))
    const name = stringFlag(flags, ["name", "n"])
    if (flags.yes !== true && flags.y !== true) {
      return { lines: [err("Refusing to delete without --yes. A real CLI would prompt.")], actions: [] }
    }
    return { lines: [out(`Deleting ${name}...`)], actions: [{ type: "azure/delete-group", name }] }
  }
  if (sub === "vm" && argv[2] === "list") {
    const vms = vmsOf(state, "azure").filter((vm) => vm.state !== "terminated")
    if (vms.length === 0) return { lines: [info("No virtual machines.")], actions: [] }
    return { lines: vms.map((vm) => out(`${vm.name.padEnd(16)} ${vm.resourceGroup?.padEnd(16) ?? ""} ${vm.state.padEnd(12)} ${vm.publicIp ?? "-"}`)), actions: [] }
  }
  if (sub === "vm" && argv[2] === "create") return createAzureVm(state, argv.slice(3))
  return { lines: [err(`az: unknown command "${argv.slice(1).join(" ")}". Type help.`)], actions: [] }
}

function doCommand(platform: PlatformId, state: LabState, argv: string[]): ShellResult {
  if (platform !== "do") return wrongGuest(platform, "doctl")
  if (!state.do.cliInstalled) return missing("doctl", "sudo snap install doctl")
  const sub = argv[1] ?? ""
  if (!sub || sub === "help") return { lines: help("do"), actions: [] }
  if (sub === "version") return { lines: [out("doctl version 1.120.0-release (simulated)")], actions: [] }
  if (sub === "auth" && argv[2] === "init") {
    const flags = flagMap(argv.slice(3))
    if (typeof flags["access-token"] === "string") {
      return {
        lines: [info("Token discarded."), out("doctl is authenticated for this lab.")],
        actions: [{ type: "do/auth" }],
      }
    }
    return { lines: [info("Paste any placeholder token. It is discarded and never stored.")], actions: [], wizard: "do-token" }
  }
  if (!state.do.authed && !(sub === "auth")) {
    return { lines: [err("Error: access token is required. (hint: run doctl auth init)")], actions: [] }
  }
  if (sub === "account" && argv[2] === "get") {
    return { lines: [out(`Email: ${state.do.email}`), out("Status: active (simulated credit)")], actions: [] }
  }
  if (sub === "compute" && argv[2] === "ssh-key" && argv[3] === "list") {
    if (state.do.keys.length === 0) return { lines: [info("No SSH keys.")], actions: [] }
    return { lines: state.do.keys.map((key) => out(`${key.name.padEnd(20)} ${key.fingerprint}`)), actions: [] }
  }
  if (sub === "compute" && argv[2] === "ssh-key" && argv[3] === "create") {
    const name = argv[4] && !argv[4].startsWith("--") ? argv[4] : "skybench"
    return { lines: [out(`Added SSH key ${name}.`)], actions: [{ type: "do/key", name }] }
  }
  if (sub === "compute" && argv[2] === "droplet" && argv[3] === "list") {
    const droplets = state.do.droplets.filter((vm) => vm.state !== "terminated")
    if (droplets.length === 0) return { lines: [info("No Droplets.")], actions: [] }
    return {
      lines: droplets.map((vm) => {
        const ip = (vm.publicIp ?? "pending").padEnd(16)
        return out(`${vm.id.padEnd(12)} ${vm.name.padEnd(16)} ${ip} ${vm.state.padEnd(12)} ${vm.region}`)
      }),
      actions: [],
    }
  }
  if (sub === "compute" && argv[2] === "droplet" && argv[3] === "create") return createDroplet(state, argv.slice(4))
  if (sub === "compute" && argv[2] === "droplet" && (argv[3] === "delete" || argv[3] === "power-off" || argv[3] === "power-on")) {
    const id = argv[4] ?? ""
    const flags = flagMap(argv.slice(5))
    if (argv[3] === "delete" && flags.force !== true) {
      return { lines: [err("Refusing to destroy without --force.")], actions: [] }
    }
    const verb = argv[3]
    const action: Action =
      verb === "delete"
        ? { type: "do/destroy", id }
        : verb === "power-off"
          ? { type: "do/stop", id }
          : { type: "do/start", id }
    return { lines: [out(`${verb} ${id}`)], actions: [action] }
  }
  return { lines: [err(`doctl: unknown command "${argv.slice(1).join(" ")}". Type help.`)], actions: [] }
}

function runInstances(state: LabState, argv: string[]): ShellResult {
  const flags = flagMap(argv)
  const imageId = stringFlag(flags, ["image-id"]) || "ami-al2023"
  const sizeId = stringFlag(flags, ["instance-type"]) || "t2.micro"
  const keyName = stringFlag(flags, ["key-name"])
  const name = stringFlag(flags, ["name"]) || "lab-vm"
  if (!keyName) return { lines: [err("--key-name is required. Create a key pair first.")], actions: [] }
  if (flags.count && flags.count !== "1" && flags.count !== true) {
    return { lines: [err("This lab launches one instance at a time.")], actions: [] }
  }
  return {
    lines: [out(`Pending ${name} (${imageId}, ${sizeId}) in ${state.aws.region}.`)],
    actions: [{ type: "aws/launch", name, imageId, sizeId, keyName, allowHttp: flags.http === true }],
  }
}

function createAzureVm(state: LabState, argv: string[]): ShellResult {
  const flags = flagMap(argv)
  const group = stringFlag(flags, ["resource-group", "g"])
  const name = stringFlag(flags, ["name", "n"]) || "vm-lab"
  const imageId = stringFlag(flags, ["image"]) || "Ubuntu2204"
  const sizeId = stringFlag(flags, ["size"]) || "Standard_B1s"
  const username = stringFlag(flags, ["admin-username"]) || "azureuser"
  const keyName = stringFlag(flags, ["ssh-key-name"]) || `${name}-key`
  const actions: Action[] = []
  if (flags["generate-ssh-keys"] === true && !state.azure.keyPairs.some((key) => key.name === keyName)) {
    actions.push({ type: "azure/key", name: keyName })
  }
  actions.push({ type: "azure/launch", name, group, imageId, sizeId, keyName, username })
  return { lines: [out(`Creating ${name} in ${group}...`)], actions }
}

function createDroplet(state: LabState, argv: string[]): ShellResult {
  const name = argv[0] && !argv[0].startsWith("--") ? argv[0] : "droplet-lab"
  const flags = flagMap(argv[0]?.startsWith("--") ? argv : argv.slice(1))
  const imageId = stringFlag(flags, ["image"]) || "ubuntu-22-04-x64"
  const sizeId = stringFlag(flags, ["size"]) || "s-1vcpu-1gb"
  const region = stringFlag(flags, ["region"]) || state.do.region
  const keyName = stringFlag(flags, ["ssh-keys"]) || state.do.keys[0]?.name || ""
  return {
    lines: [out(`Creating Droplet ${name} in ${region}...`)],
    actions: [{ type: "do/launch", name, imageId, sizeId, keyName, region }],
  }
}

function configureSet(state: LabState, argv: string[]): ShellResult {
  const key = argv[3] ?? ""
  const value = argv[4] ?? ""
  if (key === "aws_access_key_id") {
    if (!value) return { lines: [err("Missing value.")], actions: [] }
    return { lines: [info("Access key discarded.")], actions: [{ type: "aws/credential", field: "access" }] }
  }
  if (key === "aws_secret_access_key") {
    if (!value) return { lines: [err("Missing value.")], actions: [] }
    return { lines: [info("Secret discarded.")], actions: [{ type: "aws/credential", field: "secret" }] }
  }
  if (key === "region" || key === "default.region") {
    if (!AWS_REGIONS.some((region) => region.id === value)) {
      return { lines: [err(`Unknown region. Try one of: ${AWS_REGIONS.map((region) => region.id).join(", ")}`)], actions: [] }
    }
    return {
      lines: [out(`region=${value}`)],
      actions: [{ type: "aws/configure", region: value, format: state.aws.outputFormat, markKeys: false }],
    }
  }
  if (key === "output" || key === "default.output") {
    return {
      lines: [out(`output=${value || "json"}`)],
      actions: [{ type: "aws/configure", region: state.aws.region, format: value || "json", markKeys: false }],
    }
  }
  return { lines: [err("Supported settings: aws_access_key_id, aws_secret_access_key, region, output.")], actions: [] }
}

function configureList(state: LabState): ShellLine[] {
  const set = awsConfigured(state)
  return [
    out(`${"NAME".padEnd(14)} ${"VALUE".padEnd(18)} TYPE`),
    out(`${"access_key".padEnd(14)} ${set ? "****************" : "<not set>".padEnd(18)} simulated`),
    out(`${"secret_key".padEnd(14)} ${set ? "****************" : "<not set>".padEnd(18)} simulated`),
    out(`${"region".padEnd(14)} ${state.aws.region.padEnd(18)} config`),
    out(`${"output".padEnd(14)} ${state.aws.outputFormat.padEnd(18)} config`),
  ]
}

function describeAws(state: LabState): ShellLine[] {
  const rows = state.aws.instances.filter((vm) => vm.state !== "terminated")
  if (rows.length === 0) return [info("No instances in this region.")]
  const header = `${"INSTANCE ID".padEnd(22)} ${"NAME".padEnd(14)} ${"STATE".padEnd(12)} ${"TYPE".padEnd(12)} PUBLIC IP`
  return [out(header), ...rows.map((vm) => out(`${vm.id.padEnd(22)} ${vm.name.padEnd(14)} ${vm.state.padEnd(12)} ${vm.sizeId.padEnd(12)} ${vm.publicIp ?? "-"}`))]
}

function idAction(argv: string[], make: (id: string) => Action[], label: string): ShellResult {
  const flags = flagMap(argv)
  const id = stringFlag(flags, ["instance-ids"])
  if (!id) return { lines: [err("--instance-ids is required.")], actions: [] }
  return { lines: [out(`${label} ${id}`)], actions: make(id) }
}

function help(platform: PlatformId): ShellLine[] {
  const common = [
    "Local guest: help, uname -a, whoami, pwd, ls, ssh, ssh-keygen, clear",
    "Install only works for this console's CLI.",
  ]
  if (platform === "aws") {
    return [
      ...common.map(out),
      out("sudo apt install -y awscli"),
      out("aws --version"),
      out("aws configure"),
      out("aws ec2 create-key-pair --key-name skybench"),
      out("aws ec2 run-instances --image-id ami-al2023 --instance-type t2.micro --key-name skybench"),
      out("aws ec2 describe-instances"),
      out("aws ec2 terminate-instances --instance-ids i-..."),
      out("ssh -i skybench.pem ec2-user@203.0.113.x"),
      info(`Regions: ${AWS_REGIONS.map((region) => region.id).join(", ")}`),
      info(`Types: ${AWS_SIZES.map((size) => size.id).join(", ")}`),
    ]
  }
  if (platform === "azure") {
    return [
      ...common.map(out),
      out("sudo apt install -y azure-cli"),
      out("az version"),
      out("az login"),
      out("az group create --name lab-rg --location centralindia"),
      out("az vm create -g lab-rg -n vm-lab --image Ubuntu2204 --size Standard_B1s --admin-username azureuser --generate-ssh-keys"),
      out("az vm list --output table"),
      out("az group delete --name lab-rg --yes"),
      out("ssh azureuser@198.51.100.x"),
      info(`Locations: ${AZURE_LOCATIONS.map((location) => location.id).join(", ")}`),
    ]
  }
  return [
    ...common.map(out),
    out("sudo snap install doctl"),
    out("doctl version"),
    out("doctl auth init"),
    out('ssh-keygen -t ed25519 -f ~/.ssh/skybench -N ""'),
    out("doctl compute droplet create droplet-lab --image ubuntu-22-04-x64 --size s-1vcpu-1gb --region blr1 --ssh-keys skybench"),
    out("doctl compute droplet list"),
    out("doctl compute droplet delete ID --force"),
    out("ssh root@192.0.2.x"),
    info(`Regions: ${DO_REGIONS.map((region) => region.id).join(", ")}`),
    info("Power-off keeps the meter running. Destroy the Droplet to stop it."),
  ]
}

function isInstall(line: string): boolean {
  return (/apt(-get)?\s+install/.test(line) && /awscli|azure-cli/.test(line))
    || /InstallAzureCLIDeb/.test(line)
    || (/snap\s+install/.test(line) && /doctl/.test(line))
    || /^install\s+(aws|azure-cli|az|doctl)$/.test(line)
}

function wrongGuest(platform: PlatformId, tool: string): ShellResult {
  const where = platform === "aws" ? "AWS" : platform === "azure" ? "Azure" : "DigitalOcean"
  return { lines: [err(`${tool} belongs on the ${where} guest. Switch consoles.`)], actions: [] }
}

function missing(bin: string, hint: string): ShellResult {
  return { lines: [err(`bash: ${bin}: command not found`), info(`Install it with: ${hint}`)], actions: [] }
}

function keyAction(platform: PlatformId, name: string): Action {
  if (platform === "aws") return { type: "aws/key", name }
  if (platform === "azure") return { type: "azure/key", name }
  return { type: "do/key", name }
}

function stripSudo(argv: string[]): string[] {
  return argv[0] === "sudo" ? argv.slice(1) : argv
}

function tokenize(input: string): string[] {
  const parts: string[] = []
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(input))) {
    parts.push(match[1] ?? match[2] ?? match[3] ?? "")
  }
  return parts
}

function flagMap(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token?.startsWith("-")) continue
    const body = token.replace(/^-+/, "")
    if (!body) continue
    const [key, inline] = body.split("=", 2)
    if (!key) continue
    if (inline !== undefined) {
      flags[key] = inline
      continue
    }
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("-")) flags[key] = true
    else {
      flags[key] = next
      i += 1
    }
  }
  return flags
}

function stringFlag(flags: Record<string, string | boolean>, names: string[]): string {
  for (const name of names) {
    const value = flags[name]
    if (typeof value === "string") return value
  }
  return ""
}

function parseSsh(argv: string[]): { user?: string; host?: string; identity?: string } | null {
  let identity = ""
  const positionals: string[] = []
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === "-i" || token === "-o") {
      if (token === "-i") identity = argv[i + 1] ?? ""
      i += 1
      continue
    }
    if (token.startsWith("-")) continue
    positionals.push(token)
  }
  const target = positionals[0]
  if (!target) return null
  if (target.includes("@")) {
    const [user, host] = target.split("@")
    return { user, host, identity }
  }
  return { host: target, identity }
}
