import type { Metadata } from "next"
import { AwsConsole } from "@/components/consoles/aws-console"

export const metadata: Metadata = {
  title: { absolute: "AWS Management Console" },
}

export default function AwsPage() {
  return <AwsConsole />
}
