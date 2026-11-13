import type { Metadata } from "next"
import { DoConsole } from "@/components/consoles/do-console"

export const metadata: Metadata = {
  title: "DigitalOcean",
}

export default function DigitalOceanPage() {
  return <DoConsole />
}
