"use client"

import { useState } from "react"
import { Boxes, Hash, ClipboardList } from "lucide-react"
import { TrazabilidadByProduct } from "./TrazabilidadByProduct"
import { TrazabilidadByCode } from "./TrazabilidadByCode"
import { TrazabilidadByOrder } from "./TrazabilidadByOrder"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]

type Mode = "product" | "code" | "order"

interface TrazabilidadTabProps {
  products: Product[]
  initialProductId?: string
  onProductChange?: (productId: string) => void
}

const MODES: { id: Mode; label: string; icon: typeof Boxes }[] = [
  { id: "product", label: "Por producto", icon: Boxes },
  { id: "code", label: "Por código", icon: Hash },
  { id: "order", label: "Por pedido", icon: ClipboardList },
]

export function TrazabilidadTab({ products, initialProductId, onProductChange }: TrazabilidadTabProps) {
  const [mode, setMode] = useState<Mode>("product")

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="inline-flex bg-white/60 backdrop-blur-sm border border-gray-200/70 rounded-lg p-1 gap-1">
        {MODES.map((m) => {
          const Icon = m.icon
          const active = m.id === mode
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          )
        })}
      </div>

      {mode === "product" && (
        <TrazabilidadByProduct products={products} initialProductId={initialProductId} onProductChange={onProductChange} />
      )}
      {mode === "code" && <TrazabilidadByCode products={products} />}
      {mode === "order" && <TrazabilidadByOrder products={products} />}
    </div>
  )
}
