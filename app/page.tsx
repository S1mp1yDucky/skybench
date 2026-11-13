import type { Metadata } from "next"
import { BenchHome } from "@/components/bench-home"

export const metadata: Metadata = {
  title: "Bench",
  description: "A local cloud lab for the AWS, Azure, and DigitalOcean practical.",
}

export default function HomePage() {
  return <BenchHome />
}
