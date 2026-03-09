"use client"

import { useParams } from "next/navigation"
import { PTDashboard } from "@/components/id/PTDashboard"

export default function PrototypeDetailPage() {
  const params = useParams()
  const prototypeId = params.prototypeId as string

  return <PTDashboard prototypeId={prototypeId} />
}
