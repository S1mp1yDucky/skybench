import type { Metadata } from "next"
import { AzureConsole } from "@/components/consoles/azure-console"

export const metadata: Metadata = {
  title: "Azure portal",
}

export default function AzurePage() {
  return <AzureConsole />
}
