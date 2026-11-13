import type { PlatformId, Vm } from "@/lib/types"

export function remoteUname(platform: PlatformId, vm: Vm): string {
  const dashed = vm.privateIp.replaceAll(".", "-")
  if (platform === "aws" && vm.imageId === "ami-al2023") {
    return `Linux ip-${dashed}.ec2.internal 6.18.44-99.149.amzn2023.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
  }
  if (platform === "aws") {
    return `Linux ip-${dashed}.ec2.internal 6.5.0-1024-aws #24 SMP x86_64 GNU/Linux`
  }
  if (platform === "azure") {
    return `Linux ${vm.name} 6.5.0-1025-azure #26 SMP x86_64 GNU/Linux`
  }
  if (vm.imageId.startsWith("ubuntu")) {
    return `Linux ${vm.name} 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
  }
  return `Linux ${vm.name} 6.5.0-9-amd64 #1 SMP x86_64 GNU/Linux`
}

export function osRelease(platform: PlatformId, vm: Vm): string {
  const name =
    platform === "aws" && vm.imageId === "ami-al2023"
      ? "Amazon Linux"
      : vm.imageLabel
  return [
    `NAME="${name}"`,
    `ID=${vm.imageId}`,
    `PRETTY_NAME="${vm.imageLabel}"`,
    `VERSION_ID="${versionId(platform, vm)}"`,
  ].join("\n")
}

export function memFree(vm: Vm): string {
  return [
    "               total        used        free      shared  buff/cache   available",
    `Mem:           ${vm.ram.padEnd(11)} 180Mi       ${vm.ram}     1Mi       240Mi       ${vm.ram}`,
    "Swap:             0B          0B          0B",
  ].join("\n")
}

function versionId(platform: PlatformId, vm: Vm) {
  if (platform === "aws" && vm.imageId === "ami-al2023") return "2023"
  const ubuntu = vm.imageId.match(/ubuntu-(\d+)-(\d+)/)
  if (ubuntu) return `${ubuntu[1]}.${ubuntu[2]}`
  const debian = vm.imageId.match(/debian-(\d+)/i) ?? vm.imageId.match(/Debian(\d+)/)
  if (debian) return debian[1]
  return "22.04"
}

export const LOCAL_UNAME =
  "Linux ubuntu 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"
