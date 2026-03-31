"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePrototypes } from "@/hooks/use-prototypes"
import { useProjects, Project } from "@/hooks/use-projects"
import { useMaterials } from "@/hooks/use-materials"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, FlaskConical, Search, FolderPlus, Folder } from "lucide-react"
import { toast } from "sonner"

export default function NuevoPrototipoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50/50" />}>
      <NuevoPrototipoContent />
    </Suspense>
  )
}

function NuevoPrototipoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategory = (searchParams.get("category") as "PT" | "PP") || "PT"
  const initialProjectId = searchParams.get("projectId")
  const parentPrototypeId = searchParams.get("parentId")

  const { createPrototype, generateCode, loading } = usePrototypes()
  const { getProjects, createProject, loading: projectsLoading } = useProjects()
  const { materials } = useMaterials()

  // Category state
  const [productCategory, setProductCategory] = useState<"PT" | "PP">(initialCategory)

  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [projectMode, setProjectMode] = useState<"new" | "existing" | "none">("none")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [searchProject, setSearchProject] = useState("")

  // Prototype state
  const [isNew, setIsNew] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [objectives, setObjectives] = useState("")
  const [code, setCode] = useState("")
  const [searchProduct, setSearchProduct] = useState("")

  useEffect(() => {
    generateCode().then(setCode)
    getProjects().then(setProjects)
  }, [generateCode, getProjects])

  // Pre-select project from URL param
  useEffect(() => {
    if (initialProjectId) {
      setProjectMode("existing")
      setSelectedProjectId(initialProjectId)
    }
  }, [initialProjectId])

  const categoryProducts = materials.filter(m => m.category === productCategory)
  const filteredProducts = categoryProducts.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  )
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchProject.toLowerCase())
  )

  const handleCreate = async () => {
    if (!productName.trim()) {
      toast.error("Ingresa el nombre del producto")
      return
    }

    let projectId: string | null = selectedProjectId

    // Create new project if needed
    if (projectMode === "new") {
      if (!newProjectName.trim()) {
        toast.error("Ingresa el nombre del proyecto")
        return
      }
      const project = await createProject({
        name: newProjectName,
        description: newProjectDescription || null,
      })
      if (!project) return
      projectId = project.id
    }

    const proto = await createPrototype({
      product_id: isNew ? null : selectedProductId,
      product_name: productName,
      product_category: productCategory,
      is_new_product: isNew,
      code,
      status: "draft",
      description: description || null,
      objectives: objectives || null,
      project_id: projectId,
      parent_prototype_id: parentPrototypeId || null,
      pp_status: productCategory === "PP" ? "pending" : null,
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
              <p className="text-xs text-gray-500">{productCategory === "PT" ? "Producto Terminado" : "Producto en Proceso"}</p>
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

        {/* Category selector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Tipo de Prototipo</p>
          <div className="flex gap-2">
            <Button
              variant={productCategory === "PT" ? "default" : "outline"}
              onClick={() => setProductCategory("PT")}
              className="flex-1 rounded-xl"
              size="sm"
              disabled={!!parentPrototypeId}
            >
              Producto Terminado
            </Button>
            <Button
              variant={productCategory === "PP" ? "default" : "outline"}
              onClick={() => setProductCategory("PP")}
              className="flex-1 rounded-xl"
              size="sm"
              disabled={!!parentPrototypeId}
            >
              Producto en Proceso
            </Button>
          </div>
          {parentPrototypeId && (
            <p className="text-xs text-gray-400">
              Categoría fijada porque este prototipo se crea desde un PT padre.
            </p>
          )}
        </div>

        {/* Project selection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Proyecto</p>
          {parentPrototypeId && selectedProjectId ? (
            <div>
              <p className="text-sm text-gray-600">
                {projects.find(p => p.id === selectedProjectId)?.name || "Proyecto seleccionado"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Proyecto heredado del prototipo padre.
              </p>
            </div>
          ) : (
          <div className="flex gap-2">
            <Button
              variant={projectMode === "none" ? "default" : "outline"}
              onClick={() => {
                setProjectMode("none")
                setSelectedProjectId(null)
              }}
              className="flex-1 rounded-xl text-xs"
              size="sm"
            >
              Sin Proyecto
            </Button>
            <Button
              variant={projectMode === "existing" ? "default" : "outline"}
              onClick={() => setProjectMode("existing")}
              className="flex-1 rounded-xl text-xs"
              size="sm"
            >
              <Folder className="w-3.5 h-3.5 mr-1" />
              Existente
            </Button>
            <Button
              variant={projectMode === "new" ? "default" : "outline"}
              onClick={() => {
                setProjectMode("new")
                setSelectedProjectId(null)
              }}
              className="flex-1 rounded-xl text-xs"
              size="sm"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1" />
              Nuevo
            </Button>
          </div>
          )}

          {!parentPrototypeId && projectMode === "existing" && (
            <div className="space-y-2">
              {projects.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchProject}
                    onChange={e => setSearchProject(e.target.value)}
                    placeholder="Buscar proyecto..."
                    className="rounded-xl pl-10"
                  />
                </div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedProjectId === p.id
                        ? "bg-lime-50 text-lime-700 border border-lime-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    {p.description && (
                      <span className="text-xs text-gray-400 ml-2">{p.description}</span>
                    )}
                  </button>
                ))}
                {filteredProjects.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No hay proyectos. Crea uno nuevo.
                  </p>
                )}
              </div>
            </div>
          )}

          {!parentPrototypeId && projectMode === "new" && (
            <div className="space-y-2">
              <Input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Nombre del proyecto"
                className="rounded-xl"
              />
              <Textarea
                value={newProjectDescription}
                onChange={e => setNewProjectDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                className="rounded-xl text-sm"
                rows={2}
              />
            </div>
          )}
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
                onChange={e => setProductName(e.target.value.toUpperCase())}
                placeholder="Ej: PAN DE CHOCOLATE PREMIUM"
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
          disabled={loading || projectsLoading || !productName.trim() || (projectMode === "new" && !newProjectName.trim()) || (projectMode === "existing" && !selectedProjectId)}
          className="w-full bg-lime-500 hover:bg-lime-600 text-white rounded-xl h-12 text-base"
        >
          {loading || projectsLoading ? "Creando..." : "Crear Prototipo"}
        </Button>
      </div>
    </div>
  )
}
