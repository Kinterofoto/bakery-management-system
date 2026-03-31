"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { usePrototypes } from "@/hooks/use-prototypes"
import { useProjects, Project } from "@/hooks/use-projects"
import { PrototypeCard } from "@/components/id/PrototypeCard"
import { PrototypeStatusBadge } from "@/components/id/PrototypeStatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, FlaskConical, Filter, Folder, Video, Check, Copy, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

type PrototypeStatus = 'draft' | 'in_progress' | 'sensory_review' | 'approved' | 'rejected' | 'archived'

export default function IDPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { loading, getPrototypes } = usePrototypes()
  const { getProjects } = useProjects()
  const [prototypes, setPrototypes] = useState<any[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [videoCopied, setVideoCopied] = useState(false)

  const handleCopyVideoLink = () => {
    const url = "https://khwcknapjnhpxfodsahb.supabase.co/storage/v1/object/public/videos/tutorials/id-tutorial.mp4"
    navigator.clipboard.writeText(url)
    setVideoCopied(true)
    toast.success("Link del video copiado al portapapeles")
    setTimeout(() => setVideoCopied(false), 2000)
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [protoData, projectData] = await Promise.all([
      getPrototypes(),
      getProjects(),
    ])
    setPrototypes(protoData)
    setProjects(projectData)
  }

  const filtered = prototypes.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    const matchesProject =
      projectFilter === "all" ||
      (projectFilter === "none" && !p.project_id) ||
      p.project_id === projectFilter
    return matchesSearch && matchesStatus && matchesProject
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

  // Get project name for display on cards
  const projectMap = new Map(projects.map(p => [p.id, p.name]))

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="rounded-xl h-9 w-9 sm:hidden shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Button>
              <div className="w-10 h-10 rounded-2xl bg-lime-500 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">I+D Prototipos</h1>
                <p className="text-sm text-gray-500">{filtered.length} prototipos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopyVideoLink}
                variant="outline"
                className="rounded-xl h-10 px-3 sm:px-3"
                title="Video Tutorial"
              >
                {videoCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500 sm:mr-2" />
                    <span className="hidden sm:inline">Copiado</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Video Tutorial</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => router.push("/id/nuevo")}
                className="bg-lime-500 hover:bg-lime-600 text-white rounded-xl h-10 w-10 sm:w-auto sm:px-4 p-0 sm:p-2"
                title="Nuevo Prototipo"
              >
                <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Prototipo</span>
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex gap-2 flex-wrap overflow-hidden">
            <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
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
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
              >
                <option value="all">Todos los proyectos</option>
                <option value="none">Sin proyecto</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
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
              {search || statusFilter !== "all" || projectFilter !== "all" ? "Sin resultados" : "Sin prototipos"}
            </h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter !== "all" || projectFilter !== "all"
                ? "Intenta con otros filtros"
                : "Crea tu primer prototipo para comenzar"
              }
            </p>
            {!search && statusFilter === "all" && projectFilter === "all" && (
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
          <div className="grid gap-2 sm:gap-3 overflow-hidden">
            <AnimatePresence>
              {filtered.map((prototype, index) => (
                <motion.div
                  key={prototype.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="min-w-0"
                >
                  <PrototypeCard
                    prototype={prototype}
                    projectName={projectMap.get(prototype.project_id) || undefined}
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
