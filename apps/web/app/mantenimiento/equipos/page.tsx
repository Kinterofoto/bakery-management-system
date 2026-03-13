"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Cog,
  Search,
  X,
  MapPin,
  Zap,
  Weight,
  Ruler,
  Hash,
  Calendar,
  Phone,
  Truck,
  FileText,
  Shield,
  Box,
  Tag,
  ChevronDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  useMaintenanceEquipment,
  type Equipment,
  type EquipmentCategory,
} from "@/hooks/use-maintenance-equipment"

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }

const STATUS_CONFIG: Record<
  Equipment["status"],
  { label: string; color: string }
> = {
  operativo: {
    label: "Operativo",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  en_mantenimiento: {
    label: "En Mantenimiento",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  fuera_servicio: {
    label: "Fuera de Servicio",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  dado_de_baja: {
    label: "Dado de Baja",
    color: "bg-gray-100 text-gray-600 border-gray-200",
  },
}

function StatusBadge({ status }: { status: Equipment["status"] }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge className={`${config.color} border font-medium`}>
      {config.label}
    </Badge>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}

export default function EquiposPage() {
  const { loading, getEquipment, getCategories } = useMaintenanceEquipment()

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  )

  // Load categories once
  useEffect(() => {
    getCategories().then(setCategories)
  }, [getCategories])

  // Load equipment when filters change
  useEffect(() => {
    const filters: { categoryId?: string; status?: string; search?: string } =
      {}
    if (categoryFilter) filters.categoryId = categoryFilter
    if (statusFilter) filters.status = statusFilter
    if (search.trim()) filters.search = search.trim()

    getEquipment(filters).then(setEquipment)
  }, [categoryFilter, statusFilter, search, getEquipment])

  // Debounced search — client-side filtering on top of query results
  const filteredEquipment = useMemo(() => {
    return equipment
  }, [equipment])

  const categoryMap = useMemo(() => {
    const map: Record<string, EquipmentCategory> = {}
    for (const cat of categories) map[cat.id] = cat
    return map
  }, [categories])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <Cog className="h-6 w-6 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Registro de Equipos
            </h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Inventario y estado de maquinaria y equipos
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/60 border-white/40 rounded-xl"
              />
            </div>

            {/* Category filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 pr-8 rounded-xl border border-white/40 bg-white/60 text-sm appearance-none cursor-pointer min-w-[180px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 pr-8 rounded-xl border border-white/40 bg-white/60 text-sm appearance-none cursor-pointer min-w-[180px] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">Todos los estados</option>
                <option value="operativo">Operativo</option>
                <option value="en_mantenimiento">En Mantenimiento</option>
                <option value="fuera_servicio">Fuera de Servicio</option>
                <option value="dado_de_baja">Dado de Baja</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Equipment count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          {loading
            ? "Cargando equipos..."
            : `${filteredEquipment.length} equipo${filteredEquipment.length !== 1 ? "s" : ""} encontrado${filteredEquipment.length !== 1 ? "s" : ""}`}
        </motion.div>

        {/* Equipment grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEquipment.map((eq, i) => {
              const cat =
                eq.equipment_categories || categoryMap[eq.category_id]
              return (
                <motion.div
                  key={eq.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ ...spring, delay: i * 0.05 }}
                  onClick={() => setSelectedEquipment(eq)}
                  className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md hover:bg-white/90 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {eq.name}
                      </h3>
                      {eq.code && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {eq.code}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={eq.status} />
                  </div>

                  {(eq.brand || eq.model) && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {[eq.brand, eq.model].filter(Boolean).join(" — ")}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {cat && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {cat.name}
                      </Badge>
                    )}
                    {eq.location && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {eq.location}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {!loading && filteredEquipment.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Box className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              No se encontraron equipos con los filtros seleccionados
            </p>
          </motion.div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedEquipment && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedEquipment(null)}
          >
            <motion.div
              key="detail"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {(() => {
                const eq = selectedEquipment
                const cat =
                  eq.equipment_categories || categoryMap[eq.category_id]
                const specsEntries = eq.specs
                  ? Object.entries(eq.specs)
                  : []

                return (
                  <>
                    {/* Modal header */}
                    <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-white/30 p-5 flex items-start justify-between gap-3 rounded-t-2xl">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">
                          {eq.name}
                        </h2>
                        {eq.code && (
                          <p className="text-sm text-muted-foreground font-mono">
                            {eq.code}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <StatusBadge status={eq.status} />
                          {cat && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-50 text-amber-800 border border-amber-200"
                            >
                              {cat.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEquipment(null)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Modal body */}
                    <div className="p-5 space-y-5">
                      {/* General info */}
                      <div className="space-y-2.5">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                          Información General
                        </h3>
                        <div className="space-y-2">
                          <DetailRow
                            icon={Tag}
                            label="Marca"
                            value={eq.brand}
                          />
                          <DetailRow
                            icon={Box}
                            label="Modelo"
                            value={eq.model}
                          />
                          <DetailRow
                            icon={Hash}
                            label="Nro. Serie"
                            value={eq.serial_number}
                          />
                          <DetailRow
                            icon={Calendar}
                            label="Año"
                            value={eq.year?.toString()}
                          />
                          <DetailRow
                            icon={MapPin}
                            label="Ubicación"
                            value={eq.location}
                          />
                        </div>
                      </div>

                      {/* Technical specs */}
                      {(eq.voltage ||
                        eq.power ||
                        eq.capacity ||
                        eq.dimensions ||
                        eq.weight) && (
                        <div className="space-y-2.5">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Especificaciones Técnicas
                          </h3>
                          <div className="space-y-2">
                            <DetailRow
                              icon={Zap}
                              label="Voltaje"
                              value={eq.voltage}
                            />
                            <DetailRow
                              icon={Zap}
                              label="Potencia"
                              value={eq.power}
                            />
                            <DetailRow
                              icon={Box}
                              label="Capacidad"
                              value={eq.capacity}
                            />
                            <DetailRow
                              icon={Ruler}
                              label="Dimensiones"
                              value={eq.dimensions}
                            />
                            <DetailRow
                              icon={Weight}
                              label="Peso"
                              value={eq.weight}
                            />
                          </div>
                        </div>
                      )}

                      {/* Supplier info */}
                      {(eq.supplier ||
                        eq.supplier_phone ||
                        eq.purchase_date ||
                        eq.warranty_expiry) && (
                        <div className="space-y-2.5">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Proveedor y Garantía
                          </h3>
                          <div className="space-y-2">
                            <DetailRow
                              icon={Truck}
                              label="Proveedor"
                              value={eq.supplier}
                            />
                            <DetailRow
                              icon={Phone}
                              label="Teléfono Proveedor"
                              value={eq.supplier_phone}
                            />
                            <DetailRow
                              icon={Calendar}
                              label="Fecha de Compra"
                              value={eq.purchase_date}
                            />
                            <DetailRow
                              icon={Shield}
                              label="Garantía hasta"
                              value={eq.warranty_expiry}
                            />
                          </div>
                        </div>
                      )}

                      {/* JSONB specs */}
                      {specsEntries.length > 0 && (
                        <div className="space-y-2.5">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Especificaciones Adicionales
                          </h3>
                          <div className="bg-amber-50/50 rounded-xl p-3 space-y-1.5">
                            {specsEntries.map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-baseline justify-between text-sm gap-2"
                              >
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="font-medium text-gray-900 text-right">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {eq.notes && (
                        <div className="space-y-2.5">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Notas
                          </h3>
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {eq.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
