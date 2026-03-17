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
      <div className={`${glassStyles.containers.card} !p-3 md:!p-6 relative ${className}`}>
        <div className="flex items-start justify-between mb-2 md:mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm md:text-lg font-semibold truncate">{title}</h3>
            {description && <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">{description}</p>}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex-shrink-0 ml-2 p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-white/20 rounded-lg transition-all"
            title="Expandir"
          >
            <Expand className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
        <div className="w-full overflow-x-auto -mx-1 px-1">{children}</div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">{title}</DialogTitle>
            {description && <DialogDescription className="text-xs md:text-sm">{description}</DialogDescription>}
          </DialogHeader>
          <div className="w-full min-h-[300px] md:min-h-[400px]">
            {expandedContent || children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
