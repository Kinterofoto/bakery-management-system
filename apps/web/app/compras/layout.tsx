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
      {/* ml-20 for desktop sidebar, pb-20 for mobile bottom nav */}
      <div className="md:ml-20 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  )
}
