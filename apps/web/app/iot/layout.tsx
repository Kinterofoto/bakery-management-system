"use client"

import { CollapsibleSidebar } from "@/components/modules/CollapsibleSidebar"

export default function IoTLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <CollapsibleSidebar />
      <div className="md:ml-20 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  )
}
