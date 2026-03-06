"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { usePrototypes } from "@/hooks/use-prototypes"
import { PrototypeCard } from "@/components/id/PrototypeCard"
import { PrototypeStatusBadge } from "@/components/id/PrototypeStatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, FlaskConical, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type PrototypeStatus = 'draft' | 'in_progress' | 'sensory_review' | 'approved' | 'rejected' | 'archived'

export default function IDPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { loading, getPrototypes } = usePrototypes()
  const [prototypes, setPrototypes] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    loadPrototypes()
  }, [])

  const loadPrototypes = async () => {
    const data = await getPrototypes()
    setPrototypes(data)
  }

  const filtered = prototypes.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusOptions: { value: string; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "draft", label: "Borrador" },
    { value: "in_progress", label: "En Progreso" },
    { value: "sensory_review", label: "Evaluación" },
    { value: "approved", label: "Aprobado" },
    { value: "rejected", label: "Rechazado" },
    { value: "archived", label: "Archivado" },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-lime-500 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">I+D Prototipos</h1>
                <p className="text-sm text-gray-500">{filtered.length} prototipos</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/id/nuevo")}
              className="bg-lime-500 hover:bg-lime-600 text-white rounded-xl h-10 px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nuevo Prototipo</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>

          {/* Search and filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 rounded-xl border-gray-200 h-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-3xl bg-lime-100 flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-8 h-8 text-lime-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {search || statusFilter !== "all" ? "Sin resultados" : "Sin prototipos"}
            </h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter !== "all"
                ? "Intenta con otros filtros"
                : "Crea tu primer prototipo para comenzar"
              }
            </p>
            {!search && statusFilter === "all" && (
              <Button
                onClick={() => router.push("/id/nuevo")}
                className="bg-lime-500 hover:bg-lime-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Prototipo
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map((prototype, index) => (
                <motion.div
                  key={prototype.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PrototypeCard
                    prototype={prototype}
                    onClick={() => router.push(`/id/${prototype.id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
