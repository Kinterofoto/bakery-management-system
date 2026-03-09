"use client"

import { useParams } from "next/navigation"
import { PPSubWizard } from "@/components/id/PPSubWizard"

export default function PPSubWizardPage() {
  const params = useParams()
  const prototypeId = params.prototypeId as string
  const ppId = params.ppId as string

  return <PPSubWizard ppPrototypeId={ppId} ptPrototypeId={prototypeId} />
}
