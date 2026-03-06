"use client"

import { PrototypeWizard } from "@/components/id/PrototypeWizard"
import { useRouter } from "next/navigation"

export default function NuevoPrototipoPage() {
  const router = useRouter()

  return (
    <PrototypeWizard
      onComplete={(prototypeId) => {
        router.push(`/id/${prototypeId}`)
      }}
    />
  )
}
