"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Plus, Trash2, Upload, FileText, Download, ChevronDown, ChevronUp,
  Building2, Phone, Mail, MapPin, Hash, Loader2, AlertCircle, Calendar,
} from "lucide-react"
import { useQMSSuppliers, ProgramSupplier, SupplierDocument } from "@/hooks/use-qms-suppliers"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
  open: boolean
  onClose: () => void
  programId: string
  programName: string
  accentColor: string
}

const DOCUMENT_TYPES = [
  "Certificado",
  "Licencia sanitaria",
  "RUT",
  "Cámara de comercio",
  "Contrato",
  "Ficha técnica",
  "Hoja de seguridad",
  "Póliza de seguro",
  "Otro",
]

export function ProgramSuppliersModal({ open, onClose, programId, programName, accentColor }: Props) {
  const { loading, getSuppliers, createSupplier, updateSupplier, deleteSupplier, uploadDocument, deleteDocument } = useQMSSuppliers()
  const [suppliers, setSuppliers] = useState<ProgramSupplier[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ProgramSupplier>>({})
  // Document upload state
  const [uploadingSupplierId, setUploadingSupplierId] = useState<string | null>(null)
  const [docName, setDocName] = useState("")
  const [docType, setDocType] = useState("")
  const [docExpiry, setDocExpiry] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (open && programId) {
      loadSuppliers()
    }
  }, [open, programId])

  const loadSuppliers = async () => {
    const data = await getSuppliers(programId)
    setSuppliers(data)
    if (data.length > 0 && !expandedId) {
      setExpandedId(data[0].id)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const created = await createSupplier({
        program_id: programId,
        name: newName.trim(),
        category: newCategory.trim() || null,
      })
      if (created) {
        setSuppliers(prev => [...prev, created])
        setNewName("")
        setNewCategory("")
        setShowNewForm(false)
        setExpandedId(created.id)
      }
    } catch {}
  }

  const handleUpdate = async (id: string) => {
    try {
      const updated = await updateSupplier(id, editForm)
      if (updated) {
        setSuppliers(prev => prev.map(s => s.id === id ? updated : s))
        setEditingId(null)
        setEditForm({})
      }
    } catch {}
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteSupplier(id)
    if (ok) {
      setSuppliers(prev => prev.filter(s => s.id !== id))
      if (expandedId === id) setExpandedId(null)
    }
  }

  const handleUploadDoc = async (supplierId: string) => {
    if (!selectedFile || !docName.trim()) {
      toast.error("Selecciona un archivo y nombre de documento")
      return
    }
    try {
      const doc = await uploadDocument(supplierId, selectedFile, docName.trim(), docType || undefined, docExpiry || undefined)
      if (doc) {
        setSuppliers(prev => prev.map(s => {
          if (s.id !== supplierId) return s
          return { ...s, supplier_documents: [...(s.supplier_documents || []), doc] }
        }))
        setSelectedFile(null)
        setDocName("")
        setDocType("")
        setDocExpiry("")
        setUploadingSupplierId(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch {}
  }

  const handleDeleteDoc = async (supplierId: string, docId: string) => {
    const ok = await deleteDocument(docId)
    if (ok) {
      setSuppliers(prev => prev.map(s => {
        if (s.id !== supplierId) return s
        return { ...s, supplier_documents: (s.supplier_documents || []).filter(d => d.id !== docId) }
      }))
    }
  }

  const startEdit = (supplier: ProgramSupplier) => {
    setEditingId(supplier.id)
    setEditForm({
      name: supplier.name,
      category: supplier.category,
      contact_person: supplier.contact_person,
      contact_phone: supplier.contact_phone,
      contact_email: supplier.contact_email,
      nit: supplier.nit,
      address: supplier.address,
      notes: supplier.notes,
    })
  }

  const accentMap: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
    blue: { bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/30", gradient: "from-sky-400 to-blue-600" },
    green: { bg: "bg-green-500", text: "text-green-600 dark:text-green-400", ring: "ring-green-500/30", gradient: "from-green-400 to-emerald-600" },
    purple: { bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/30", gradient: "from-purple-400 to-violet-600" },
    orange: { bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/30", gradient: "from-orange-400 to-red-600" },
  }
  const accent = accentMap[accentColor] || accentMap.blue

  const isExpired = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-2 sm:inset-4 z-[70] flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200/30 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-lg`}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Proveedores
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{programName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {suppliers.length === 0 && !showNewForm && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Building2 className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm mb-4">No hay proveedores registrados</p>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${accent.bg} text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity`}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar proveedor
                  </button>
                </div>
              )}

              {/* Supplier cards */}
              {suppliers.map((supplier) => {
                const isExpanded = expandedId === supplier.id
                const isEditing = editingId === supplier.id
                const docs = supplier.supplier_documents || []

                return (
                  <motion.div
                    key={supplier.id}
                    layout
                    className="bg-white/60 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-2xl overflow-hidden"
                  >
                    {/* Supplier header row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent.gradient} flex items-center justify-center shrink-0`}>
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {supplier.name}
                        </p>
                        {supplier.category && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.category}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 mr-1">{docs.length} doc{docs.length !== 1 ? "s" : ""}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-4 border-t border-gray-200/20 dark:border-white/5 pt-4">
                            {/* Info / Edit */}
                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                                    <input
                                      value={editForm.name || ""}
                                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                                    <input
                                      value={editForm.category || ""}
                                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">NIT</label>
                                    <input
                                      value={editForm.nit || ""}
                                      onChange={e => setEditForm(f => ({ ...f, nit: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Persona de contacto</label>
                                    <input
                                      value={editForm.contact_person || ""}
                                      onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                                    <input
                                      value={editForm.contact_phone || ""}
                                      onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                                    <input
                                      type="email"
                                      value={editForm.contact_email || ""}
                                      onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Dirección</label>
                                  <input
                                    value={editForm.address || ""}
                                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                                  <textarea
                                    value={editForm.notes || ""}
                                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => { setEditingId(null); setEditForm({}) }}
                                    className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleUpdate(supplier.id)}
                                    disabled={loading}
                                    className={`px-4 py-1.5 text-xs rounded-lg ${accent.bg} text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
                                  >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Contact info display */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {supplier.nit && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                                      <span>NIT: {supplier.nit}</span>
                                    </div>
                                  )}
                                  {supplier.contact_person && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                      <span>{supplier.contact_person}</span>
                                    </div>
                                  )}
                                  {supplier.contact_phone && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                                      <span>{supplier.contact_phone}</span>
                                    </div>
                                  )}
                                  {supplier.contact_email && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                                      <span>{supplier.contact_email}</span>
                                    </div>
                                  )}
                                  {supplier.address && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 sm:col-span-2">
                                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                      <span>{supplier.address}</span>
                                    </div>
                                  )}
                                </div>
                                {supplier.notes && (
                                  <p className="text-xs text-gray-400 italic">{supplier.notes}</p>
                                )}
                                {/* No info at all? */}
                                {!supplier.nit && !supplier.contact_person && !supplier.contact_phone && !supplier.contact_email && !supplier.address && !supplier.notes && (
                                  <p className="text-xs text-gray-400 italic">Sin información de contacto. Edita para agregar datos.</p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEdit(supplier)}
                                    className="px-3 py-1.5 text-xs rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200/40 dark:border-white/10"
                                  >
                                    Editar datos
                                  </button>
                                  <button
                                    onClick={() => handleDelete(supplier.id)}
                                    className="px-3 py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border border-red-200/40 dark:border-red-500/20"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Documents section */}
                            <div className="border-t border-gray-200/20 dark:border-white/5 pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" />
                                  Documentación ({docs.length})
                                </h4>
                                <button
                                  onClick={() => setUploadingSupplierId(uploadingSupplierId === supplier.id ? null : supplier.id)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    uploadingSupplierId === supplier.id
                                      ? "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                                      : `${accent.bg}/10 ${accent.text} hover:${accent.bg}/20`
                                  }`}
                                >
                                  {uploadingSupplierId === supplier.id ? (
                                    <X className="w-3 h-3" />
                                  ) : (
                                    <Upload className="w-3 h-3" />
                                  )}
                                  {uploadingSupplierId === supplier.id ? "Cancelar" : "Subir"}
                                </button>
                              </div>

                              {/* Upload form */}
                              <AnimatePresence>
                                {uploadingSupplierId === supplier.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mb-3"
                                  >
                                    <div className="bg-white/40 dark:bg-white/5 rounded-xl p-3 space-y-2.5 border border-gray-200/30 dark:border-white/10">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div>
                                          <label className="text-xs text-gray-500 mb-1 block">Nombre del documento *</label>
                                          <input
                                            value={docName}
                                            onChange={e => setDocName(e.target.value)}
                                            placeholder="Ej: Certificado sanitario 2026"
                                            className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-500 mb-1 block">Tipo de documento</label>
                                          <select
                                            value={docType}
                                            onChange={e => setDocType(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                          >
                                            <option value="">Seleccionar...</option>
                                            {DOCUMENT_TYPES.map(t => (
                                              <option key={t} value={t}>{t}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Fecha de vencimiento (opcional)</label>
                                        <input
                                          type="date"
                                          value={docExpiry}
                                          onChange={e => setDocExpiry(e.target.value)}
                                          className="w-full sm:w-auto px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                      </div>
                                      <div>
                                        <input
                                          ref={fileInputRef}
                                          type="file"
                                          onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                          className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-500/20 file:cursor-pointer"
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <button
                                          onClick={() => handleUploadDoc(supplier.id)}
                                          disabled={loading || !selectedFile || !docName.trim()}
                                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg ${accent.bg} text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40`}
                                        >
                                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                          Subir documento
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Documents list */}
                              {docs.length === 0 ? (
                                <p className="text-xs text-gray-400 italic text-center py-3">Sin documentación adjunta</p>
                              ) : (
                                <div className="space-y-2">
                                  {docs.map(doc => {
                                    const expired = isExpired(doc.expiry_date)
                                    return (
                                      <div
                                        key={doc.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-white/5 border transition-colors ${
                                          expired
                                            ? "border-red-300/40 dark:border-red-500/20"
                                            : "border-white/20 dark:border-white/10"
                                        }`}
                                      >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                          expired ? "bg-red-500/10" : "bg-blue-500/10"
                                        }`}>
                                          <FileText className={`w-4 h-4 ${expired ? "text-red-500" : "text-blue-500"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                            {doc.document_name}
                                          </p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {doc.document_type && (
                                              <span className="text-[10px] text-gray-400">{doc.document_type}</span>
                                            )}
                                            {doc.expiry_date && (
                                              <span className={`text-[10px] flex items-center gap-0.5 ${
                                                expired ? "text-red-500 font-medium" : "text-gray-400"
                                              }`}>
                                                {expired && <AlertCircle className="w-2.5 h-2.5" />}
                                                <Calendar className="w-2.5 h-2.5" />
                                                Vence: {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: es })}
                                              </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 truncate">{doc.file_name}</span>
                                          </div>
                                        </div>
                                        <a
                                          href={doc.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
                                        >
                                          <Download className="w-4 h-4 text-gray-400" />
                                        </a>
                                        <button
                                          onClick={() => handleDeleteDoc(supplier.id, doc.id)}
                                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}

              {/* New supplier form */}
              {showNewForm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/60 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-4 space-y-3"
                >
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nuevo proveedor</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nombre del proveedor *</label>
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Ej: Empresa XYZ S.A.S"
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                      <input
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="Ej: Lavado de tanques"
                        className="w-full px-3 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-gray-200/40 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowNewForm(false); setNewName(""); setNewCategory("") }}
                      className="px-3 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={loading || !newName.trim()}
                      className={`px-4 py-1.5 text-xs rounded-lg ${accent.bg} text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40`}
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Registrar"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Add button when suppliers exist */}
              {suppliers.length > 0 && !showNewForm && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-gray-300 dark:border-white/20 text-gray-500 hover:bg-white/40 dark:hover:bg-white/5 hover:border-gray-400 dark:hover:border-white/30 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar proveedor
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
