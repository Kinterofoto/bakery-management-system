"use client"

import { useState, useEffect, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { motion } from "framer-motion"
import { Copy, Share2, Check, QrCode, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useSensoryEvaluations, SensoryEvaluation } from "@/hooks/use-sensory-evaluations"

const SENSORY_PARAMS = [
  { key: "texture", label: "Textura" },
  { key: "color", label: "Color" },
  { key: "appearance", label: "Apariencia" },
  { key: "taste", label: "Sabor" },
  { key: "aroma", label: "Aroma" },
  { key: "crumb_structure", label: "Miga" },
] as const

interface SensoryLinkShareProps {
  prototypeId: string
  sensoryToken: string | null
}

export function SensoryLinkShare({ prototypeId, sensoryToken }: SensoryLinkShareProps) {
  const [copied, setCopied] = useState(false)
  const [evaluations, setEvaluations] = useState<SensoryEvaluation[]>([])
  const { getEvaluationsByPrototype } = useSensoryEvaluations()

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/panel-sensorial/${sensoryToken}`
      : `/panel-sensorial/${sensoryToken}`

  useEffect(() => {
    if (prototypeId) {
      getEvaluationsByPrototype(prototypeId).then(setEvaluations)
    }
  }, [prototypeId, getEvaluationsByPrototype])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.querySelector<HTMLInputElement>("[data-sensory-url]")
      if (input) {
        input.select()
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }, [shareUrl])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Panel Sensorial",
          text: "Evalua este producto en el panel sensorial.",
          url: shareUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      handleCopy()
    }
  }, [shareUrl, handleCopy])

  // Calculate averages
  const avgScores: Record<string, number | null> = {}
  for (const param of SENSORY_PARAMS) {
    const vals = evaluations
      .map(e => (e as any)[`${param.key}_score`])
      .filter((v): v is number => v !== null && v !== undefined)
    avgScores[param.key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const avgPurchaseIntent = (() => {
    const vals = evaluations.map(e => e.purchase_intent).filter((v): v is number => v !== null)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })()
  const overallAvg = (() => {
    const vals = Object.values(avgScores).filter((v): v is number => v !== null)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })()

  if (!sensoryToken) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No se ha generado un token sensorial para este prototipo</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Link + QR */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Enlace Panel Sensorial</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Comparte este enlace o QR con los evaluadores.
          </p>
        </div>

        {/* URL + copy */}
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={shareUrl}
            data-sensory-url
            className="flex-1 h-11 rounded-xl text-xs font-mono bg-gray-50 border-gray-200 text-gray-600 select-all"
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="outline"
            onClick={handleCopy}
            className={cn(
              "h-11 px-3 rounded-xl",
              copied && "bg-green-50 border-green-200"
            )}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Actions */}
        <Button onClick={handleShare} className="w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm">
          <Share2 className="w-4 h-4 mr-2" />
          Compartir
        </Button>

        {/* QR Code */}
        <div className="flex justify-center py-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <QRCodeSVG value={shareUrl} size={180} level="M" />
          </div>
        </div>
      </motion.div>

      {/* Results */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Resultados</h3>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5" />
            {evaluations.length} evaluacion{evaluations.length !== 1 ? "es" : ""}
          </span>
        </div>

        {evaluations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Aún no hay evaluaciones. Comparte el enlace para recibir respuestas.
          </p>
        ) : (
          <>
            {/* Overall */}
            {overallAvg !== null && (
              <div className="text-center bg-yellow-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-yellow-600">{overallAvg.toFixed(1)}</p>
                <p className="text-xs text-yellow-500 uppercase mt-1">Promedio general</p>
              </div>
            )}

            {/* Per parameter */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SENSORY_PARAMS.map(param => (
                <div key={param.key} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">
                    {avgScores[param.key] !== null ? avgScores[param.key]!.toFixed(1) : "-"}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">{param.label}</p>
                </div>
              ))}
            </div>

            {/* Purchase intent */}
            {avgPurchaseIntent !== null && (
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-600">{avgPurchaseIntent.toFixed(1)}/5</p>
                <p className="text-[10px] text-green-500 uppercase">Intención de compra</p>
              </div>
            )}

            {/* Individual evaluations */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Evaluadores</p>
              {evaluations.map(ev => (
                <div key={ev.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-gray-800">{ev.evaluator_name}</span>
                    {ev.evaluator_role && (
                      <span className="text-xs text-gray-400 ml-2">{ev.evaluator_role}</span>
                    )}
                  </div>
                  <span className="font-bold text-yellow-600">
                    {ev.overall_score ? ev.overall_score.toFixed(1) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
