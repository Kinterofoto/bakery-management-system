"use client"

import { MantenimientoSidebar } from "@/components/mantenimiento/MantenimientoSidebar"

export default function MantenimientoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <MantenimientoSidebar />
      {/* ml-20 for desktop sidebar, pb-20 for mobile bottom nav */}
      <div className="md:ml-20 pb-24 md:pb-0">
        {children}
      </div>
    </div>
  )
}
