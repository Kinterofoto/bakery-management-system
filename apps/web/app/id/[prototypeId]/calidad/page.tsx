"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePrototypes } from "@/hooks/use-prototypes"
import { usePrototypeQuality, PrototypeQuality } from "@/hooks/use-prototype-quality"
import { usePrototypePhotos, PrototypePhoto } from "@/hooks/use-prototype-photos"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Star, Check, Camera, X } from "lucide-react"
import { toast } from "sonner"

const QUALITY_PARAMS = [
  { key: "texture", label: "Textura" },
  { key: "color", label: "Color" },
  { key: "appearance", label: "Apariencia" },
  { key: "taste", label: "Sabor" },
  { key: "aroma", label: "Aroma" },
  { key: "crumb_structure", label: "Estructura de miga" },
] as const

type ParamKey = (typeof QUALITY_PARAMS)[number]["key"]

export default function CalidadPage() {
  const params = useParams()
  const router = useRouter()
  const prototypeId = params.prototypeId as string
  const { getPrototypeById } = usePrototypes()
  const { getQualityByPrototype, saveQuality, updateQuality } = usePrototypeQuality()

  const [productName, setProductName] = useState("")
  const [existingQuality, setExistingQuality] = useState<PrototypeQuality | null>(null)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [overallNotes, setOverallNotes] = useState("")
  const [approved, setApproved] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photos, setPhotos] = useState<PrototypePhoto[]>([])
  const { getPhotosByPrototype, uploadPhoto, deletePhoto } = usePrototypePhotos()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [proto, qualities, allPhotos] = await Promise.all([
        getPrototypeById(prototypeId),
        getQualityByPrototype(prototypeId),
        getPhotosByPrototype(prototypeId),
      ])
      if (proto) setProductName(proto.product_name || "")
      setPhotos((allPhotos || []).filter(p => p.photo_type === "quality"))
      if (qualities.length > 0) {
        const q = qualities[0]
        setExistingQuality(q)
        const s: Record<string, number | null> = {}
        const n: Record<string, string> = {}
        for (const p of QUALITY_PARAMS) {
          s[p.key] = (q as any)[`${p.key}_score`] ?? null
          n[p.key] = (q as any)[`${p.key}_notes`] ?? ""
        }
        setScores(s)
        setNotes(n)
        setOverallNotes(q.overall_notes || "")
        setApproved(q.approved)
      }
      setLoading(false)
    }
    load()
  }, [prototypeId, getPrototypeById, getQualityByPrototype])

  const handleSave = async () => {
    setSaving(true)
    const data: Record<string, any> = {
      prototype_id: prototypeId,
      overall_notes: overallNotes || null,
      approved,
    }
    for (const p of QUALITY_PARAMS) {
      data[`${p.key}_score`] = scores[p.key] ?? null
      data[`${p.key}_notes`] = notes[p.key] || null
    }

    if (existingQuality) {
      const { prototype_id, ...updates } = data
      const result = await updateQuality(existingQuality.id, updates)
      if (result) setExistingQuality(result)
    } else {
      const result = await saveQuality(data as any)
      if (result) setExistingQuality(result)
    }
    setSaving(false)
  }

  const overallScore = (() => {
    const vals = QUALITY_PARAMS.map(p => scores[p.key]).filter((v): v is number => v !== null)
    if (vals.length === 0) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/id/${prototypeId}`)}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-yellow-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Evaluación de Calidad</h1>
              <p className="text-xs text-gray-500">{productName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Overall score */}
        {overallScore !== null && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{overallScore.toFixed(1)}</p>
            <p className="text-xs text-gray-500 uppercase">Puntaje promedio</p>
          </div>
        )}

        {/* Score cards */}
        {QUALITY_PARAMS.map(param => (
          <div key={param.key} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">{param.label}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  onClick={() => setScores(prev => ({ ...prev, [param.key]: prev[param.key] === val ? null : val }))}
                  className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${
                    scores[param.key] === val
                      ? "bg-yellow-500 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <Textarea
              value={notes[param.key] || ""}
              onChange={e => setNotes(prev => ({ ...prev, [param.key]: e.target.value }))}
              placeholder={`Notas sobre ${param.label.toLowerCase()}...`}
              className="rounded-xl text-sm"
              rows={1}
            />
          </div>
        ))}

        {/* Overall notes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Notas generales</p>
          <Textarea
            value={overallNotes}
            onChange={e => setOverallNotes(e.target.value)}
            placeholder="Observaciones generales..."
            className="rounded-xl text-sm"
            rows={3}
          />
        </div>

        {/* Approved toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Aprobado</p>
          <div className="flex gap-2">
            <Button
              variant={approved === true ? "default" : "outline"}
              onClick={() => setApproved(approved === true ? null : true)}
              className="flex-1 rounded-xl"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Sí
            </Button>
            <Button
              variant={approved === false ? "default" : "outline"}
              onClick={() => setApproved(approved === false ? null : false)}
              className="flex-1 rounded-xl"
              size="sm"
            >
              No
            </Button>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Fotos de Calidad</p>
          <div className="flex items-center gap-2 flex-wrap">
            {photos.map(photo => (
              <div key={photo.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                <img src={photo.photo_url} alt="Calidad" className="w-full h-full object-cover" />
                <button
                  onClick={async () => {
                    const ok = await deletePhoto(photo.id)
                    if (ok) setPhotos(prev => prev.filter(p => p.id !== photo.id))
                  }}
                  className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                const result = await uploadPhoto(file, prototypeId, null, "quality")
                if (result) setPhotos(prev => [...prev, result])
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl h-12 text-base"
        >
          {saving ? "Guardando..." : existingQuality ? "Actualizar Evaluación" : "Guardar Evaluación"}
        </Button>
      </div>
    </div>
  )
}
