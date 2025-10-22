'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CatalogoPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/ecommerce')
  }, [router])

  return null
}
