"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StarRating } from "./StarRating"
import { PhotoUpload } from "./PhotoUpload"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface ProductEvalCardProps {
  product: {
    id: string
    name: string
    weight?: number
  }
  evaluation: {
    has_stock: boolean
    is_displayed?: boolean
    score_baking?: number
    score_display?: number
    score_presentation?: number
    score_taste?: number
    storage_temperature?: number
    score_staff_training?: number
    score_baking_params?: number
    comments?: string
    photos?: File[]
  }
  onChange: (evaluation: any) => void
}

export function ProductEvalCard({ product, evaluation, onChange }: ProductEvalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateField = (field: string, value: any) => {
    onChange({ ...evaluation, [field]: value })
  }

  return (
    <Card className="border-2 border-gray-200 hover:border-teal-300 transition-colors">
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Package className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            {product.weight && (
              <p className="text-sm text-gray-500">{product.weight}g</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">¿Hay existencias?</span>
            <Switch
              checked={evaluation.has_stock}
              onCheckedChange={(checked) => {
                updateField("has_stock", checked)
                if (checked) {
                  setIsExpanded(true)
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {evaluation.has_stock && (
            <button
              type="button"
              className="text-teal-600 hover:text-teal-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {evaluation.has_stock && isExpanded && (
        <CardContent className="pt-0 space-y-6">
          <div className="h-px bg-gray-200" />

          {/* Pregunta: ¿Está exhibido? */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold text-blue-900">
                  ¿Está exhibido? <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-blue-700 mt-1">
                  Si no está exhibido, solo evaluaremos temperatura, capacitación y comentarios
                </p>
              </div>
              <Switch
                checked={evaluation.is_displayed || false}
                onCheckedChange={(checked) => updateField("is_displayed", checked)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>

          {/* Preguntas solo si está exhibido */}
          {evaluation.is_displayed && (
            <>
              <StarRating
                label="Horneado"
                value={evaluation.score_baking || 0}
                onChange={(value) => updateField("score_baking", value)}
                required
              />

              <StarRating
                label="Exhibición"
                value={evaluation.score_display || 0}
                onChange={(value) => updateField("score_display", value)}
                required
              />

              <StarRating
                label="Presentación Visual"
                value={evaluation.score_presentation || 0}
                onChange={(value) => updateField("score_presentation", value)}
                required
              />

              <StarRating
                label="Sabor (Opcional)"
                value={evaluation.score_taste || 0}
                onChange={(value) => updateField("score_taste", value)}
              />

              <StarRating
                label="Parámetros de Horneo"
                value={evaluation.score_baking_params || 0}
                onChange={(value) => updateField("score_baking_params", value)}
                required
              />
            </>
          )}

          {/* Preguntas siempre visibles cuando hay stock */}
          <div className="space-y-2">
            <Label htmlFor={`temp-${product.id}`}>
              Temperatura de Almacenamiento (°C) - Opcional
            </Label>
            <Input
              id={`temp-${product.id}`}
              type="number"
              step="0.1"
              value={evaluation.storage_temperature || ""}
              onChange={(e) =>
                updateField(
                  "storage_temperature",
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              className="h-12 text-lg"
              placeholder="Ej: 20.5"
            />
          </div>

          <StarRating
            label="Capacitación de Personal"
            value={evaluation.score_staff_training || 0}
            onChange={(value) => updateField("score_staff_training", value)}
            required
          />

          <div className="space-y-2">
            <Label htmlFor={`comments-${product.id}`}>Comentarios</Label>
            <Textarea
              id={`comments-${product.id}`}
              value={evaluation.comments || ""}
              onChange={(e) => updateField("comments", e.target.value)}
              rows={3}
              className="text-base resize-none"
              placeholder="Observaciones sobre este producto..."
            />
          </div>

          <PhotoUpload
            photos={evaluation.photos || []}
            onPhotosChange={(photos) => updateField("photos", photos)}
            multiple
            label="📷 Agregar fotos del producto"
          />
        </CardContent>
      )}
    </Card>
  )
}
