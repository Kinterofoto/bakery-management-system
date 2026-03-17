"use client"

import { useState } from "react"
import { Expand } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { glassStyles } from "@/components/dashboard/glass-styles"

interface ExpandableChartProps {
  title: string
  description?: string
  children: React.ReactNode
  expandedContent?: React.ReactNode
  className?: string
}

export function ExpandableChart({ title, description, children, expandedContent, className = "" }: ExpandableChartProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className={`${glassStyles.containers.card} relative ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={glassStyles.typography.headline}>{title}</h3>
            {description && <p className={`${glassStyles.typography.caption} mt-1`}>{description}</p>}
          </div>
          <button
            onClick={() => setOpen(true)}
            className={`${glassStyles.buttons.icon} flex-shrink-0`}
            title="Expandir"
          >
            <Expand className="w-4 h-4" />
          </button>
        </div>
        <div className="w-full">{children}</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="w-full min-h-[400px]">
            {expandedContent || children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
