"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useQMSPqrs, PqrsType } from "@/hooks/use-qms-pqrs"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Check,
  FileText,
  Image as ImageIcon,
  MessageSquareWarning,
  Package,
  User,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react"

interface Product {
  id: string
  name: string
  weight: string | null
  category: string
}

const PQRS_TYPES: { value: PqrsType; label: string; description: string; emoji: string }[] = [
  { value: "peticion", label: "Peticion", description: "Solicitud de informacion o servicio", emoji: "📋" },
  { value: "queja", label: "Queja", description: "Inconformidad con el servicio recibido", emoji: "😟" },
  { value: "reclamo", label: "Reclamo", description: "Producto con defecto o problema de calidad", emoji: "⚠️" },
  { value: "sugerencia", label: "Sugerencia", description: "Propuesta de mejora para nuestros productos", emoji: "💡" },
]

const STEPS = [
  { id: 1, label: "Tipo", icon: MessageSquareWarning },
  { id: 2, label: "Producto", icon: Package },
  { id: 3, label: "Detalle", icon: FileText },
  { id: 4, label: "Contacto", icon: User },
]

export default function PqrsNuevoPage() {
  const { createPqrs, uploadAttachment } = useQMSPqrs()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Step 1: Type
  const [pqrsType, setPqrsType] = useState<PqrsType | null>(null)

  // Step 2: Product
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productLot, setProductLot] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchaseLocation, setPurchaseLocation] = useState("")

  // Step 3: Description & files
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 4: Contact
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, weight, category")
      .eq("category", "PT")
      .eq("is_active", true)
      .order("name")
    if (data) setProducts(data)
  }

  const filteredProducts = products.filter(p => {
    const search = productSearch.toLowerCase()
    return `${p.name} ${p.weight || ""}`.toLowerCase().includes(search)
  })

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const canProceed = () => {
    switch (step) {
      case 1: return !!pqrsType
      case 2: return true // product is optional
      case 3: return description.trim().length >= 10
      case 4: return clientName.trim() && clientEmail.trim() && clientEmail.includes("@")
      default: return false
    }
  }

  const handleSubmit = async () => {
    if (!pqrsType || !clientName || !clientEmail) return
    setSubmitting(true)
    try {
      const pqrs = await createPqrs({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || undefined,
        pqrs_type: pqrsType,
        description: description.trim(),
        product_id: selectedProduct?.id || null,
        product_name: selectedProduct ? `${selectedProduct.name} ${selectedProduct.weight || ""}`.trim() : null,
        product_lot: productLot.trim() || undefined,
        expiry_date: expiryDate || null,
        purchase_date: purchaseDate || null,
        purchase_location: purchaseLocation.trim() || undefined,
      })

      // Upload files
      if (pqrs && files.length > 0) {
        for (const file of files) {
          await uploadAttachment(pqrs.id, file, false)
        }
      }

      setSubmitted(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PQRS Registrada</h1>
          <p className="text-gray-600">
            Tu solicitud ha sido registrada exitosamente. Nuestro equipo de calidad la revisara y te contactaremos
            al correo <span className="font-medium text-gray-900">{clientEmail}</span> con la resolucion.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setStep(1)
              setPqrsType(null)
              setSelectedProduct(null)
              setProductLot("")
              setExpiryDate("")
              setPurchaseDate("")
              setPurchaseLocation("")
              setDescription("")
              setFiles([])
              setClientName("")
              setClientEmail("")
              setClientPhone("")
            }}
            className="px-6 py-3 bg-red-500 text-white rounded-2xl font-medium hover:bg-red-600 transition-colors"
          >
            Registrar otra PQRS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Pastry</h1>
            <p className="text-xs text-gray-500">Sistema de Gestion de Calidad</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all duration-300",
                  s.id <= step ? "opacity-100" : "opacity-40"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                  s.id < step
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                    : s.id === step
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                      : "bg-gray-100 text-gray-400"
                )}>
                  {s.id < step ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  s.id === step ? "text-red-600" : s.id < step ? "text-green-600" : "text-gray-400"
                )}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-20px] rounded-full transition-all duration-500",
                  s.id < step ? "bg-green-400" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-gray-200/50 overflow-hidden">
          {/* Step 1: Type Selection */}
          {step === 1 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tipo de solicitud</h2>
                <p className="text-sm text-gray-500 mt-1">Selecciona el tipo de PQRS que deseas registrar</p>
              </div>
              <div className="grid gap-3">
                {PQRS_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setPqrsType(type.value)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                      pqrsType === type.value
                        ? "border-red-500 bg-red-50/50 shadow-lg shadow-red-500/10"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                    )}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <div className="flex-1">
                      <p className={cn(
                        "font-semibold",
                        pqrsType === type.value ? "text-red-700" : "text-gray-900"
                      )}>{type.label}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                    {pqrsType === type.value && (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Product Info */}
          {step === 2 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Informacion del producto</h2>
                <p className="text-sm text-gray-500 mt-1">Selecciona el producto relacionado (opcional)</p>
              </div>

              {/* Product Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Producto</label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => {
                      setProductSearch(e.target.value)
                      if (selectedProduct) setSelectedProduct(null)
                    }}
                    placeholder="Buscar producto..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                  {selectedProduct && (
                    <button
                      onClick={() => { setSelectedProduct(null); setProductSearch("") }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {productSearch && !selectedProduct && (
                  <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto bg-white shadow-lg">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-sm text-gray-400 text-center">No se encontraron productos</p>
                    ) : (
                      filteredProducts.slice(0, 20).map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p)
                            setProductSearch(`${p.name} ${p.weight || ""}`.trim())
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{p.name} {p.weight || ""}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Lot & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Numero de lote</label>
                  <input
                    type="text"
                    value={productLot}
                    onChange={e => setProductLot(e.target.value)}
                    placeholder="Ej: L2025-0412"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fecha de compra</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Lugar de compra</label>
                  <input
                    type="text"
                    value={purchaseLocation}
                    onChange={e => setPurchaseLocation(e.target.value)}
                    placeholder="Tienda, supermercado..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Description & Files */}
          {step === 3 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Describe tu solicitud</h2>
                <p className="text-sm text-gray-500 mt-1">Proporciona todos los detalles posibles para ayudarnos a resolver tu caso</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Descripcion detallada *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe detalladamente tu peticion, queja, reclamo o sugerencia..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm resize-none"
                />
                <p className="text-xs text-gray-400">Minimo 10 caracteres</p>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Fotos y documentos de soporte</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-all"
                >
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Toca para subir fotos o documentos</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF - Max 10MB por archivo</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileAdd}
                  className="hidden"
                />
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Contact Info */}
          {step === 4 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Datos de contacto</h2>
                <p className="text-sm text-gray-500 mt-1">Para enviarte la resolucion de tu solicitud</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nombre completo *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Correo electronico *</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Celular</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="300 123 4567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Resumen</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Tipo:</span> {PQRS_TYPES.find(t => t.value === pqrsType)?.label}</p>
                  {selectedProduct && (
                    <p><span className="font-medium">Producto:</span> {selectedProduct.name} {selectedProduct.weight || ""}</p>
                  )}
                  {productLot && <p><span className="font-medium">Lote:</span> {productLot}</p>}
                  <p><span className="font-medium">Descripcion:</span> {description.substring(0, 80)}{description.length > 80 ? "..." : ""}</p>
                  {files.length > 0 && <p><span className="font-medium">Archivos:</span> {files.length} adjunto(s)</p>}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="p-6 sm:p-8 pt-0 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Atras
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => canProceed() && setStep(step + 1)}
                disabled={!canProceed()}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                  canProceed()
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all",
                  canProceed() && !submitting
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar PQRS
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Pastry - Sistema de Gestion de Calidad
        </p>
      </div>
    </div>
  )
}
