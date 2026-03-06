'use client'

import dynamic from 'next/dynamic'

const CatalogDownloadButton = dynamic(
  () => import('./CatalogDownloadButton').then(mod => ({ default: mod.CatalogDownloadButton })),
  { ssr: false }
)

export function CatalogDownloadWrapper() {
  return <CatalogDownloadButton />
}
