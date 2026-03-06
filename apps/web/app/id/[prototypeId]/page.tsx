"use client"

import { useParams, useRouter } from "next/navigation"
import { PrototypeWizard } from "@/components/id/PrototypeWizard"

export default function PrototypeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const prototypeId = params.prototypeId as string

  return (
    <PrototypeWizard
      prototypeId={prototypeId}
      onComplete={(id) => {
        router.push(`/id/${id}`)
      }}
    />
  )
}
