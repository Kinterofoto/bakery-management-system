"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BroadcastPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/broadcast/whatsapp")
  }, [router])

  return null
}
