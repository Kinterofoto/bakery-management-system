"use client"

import { ChevronDown } from "lucide-react"

interface ScrollIndicatorProps {
  onClick?: () => void
}

export default function ScrollIndicator({ onClick }: ScrollIndicatorProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#DFD860] cursor-pointer bg-transparent border-none outline-none"
    >
      <span className="text-xs tracking-widest uppercase">
        Conócenos
      </span>
      <ChevronDown className="scroll-indicator h-5 w-5" />
    </button>
  )
}
