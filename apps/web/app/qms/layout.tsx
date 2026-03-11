"use client"

import { QMSSidebar } from "@/components/qms/QMSSidebar"

export default function QMSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <QMSSidebar />
      {/* ml-20 for desktop sidebar, pb-20 for mobile bottom nav */}
      <div className="md:ml-20 pb-24 md:pb-0">
        {children}
      </div>
    </div>
  )
}
