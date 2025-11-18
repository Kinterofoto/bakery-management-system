"use client"

import { CollapsibleSidebar } from "@/components/modules/CollapsibleSidebar"

export default function ComprasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <CollapsibleSidebar />
      <div className="ml-20">
        {children}
      </div>
    </div>
  )
}
