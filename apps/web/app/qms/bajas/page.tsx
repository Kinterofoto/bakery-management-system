"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useWriteOffs, WriteOff } from "@/hooks/use-write-offs"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  PackageMinus,
  Loader2,
  Plus,
  X,
  TrendingDown,
  Package,
  Wheat,
  Calendar,
  Hash,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Product {
  id: string
  name: string
  weight: string | null
  category: string
  unit: string
}

const REASON_OPTIONS = [
  { value: "vencimiento", label: "Vencimiento" },
  { value: "contaminacion", label: "Contaminación" },
  { value: "dano_fisico", label: "Daño físico" },
  { value: "devolucion", label: "Devolución" },
  { value: "calidad", label: "No cumple calidad" },
  { value: "plagas", label: "Plagas" },
  { value: "otro", label: "Otro" },
]

function getReasonLabel(value: string) {
  return REASON_OPTIONS.find(r => r.value === value)?.label || value
}

function getCategoryBadge(cat: string) {
  if (cat === "PT") return { label: "Producto Terminado", color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300" }
  if (cat === "MP") return { label: "Materia Prima", color: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" }
  return { label: cat, color: "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300" }
}

function getProductDisplayName(product: Product) {
  return product.weight ? `${product.name} ${product.weight}` : product.name
}

export default function BajasPage() {
  const { writeOffs, loading, fetchWriteOffs, createWriteOff } = useWriteOffs()
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>("all")

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchWriteOffs()
    loadProducts()
  }, [fetchWriteOffs])

  const loadProducts = async () => {
    try {
      setProductsLoading(true)
      const { data, error } = await supabase
        .from("products")
        .select("id, name, weight, category, unit")
        .in("category", ["MP", "PT"])
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error("Error loading products:", err)
    } finally {
      setProductsLoading(false)
    }
  }

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const productOptions = useMemo(
    () => products.map(p => ({
      value: p.id,
      label: getProductDisplayName(p),
      subLabel: p.category === "PT" ? "Producto Terminado" : "Materia Prima",
    })),
    [products]
  )

  const reasonOptions = useMemo(
    () => REASON_OPTIONS.map(r => ({ value: r.value, label: r.label })),
    []
  )

  const filteredWriteOffs = useMemo(() => {
    if (filterCategory === "all") return writeOffs
    return writeOffs.filter(w => w.product_category === filterCategory)
  }, [writeOffs, filterCategory])

  // Dashboard stats
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthRecords = writeOffs.filter(w => {
      const d = new Date(w.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const totalMonth = monthRecords.length
    const totalPT = monthRecords.filter(w => w.product_category === "PT").length
    const totalMP = monthRecords.filter(w => w.product_category === "MP").length

    // Top reason
    const reasonCounts: Record<string, number> = {}
    monthRecords.forEach(w => {
      reasonCounts[w.reason] = (reasonCounts[w.reason] || 0) + 1
    })
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]

    return { totalMonth, totalPT, totalMP, topReason }
  }, [writeOffs])

  const handleSubmit = async () => {
    if (!selectedProductId || !quantity || !reason || !selectedProduct) return

    try {
      setSubmitting(true)
      await createWriteOff({
        productId: selectedProductId,
        productCategory: selectedProduct.category,
        quantity: parseFloat(quantity),
        unit: selectedProduct.unit,
        reason,
        notes: notes.trim() || undefined,
      })

      // Reset form
      setSelectedProductId(null)
      setQuantity("")
      setReason(null)
      setNotes("")
      setShowForm(false)
    } catch {
      // Error already handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = selectedProductId && quantity && parseFloat(quantity) > 0 && reason

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-red-50/30 to-orange-50/50 dark:from-gray-950 dark:via-rose-950/20 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-lg shadow-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                <PackageMinus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Bajas de Inventario
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                  Registro y trazabilidad de bajas de productos terminados y materias primas
                </p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-medium hover:from-rose-600 hover:to-red-700 transition-all shadow-lg shadow-rose-500/25 active:scale-[0.97] shrink-0"
              >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showForm ? "Cancelar" : "Nueva Baja"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* New Write-off Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="pb-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Registrar Baja
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Producto o Materia Prima
                    </label>
                    {productsLoading ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando productos...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={productOptions}
                        value={selectedProductId}
                        onChange={setSelectedProductId}
                        placeholder="Buscar producto o materia prima..."
                        icon={<Package className="w-4 h-4" />}
                      />
                    )}
                    {selectedProduct && (
                      <div className="mt-2">
                        <Badge className={getCategoryBadge(selectedProduct.category).color + " rounded-full px-3 py-1 text-xs font-medium"}>
                          {getCategoryBadge(selectedProduct.category).label}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Quantity + Reason row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Cantidad
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition-colors text-sm"
                        />
                        {selectedProduct && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                            {selectedProduct.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Razón de Baja
                      </label>
                      <SearchableSelect
                        options={reasonOptions}
                        value={reason}
                        onChange={setReason}
                        placeholder="Seleccionar razón..."
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Detalles adicionales sobre la baja..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 transition-colors text-sm resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || submitting}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-medium hover:from-rose-600 hover:to-red-700 transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PackageMinus className="w-4 h-4" />
                      )}
                      Registrar Baja
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Bajas este mes", value: stats.totalMonth, icon: TrendingDown, color: "from-rose-400 to-red-500", shadowColor: "shadow-rose-500/30" },
            { label: "Prod. Terminados", value: stats.totalPT, icon: Package, color: "from-blue-400 to-blue-600", shadowColor: "shadow-blue-500/30" },
            { label: "Materias Primas", value: stats.totalMP, icon: Wheat, color: "from-amber-400 to-orange-500", shadowColor: "shadow-amber-500/30" },
            { label: "Razón principal", value: stats.topReason ? getReasonLabel(stats.topReason[0]) : "—", icon: Hash, color: "from-purple-400 to-purple-600", shadowColor: "shadow-purple-500/30", isText: true },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.05 }}
            >
              <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadowColor}`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </span>
                  </div>
                  <p className={`font-bold text-gray-900 dark:text-white tracking-tight ${(stat as any).isText ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}>
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filter + History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        >
          <Card className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-lg shadow-black/5 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Historial de Bajas
                </h2>
                <div className="flex gap-1.5 bg-white/40 dark:bg-white/5 rounded-xl p-1 border border-white/20 dark:border-white/10">
                  {[
                    { value: "all", label: "Todos" },
                    { value: "PT", label: "Prod. Term." },
                    { value: "MP", label: "Mat. Prima" },
                  ].map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFilterCategory(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterCategory === f.value
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                          : "text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                </div>
              ) : filteredWriteOffs.length === 0 ? (
                <div className="text-center py-12">
                  <PackageMinus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">No hay bajas registradas</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto -mx-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200/30 dark:border-white/10">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Producto</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cantidad</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Razón</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/20 dark:divide-white/5">
                        {filteredWriteOffs.map((record, i) => {
                          const catBadge = getCategoryBadge(record.product_category)
                          const productName = record.product
                            ? getProductDisplayName(record.product as Product)
                            : "—"
                          return (
                            <motion.tr
                              key={record.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.03 }}
                              className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150"
                            >
                              <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                  {format(new Date(record.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                {productName}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge className={`${catBadge.color} rounded-full px-3 py-1 text-[10px] font-medium`}>
                                  {catBadge.label}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-center font-mono font-medium text-gray-900 dark:text-white">
                                {record.quantity} {record.unit}
                              </td>
                              <td className="px-6 py-4">
                                <Badge className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-full px-3 py-1 text-xs font-medium">
                                  {getReasonLabel(record.reason)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                                {record.notes || "—"}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    {filteredWriteOffs.map((record, i) => {
                      const catBadge = getCategoryBadge(record.product_category)
                      const productName = record.product
                        ? getProductDisplayName(record.product as Product)
                        : "—"
                      return (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="bg-white/40 dark:bg-white/5 rounded-2xl p-4 space-y-3 border border-white/20 dark:border-white/5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {format(new Date(record.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                            </span>
                            <Badge className={`${catBadge.color} rounded-full px-3 py-1 text-[10px] font-medium`}>
                              {catBadge.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {productName}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                              {record.quantity} {record.unit}
                            </span>
                            <Badge className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-full px-3 py-1 text-xs font-medium">
                              {getReasonLabel(record.reason)}
                            </Badge>
                          </div>
                          {record.notes && (
                            <p className="text-xs text-gray-400 italic">{record.notes}</p>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
