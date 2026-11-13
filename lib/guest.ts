import type { PlatformId, Vm } from "@/lib/types"

export function remoteUname(platform: PlatformId, vm: Vm): string {
  const dashed = vm.privateIp.replaceAll(".", "-")
  if (platform === "aws" && vm.imageId === "ami-al2023") {
    return `Linux ip-${dashed}.ec2.internal 6.1.112-124.190.amzn2023.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
  }
  if (platform === "aws") {
    return `Linux ip-${dashed}.ec2.internal 6.5.0-1024-aws #24 SMP x86_64 GNU/Linux`
  }
  if (platform === "azure") {
    return `Linux ${vm.name} 6.5.0-1025-azure #26 SMP x86_64 GNU/Linux`
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
    `VERSION_ID="${platform === "aws" && vm.imageId === "ami-al2023" ? "2023" : "22.04"}"`,
  ].join("\n")
}

export function memFree(vm: Vm): string {
  return [
    "               total        used        free      shared  buff/cache   available",
    `Mem:           ${vm.ram.padEnd(11)} 180Mi       ${vm.ram}     1Mi       240Mi       ${vm.ram}`,
    "Swap:             0B          0B          0B",
  ].join("\n")
}

export const LOCAL_UNAME =
  "Linux ubuntu 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"
