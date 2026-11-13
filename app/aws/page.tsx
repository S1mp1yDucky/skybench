import type { Metadata } from "next"
import { AwsConsole } from "@/components/consoles/aws-console"

export const metadata: Metadata = {
  title: "AWS console",
}

export default function AwsPage() {
  return <AwsConsole />
}
