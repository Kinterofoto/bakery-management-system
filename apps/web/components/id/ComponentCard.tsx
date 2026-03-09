"use client"

import { useState } from "react"
import { PrototypeComponent } from "@/hooks/use-prototype-components"
import { Prototype } from "@/hooks/use-prototypes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Beaker,
  Package,
  ChevronRight,
  Trash2,
  Check,
  X,
  Pencil,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { formatCurrency } from "@/lib/id-calculations"

interface ComponentCardProps {
  component: PrototypeComponent
  ppPrototype?: Prototype
  onEdit?: () => void
  onDelete?: () => void
  onUpdateQuantity?: (qty: number) => void
}

const PP_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "text-gray-500 bg-gray-100", icon: Clock },
  recipe_done: { label: "Receta lista", color: "text-blue-500 bg-blue-50", icon: CheckCircle2 },
  operations_done: { label: "Operaciones listas", color: "text-amber-500 bg-amber-50", icon: CheckCircle2 },
  yield_done: { label: "Rendimiento listo", color: "text-purple-500 bg-purple-50", icon: CheckCircle2 },
  complete: { label: "Completo", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
}

export function ComponentCard({
  component,
  ppPrototype,
  onEdit,
  onDelete,
  onUpdateQuantity,
}: ComponentCardProps) {
  const [editing, setEditing] = useState(false)
  const [editQty, setEditQty] = useState(component.quantity_grams.toString())
  const isPP = component.component_type === "PP"
  const isNewPP = isPP && !!component.pp_prototype_id
  const ppStatus = ppPrototype?.pp_status || (isNewPP ? "pending" : "complete")
  const statusConfig = PP_STATUS_CONFIG[ppStatus] || PP_STATUS_CONFIG.pending
  const costPerGram = component.cost_per_gram || (ppPrototype?.cost_per_gram ?? null)
  const subtotal = costPerGram ? component.quantity_grams * costPerGram : null

  const handleSaveQty = () => {
    const qty = parseFloat(editQty)
    if (!isNaN(qty) && qty > 0 && onUpdateQuantity) {
      onUpdateQuantity(qty)
    }
    setEditing(false)
  }

  return (
    <div
      className={`bg-white rounded-xl border p-3 transition-all ${
        isNewPP
          ? "border-blue-100 hover:border-blue-200 hover:shadow-sm cursor-pointer"
          : isPP
          ? "border-blue-100"
          : "border-amber-100 hover:border-amber-200"
      }`}
      onClick={() => {
        if (isNewPP && onEdit && !editing) onEdit()
      }}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isPP ? "bg-blue-50" : "bg-amber-50"
        }`}>
          {isPP ? (
            <Beaker className="w-4 h-4 text-blue-500" />
          ) : (
            <Package className="w-4 h-4 text-amber-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {component.material_name}
            </span>
            {isPP && isNewPP && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            )}
            {isPP && !isNewPP && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-green-600 bg-green-50">
                Existente
              </span>
            )}
            {component.is_new_material && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lime-50 text-lime-600 font-medium">
                Nuevo
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {editing ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Input
                  type="number"
                  value={editQty}
                  onChange={e => setEditQty(e.target.value)}
                  className="h-6 w-20 text-xs rounded-md"
                  autoFocus
                />
                <span className="text-xs text-gray-400">g</span>
                <button onClick={handleSaveQty} className="text-green-500 hover:text-green-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-xs text-gray-500">
                  {component.quantity_grams >= 1000
                    ? `${(component.quantity_grams / 1000).toFixed(2)} kg`
                    : `${component.quantity_grams} g`
                  }
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setEditing(true)
                    setEditQty(component.quantity_grams.toString())
                  }}
                  className="text-gray-300 hover:text-gray-500"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
            {costPerGram !== null && costPerGram > 0 && (
              <span className="text-xs text-gray-400">
                ${costPerGram.toFixed(2)}/g
              </span>
            )}
            {subtotal !== null && subtotal > 0 && (
              <span className="text-xs font-medium text-gray-600">
                {formatCurrency(subtotal)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {onDelete && (
            <button
              onClick={() => onDelete()}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isNewPP && (
            <ChevronRight className="w-4 h-4 text-gray-300" />
          )}
        </div>
      </div>
    </div>
  )
}
