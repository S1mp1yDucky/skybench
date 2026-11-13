import type { Metadata } from "next"
import { ReportView } from "@/components/report-view"

export const metadata: Metadata = {
  title: "Report",
}

export default function ReportPage() {
  return <ReportView />
}
