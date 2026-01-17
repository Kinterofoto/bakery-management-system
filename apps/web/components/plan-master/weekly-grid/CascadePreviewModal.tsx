"use client"

import { useState, useEffect, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Layers,
  Clock,
  Package,
  Users,
  ArrowDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useCascadeProduction,
  CascadePreviewResponse,
  CascadeWorkCenter,
} from "@/hooks/use-cascade-production"

interface CascadePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  workCenterId: string
  workCenterName: string
  productId: string
  productName: string
  startDatetime: string
  durationHours: number
  staffCount: number
}

export function CascadePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  workCenterId,
  workCenterName,
  productId,
  productName,
  startDatetime,
  durationHours,
  staffCount,
}: CascadePreviewModalProps) {
  const { previewCascade, createCascade, loading, error } = useCascadeProduction()
  const [preview, setPreview] = useState<CascadePreviewResponse | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Fetch preview when modal opens
  useEffect(() => {
    if (isOpen && workCenterId && productId) {
      const fetchPreview = async () => {
        const result = await previewCascade({
          work_center_id: workCenterId,
          product_id: productId,
          start_datetime: startDatetime,
          duration_hours: durationHours,
          staff_count: staffCount,
        })
        setPreview(result)
      }
      fetchPreview()
    } else {
      setPreview(null)
      setCreateSuccess(false)
    }
  }, [isOpen, workCenterId, productId, startDatetime, durationHours, staffCount, previewCascade])

  const handleCreate = async () => {
    setIsCreating(true)
    const result = await createCascade({
      work_center_id: workCenterId,
      product_id: productId,
      start_datetime: startDatetime,
      duration_hours: durationHours,
      staff_count: staffCount,
    })

    if (result) {
      setCreateSuccess(true)
      setTimeout(() => {
        onConfirm()
        onClose()
      }, 1500)
    }
    setIsCreating(false)
  }

  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "HH:mm", { locale: es })
    } catch {
      return dateStr
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE d MMM", { locale: es })
    } catch {
      return dateStr
    }
  }

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!preview) return null
    const start = parseISO(preview.cascade_start)
    const end = parseISO(preview.cascade_end)
    const diffMs = end.getTime() - start.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return { hours, minutes }
  }, [preview])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1C1C1E] border-[#2C2C2E] text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-[#BF5AF2]" />
            Produccion en Cascada
          </DialogTitle>
          <DialogDescription className="text-[#8E8E93]">
            Vista previa de los schedules que se crearan en todos los centros de trabajo
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {loading && !preview && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-[#BF5AF2]" />
            </div>
          )}

          {error && (
            <div className="bg-[#FF453A]/10 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#FF453A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#FF453A] font-medium">Error al cargar preview</p>
                <p className="text-sm text-[#8E8E93] mt-1">{error}</p>
              </div>
            </div>
          )}

          {createSuccess && (
            <div className="bg-[#30D158]/10 rounded-lg p-6 flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-[#30D158]" />
              <p className="text-[#30D158] font-medium text-lg">Cascada creada exitosamente</p>
            </div>
          )}

          {preview && !createSuccess && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="bg-[#2C2C2E] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#0A84FF]" />
                    <span className="font-medium">{preview.product_name}</span>
                  </div>
                  <span className="text-[#30D158] font-bold">
                    {preview.total_units.toLocaleString()} unidades
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-[#8E8E93]">Lote minimo</span>
                    <p className="font-medium">{preview.lote_minimo.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Num. lotes</span>
                    <p className="font-medium">{preview.num_batches}</p>
                  </div>
                  <div>
                    <span className="text-[#8E8E93]">Duracion total</span>
                    <p className="font-medium">
                      {totalDuration?.hours}h {totalDuration?.minutes}m
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#8E8E93] pt-2 border-t border-[#3A3A3C]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(preview.cascade_start)} {formatTime(preview.cascade_start)}
                    {" → "}
                    {formatDate(preview.cascade_end)} {formatTime(preview.cascade_end)}
                  </span>
                </div>
              </div>

              {/* Work centers cascade */}
              <div className="space-y-2">
                {preview.work_centers.map((wc, idx) => (
                  <div key={wc.work_center_id}>
                    {idx > 0 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-[#8E8E93]" />
                      </div>
                    )}
                    <WorkCenterCard workCenter={wc} isFirst={idx === 0} />
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div className="bg-[#FF9500]/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-[#FF9500] text-sm font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Advertencias
                  </div>
                  <ul className="text-xs text-[#8E8E93] space-y-1">
                    {preview.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-[#2C2C2E] pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isCreating}
            className="text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!preview || loading || isCreating || createSuccess}
            className="bg-[#BF5AF2] hover:bg-[#BF5AF2]/90 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creando...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Crear Cascada ({preview?.work_centers.length || 0} centros)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WorkCenterCard({ workCenter, isFirst }: { workCenter: CascadeWorkCenter; isFirst: boolean }) {
  const isParallel = workCenter.processing_type === "parallel"

  return (
    <div
      className={cn(
        "rounded-lg p-3 border",
        isFirst
          ? "bg-[#BF5AF2]/10 border-[#BF5AF2]/30"
          : isParallel
          ? "bg-[#30D158]/10 border-[#30D158]/30"
          : "bg-[#0A84FF]/10 border-[#0A84FF]/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded",
              isFirst
                ? "bg-[#BF5AF2] text-white"
                : isParallel
                ? "bg-[#30D158] text-white"
                : "bg-[#0A84FF] text-white"
            )}
          >
            Nivel {workCenter.cascade_level}
          </span>
          <span className="font-medium">{workCenter.work_center_name}</span>
        </div>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded",
            isParallel
              ? "bg-[#30D158]/20 text-[#30D158]"
              : "bg-[#0A84FF]/20 text-[#0A84FF]"
          )}
        >
          {isParallel ? "Paralelo" : "Secuencial"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {workCenter.batches.map((batch) => (
          <div
            key={batch.batch_number}
            className="bg-black/20 rounded px-2 py-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[#8E8E93]">Lote {batch.batch_number}</span>
              <span className="font-medium">{batch.batch_size.toLocaleString()}</span>
            </div>
            <div className="text-[#8E8E93] mt-0.5">
              {batch.start_date.substring(11, 16)} - {batch.end_date.substring(11, 16)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-xs text-[#8E8E93]">
        <span>
          {workCenter.batches.length} lotes
        </span>
        <span>
          {Math.round(workCenter.total_duration_minutes / 60)}h {Math.round(workCenter.total_duration_minutes % 60)}m total
        </span>
      </div>
    </div>
  )
}
