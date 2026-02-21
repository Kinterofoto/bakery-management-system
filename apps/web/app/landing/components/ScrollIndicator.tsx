"use client"

import { ChevronDown } from "lucide-react"

export default function ScrollIndicator() {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#DFD860]">
      <span className="text-xs tracking-widest uppercase">
        Explorar
      </span>
      <ChevronDown className="scroll-indicator h-5 w-5" />
    </div>
  )
}
