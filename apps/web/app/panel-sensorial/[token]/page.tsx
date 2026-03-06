"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSensoryEvaluations } from "@/hooks/use-sensory-evaluations"
import { QualityScoreInput } from "@/components/id/QualityScoreInput"
import { PhotoCapture } from "@/components/id/PhotoCapture"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FlaskConical, CheckCircle2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function PanelSensorialPage() {
  const params = useParams()
  const token = params.token as string
  const { loading, getPrototypeBySensoryToken, submitEvaluation } = useSensoryEvaluations()

  const [prototype, setPrototype] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    evaluator_name: "",
    evaluator_role: "",
    texture_score: null as number | null,
    texture_notes: "",
    color_score: null as number | null,
    color_notes: "",
    appearance_score: null as number | null,
    appearance_notes: "",
    taste_score: null as number | null,
    taste_notes: "",
    aroma_score: null as number | null,
    aroma_notes: "",
    crumb_structure_score: null as number | null,
    crumb_structure_notes: "",
    overall_notes: "",
    purchase_intent: null as number | null,
  })

  useEffect(() => {
    loadPrototype()
  }, [token])

  const loadPrototype = async () => {
    const data = await getPrototypeBySensoryToken(token)
    if (data) {
      setPrototype(data)
    } else {
      setNotFound(true)
    }
  }

  const handleSubmit = async () => {
    if (!form.evaluator_name.trim()) {
      toast.error("Por favor ingresa tu nombre")
      return
    }
    if (!prototype) return

    try {
      await submitEvaluation({
        prototype_id: prototype.id,
        ...form,
      })
      setSubmitted(true)
      toast.success("Evaluación enviada exitosamente")
    } catch {
      toast.error("Error al enviar la evaluación")
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-gray-500">Este enlace de evaluación sensorial no existe o ha expirado.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gracias</h1>
          <p className="text-gray-500">Tu evaluación sensorial ha sido registrada exitosamente.</p>
        </motion.div>
      </div>
    )
  }

  if (loading || !prototype) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const qualityParams = [
    { key: "texture", label: "Textura" },
    { key: "color", label: "Color" },
    { key: "appearance", label: "Apariencia" },
    { key: "taste", label: "Sabor" },
    { key: "aroma", label: "Aroma" },
    { key: "crumb_structure", label: "Estructura de Miga" },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-lime-500 flex items-center justify-center mx-auto mb-3">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Evaluación Sensorial</h1>
          <p className="text-gray-500 mt-1">{prototype.product_name}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
            {prototype.code}
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Evaluator info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-900">Información del Evaluador</h2>
          <div>
            <Label className="text-sm text-gray-600">Nombre *</Label>
            <Input
              placeholder="Tu nombre"
              value={form.evaluator_name}
              onChange={e => setForm({ ...form, evaluator_name: e.target.value })}
              className="mt-1 rounded-xl h-12"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-600">Rol (opcional)</Label>
            <Input
              placeholder="Ej: Panadero, QA, Cliente..."
              value={form.evaluator_role}
              onChange={e => setForm({ ...form, evaluator_role: e.target.value })}
              className="mt-1 rounded-xl h-12"
            />
          </div>
        </div>

        {/* Quality scores */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-6">
          <h2 className="font-semibold text-gray-900">Evaluación de Calidad</h2>
          {qualityParams.map(param => (
            <QualityScoreInput
              key={param.key}
              label={param.label}
              score={form[`${param.key}_score` as keyof typeof form] as number | null}
              notes={form[`${param.key}_notes` as keyof typeof form] as string}
              onScoreChange={score =>
                setForm({ ...form, [`${param.key}_score`]: score })
              }
              onNotesChange={notes =>
                setForm({ ...form, [`${param.key}_notes`]: notes })
              }
            />
          ))}
        </div>

        {/* Purchase intent */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <QualityScoreInput
            label="Intención de Compra"
            score={form.purchase_intent}
            notes=""
            onScoreChange={score => setForm({ ...form, purchase_intent: score })}
            onNotesChange={() => {}}
          />
        </div>

        {/* Overall notes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <Label className="text-sm font-semibold text-gray-900">Comentarios Generales</Label>
          <Textarea
            placeholder="Observaciones adicionales..."
            value={form.overall_notes}
            onChange={e => setForm({ ...form, overall_notes: e.target.value })}
            className="mt-2 rounded-xl min-h-[100px]"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !form.evaluator_name.trim()}
          className="w-full h-14 bg-lime-500 hover:bg-lime-600 text-white rounded-2xl text-lg font-semibold"
        >
          {loading ? "Enviando..." : "Enviar Evaluación"}
        </Button>

        <div className="h-8" />
      </div>
    </div>
  )
}
