"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Cog,
  Thermometer,
  Wrench,
  MapPin,
  Zap,
  Box,
  Phone,
  Calendar,
  X,
  Hash,
  Tag,
  Ruler,
  Weight,
  Shield,
  Truck,
  Info,
  Package,
  AlertTriangle,
  Paperclip,
  Download,
  ExternalLink,
  FileImage,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  useMaintenanceEquipment,
  type Equipment,
  type EquipmentCategory,
} from "@/hooks/use-maintenance-equipment"
import {
  useMaintenanceSpareParts,
  type SparePart,
} from "@/hooks/use-maintenance-spare-parts"
import {
  useMaintenanceAttachments,
  type Attachment,
} from "@/hooks/use-maintenance-attachments"

const spring = { type: "spring" as const, stiffness: 300, damping: 30 }
const stagger = 0.05

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Producción: Cog,
  Refrigeración: Thermometer,
  Auxiliar: Wrench,
}

const CATEGORY_TABS = ["Producción", "Refrigeración", "Auxiliar"] as const

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
  value: string | number | null | undefined
}) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium text-foreground">{String(value)}</span>
      </div>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-3 mt-1">
      {title}
    </h4>
  )
}

function SparePartRow({ part }: { part: SparePart }) {
  const isLow = part.quantity_in_stock <= part.minimum_stock
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/50 border border-white/40">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-amber-600" />
        <div>
          <p className="text-sm font-medium">{part.name}</p>
          {part.part_number && (
            <p className="text-xs text-muted-foreground">
              N/P: {part.part_number}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {part.supplier && (
          <span className="text-muted-foreground hidden sm:inline">
            {part.supplier}
          </span>
        )}
        <div className="flex items-center gap-1">
          {isLow && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span
            className={`font-medium ${isLow ? "text-amber-600" : "text-foreground"}`}
          >
            {part.quantity_in_stock}
          </span>
          <span className="text-muted-foreground">
            / mín. {part.minimum_stock}
          </span>
        </div>
        {part.unit_cost !== null && (
          <span className="text-muted-foreground">
            ${part.unit_cost.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FileImage
  return FileText
}

function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const Icon = getFileIcon(attachment.file_name)
  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/50 border border-white/40 hover:bg-amber-50/50 hover:border-amber-200/50 transition-all group"
    >
      <Icon className="h-5 w-5 text-amber-600 shrink-0" />
      <span className="text-sm font-medium text-foreground truncate flex-1 group-hover:text-amber-800">
        {attachment.file_name}
      </span>
      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 shrink-0" />
    </a>
  )
}

function EquipmentDetailModal({
  equipment,
  spareParts,
  attachments,
  onClose,
}: {
  equipment: Equipment
  spareParts: SparePart[]
  attachments: Attachment[]
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={spring}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/30 bg-white/80 backdrop-blur-xl rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {equipment.name}
            </h3>
            {equipment.code && (
              <p className="text-sm text-muted-foreground">
                Código: {equipment.code}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={equipment.status} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* General */}
          <div>
            <SectionTitle title="Información General" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DetailRow icon={Tag} label="Nombre" value={equipment.name} />
              <DetailRow icon={Hash} label="Código" value={equipment.code} />
              <DetailRow icon={Box} label="Marca" value={equipment.brand} />
              <DetailRow icon={Cog} label="Modelo" value={equipment.model} />
              <DetailRow
                icon={Hash}
                label="N/Serie"
                value={equipment.serial_number}
              />
              <DetailRow
                icon={Calendar}
                label="Año"
                value={equipment.year}
              />
              <DetailRow
                icon={MapPin}
                label="Ubicación"
                value={equipment.location}
              />
            </div>
          </div>

          {/* Technical */}
          {(equipment.voltage ||
            equipment.power ||
            equipment.capacity ||
            equipment.dimensions ||
            equipment.weight) && (
            <div>
              <SectionTitle title="Especificaciones Técnicas" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DetailRow
                  icon={Zap}
                  label="Voltaje"
                  value={equipment.voltage}
                />
                <DetailRow
                  icon={Zap}
                  label="Potencia"
                  value={equipment.power}
                />
                <DetailRow
                  icon={Box}
                  label="Capacidad"
                  value={equipment.capacity}
                />
                <DetailRow
                  icon={Ruler}
                  label="Dimensiones"
                  value={equipment.dimensions}
                />
                <DetailRow
                  icon={Weight}
                  label="Peso"
                  value={equipment.weight}
                />
              </div>
            </div>
          )}

          {/* Supplier */}
          {(equipment.supplier ||
            equipment.supplier_phone ||
            equipment.purchase_date ||
            equipment.warranty_expiry) && (
            <div>
              <SectionTitle title="Proveedor y Garantía" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DetailRow
                  icon={Truck}
                  label="Proveedor"
                  value={equipment.supplier}
                />
                <DetailRow
                  icon={Phone}
                  label="Teléfono"
                  value={equipment.supplier_phone}
                />
                <DetailRow
                  icon={Calendar}
                  label="Fecha de compra"
                  value={equipment.purchase_date}
                />
                <DetailRow
                  icon={Shield}
                  label="Garantía hasta"
                  value={equipment.warranty_expiry}
                />
              </div>
            </div>
          )}

          {/* Custom specs from jsonb */}
          {equipment.specs &&
            Object.keys(equipment.specs).length > 0 && (
              <div>
                <SectionTitle title="Especificaciones Adicionales" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(equipment.specs).map(([key, value]) => (
                    <DetailRow
                      key={key}
                      icon={Info}
                      label={key}
                      value={String(value)}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* Notes */}
          {equipment.notes && (
            <div>
              <SectionTitle title="Notas" />
              <p className="text-sm text-foreground/80 bg-white/50 rounded-xl p-3 border border-white/30">
                {equipment.notes}
              </p>
            </div>
          )}

          {/* Documentos Adjuntos */}
          <div>
            <SectionTitle title="Documentos Adjuntos" />
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No hay documentos adjuntos para este equipo.
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <AttachmentRow key={att.id} attachment={att} />
                ))}
              </div>
            )}
          </div>

          {/* Spare parts */}
          <div>
            <SectionTitle title="Repuestos" />
            {spareParts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No hay repuestos registrados para este equipo.
              </p>
            ) : (
              <div className="space-y-2">
                {spareParts.map((part) => (
                  <SparePartRow key={part.id} part={part} />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FichasTecnicasPage() {
  const { getCategories, getEquipment, loading } = useMaintenanceEquipment()
  const { getSpareParts, loading: spareLoading } = useMaintenanceSpareParts()
  const { getAttachments } = useMaintenanceAttachments()

  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedTab, setSelectedTab] = useState<string>(CATEGORY_TABS[0])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  )
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])

  // Load categories
  useEffect(() => {
    getCategories().then(setCategories)
  }, [getCategories])

  // Find the category id that matches the selected tab name
  const selectedCategory = categories.find(
    (c) =>
      c.name.toLowerCase().includes(selectedTab.toLowerCase()) ||
      selectedTab.toLowerCase().includes(c.name.toLowerCase())
  )

  // Load equipment when category changes
  useEffect(() => {
    if (selectedCategory) {
      getEquipment({ categoryId: selectedCategory.id }).then(setEquipment)
    } else if (categories.length > 0) {
      // If no exact match, load all equipment
      getEquipment().then(setEquipment)
    }
  }, [selectedCategory, categories, getEquipment])

  // Load spare parts when an equipment is selected
  const handleSelectEquipment = useCallback(
    async (eq: Equipment) => {
      setSelectedEquipment(eq)
      const [parts, atts] = await Promise.all([
        getSpareParts({ equipmentId: eq.id }),
        getAttachments("equipment", eq.id),
      ])
      setSpareParts(parts)
      setAttachments(atts)
    },
    [getSpareParts, getAttachments]
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-yellow-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-100/80 backdrop-blur-sm">
              <FileText className="h-6 w-6 text-amber-700" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Fichas Técnicas
            </h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Especificaciones técnicas y fichas de los equipos
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="flex gap-2 mb-8"
        >
          {CATEGORY_TABS.map((tab) => {
            const Icon = CATEGORY_ICONS[tab] || Cog
            const isActive = selectedTab === tab
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`
                  relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-200/50"
                      : "bg-white/80 backdrop-blur-xl border border-white/30 text-foreground hover:bg-white/90"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab}
              </button>
            )
          })}
        </motion.div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Equipment Grid */}
        {!loading && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: stagger } },
            }}
          >
            <AnimatePresence mode="popLayout">
              {equipment.map((eq, i) => (
                <motion.div
                  key={eq.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.97 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={spring}
                  onClick={() => handleSelectEquipment(eq)}
                  className="cursor-pointer bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-5 hover:shadow-lg hover:shadow-amber-100/50 hover:border-amber-200/50 transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-foreground group-hover:text-amber-800 transition-colors">
                      {eq.name}
                    </h3>
                    <StatusBadge status={eq.status} />
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {eq.code && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 text-amber-500" />
                        <span>{eq.code}</span>
                      </div>
                    )}
                    {eq.brand && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-amber-500" />
                        <span>
                          {eq.brand}
                          {eq.model ? ` — ${eq.model}` : ""}
                        </span>
                      </div>
                    )}
                    {eq.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-amber-500" />
                        <span>{eq.location}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && equipment.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FileText className="h-12 w-12 text-amber-300 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No se encontraron equipos en esta categoría.
            </p>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEquipment && (
          <EquipmentDetailModal
            equipment={selectedEquipment}
            spareParts={spareParts}
            attachments={attachments}
            onClose={() => {
              setSelectedEquipment(null)
              setSpareParts([])
              setAttachments([])
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
