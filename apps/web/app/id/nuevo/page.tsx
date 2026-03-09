"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePrototypes } from "@/hooks/use-prototypes"
import { useMaterials } from "@/hooks/use-materials"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, FlaskConical, Search } from "lucide-react"
import { toast } from "sonner"

export default function NuevoPrototipoPage() {
  const router = useRouter()
  const { createPrototype, generateCode, loading } = usePrototypes()
  const { materials, fetchMaterials } = useMaterials()

  const [isNew, setIsNew] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [objectives, setObjectives] = useState("")
  const [code, setCode] = useState("")
  const [searchProduct, setSearchProduct] = useState("")

  useEffect(() => {
    fetchMaterials()
    generateCode().then(setCode)
  }, [fetchMaterials, generateCode])

  const ptProducts = materials.filter(m => m.category === "PT")
  const filteredProducts = ptProducts.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  )

  const handleCreate = async () => {
    if (!productName.trim()) {
      toast.error("Ingresa el nombre del producto")
      return
    }

    const proto = await createPrototype({
      product_id: isNew ? null : selectedProductId,
      product_name: productName,
      product_category: "PT",
      is_new_product: isNew,
      code,
      status: "draft",
      description: description || null,
      objectives: objectives || null,
    })

    if (proto) {
      router.push(`/id/${proto.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/id")}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-lime-500 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Nuevo Prototipo</h1>
              <p className="text-xs text-gray-500">Producto Terminado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Code */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Código</label>
          <div className="text-lg font-mono font-bold text-lime-600">{code}</div>
        </div>

        {/* Product type toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex gap-2">
            <Button
              variant={isNew ? "default" : "outline"}
              onClick={() => {
                setIsNew(true)
                setSelectedProductId(null)
                setProductName("")
              }}
              className="flex-1 rounded-xl"
              size="sm"
            >
              Producto Nuevo
            </Button>
            <Button
              variant={!isNew ? "default" : "outline"}
              onClick={() => setIsNew(false)}
              className="flex-1 rounded-xl"
              size="sm"
            >
              Producto Existente
            </Button>
          </div>

          {isNew ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Nombre del Producto
              </label>
              <Input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Ej: Pan de Chocolate Premium"
                className="rounded-xl"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Seleccionar Producto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                  placeholder="Buscar producto..."
                  className="rounded-xl pl-10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id)
                      setProductName(p.name)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedProductId === p.id
                        ? "bg-lime-50 text-lime-700 border border-lime-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No se encontraron productos
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description & Objectives */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Descripción (opcional)
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve descripción del prototipo..."
              className="rounded-xl"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Objetivos (opcional)
            </label>
            <Textarea
              value={objectives}
              onChange={e => setObjectives(e.target.value)}
              placeholder="¿Qué se busca con este prototipo?"
              className="rounded-xl"
              rows={2}
            />
          </div>
        </div>

        {/* Create button */}
        <Button
          onClick={handleCreate}
          disabled={loading || !productName.trim()}
          className="w-full bg-lime-500 hover:bg-lime-600 text-white rounded-xl h-12 text-base"
        >
          {loading ? "Creando..." : "Crear Prototipo"}
        </Button>
      </div>
    </div>
  )
}
