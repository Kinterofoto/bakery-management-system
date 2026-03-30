"use client"

import { BroadcastSidebar } from "@/components/broadcast/BroadcastSidebar"

export default function BroadcastLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <BroadcastSidebar />
      {/* ml-20 for desktop sidebar, pb-24 for mobile bottom nav */}
      <div className="md:ml-20 pb-24 md:pb-0">
        {children}
      </div>
    </div>
  )
}
