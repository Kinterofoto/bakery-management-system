"use client"

import { useState } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Settings, Video, Search, Edit, Trash2, Plus, CheckCircle, AlertCircle, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AVAILABLE_MODULES } from "@/lib/modules"
import { useVideoTutorial } from "@/hooks/use-video-tutorials"
import { VideoConfigModal } from "@/components/shared/VideoConfigModal"
import { UsersManagementModule } from "@/components/settings/users-management-module"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useEffect } from "react"
import type { VideoTutorial } from "@/lib/database.types"

interface ModuleWithVideo {
  id: string
  title: string
  href: string
  video?: VideoTutorial | null
}

export default function GlobalSettingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [allVideos, setAllVideos] = useState<VideoTutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<ModuleWithVideo | null>(null)

  // Fetch all video tutorials
  const fetchAllVideos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .order('module_path')

      if (error) throw error
      setAllVideos(data || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
      toast.error('Error al cargar los tutoriales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllVideos()
  }, [])

  // Combine modules with their videos
  const modulesWithVideos: ModuleWithVideo[] = AVAILABLE_MODULES.map(module => ({
    id: module.id,
    title: module.title,
    href: module.href,
    video: allVideos.find(v => v.module_path === module.href)
  }))

  // Filter modules based on search
  const filteredModules = modulesWithVideos.filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.href.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConfigureVideo = (module: ModuleWithVideo) => {
    setSelectedModule(module)
    setConfigModalOpen(true)
  }

  const handleSaveVideo = async (data: { video_url: string; title?: string; description?: string }) => {
    if (!selectedModule) return

    try {
      const { data: existingVideo } = await supabase
        .from('video_tutorials')
        .select('id')
        .eq('module_path', selectedModule.href)
        .maybeSingle()

      if (existingVideo) {
        // Update existing video
        const { error } = await supabase
          .from('video_tutorials')
          .update(data)
          .eq('module_path', selectedModule.href)

        if (error) throw error
        toast.success('Tutorial actualizado exitosamente')
      } else {
        // Insert new video
        const user = (await supabase.auth.getUser()).data.user
        if (!user) throw new Error('Usuario no autenticado')

        const { error } = await supabase
          .from('video_tutorials')
          .insert({
            ...data,
            module_path: selectedModule.href,
            created_by: user.id
          })

        if (error) throw error
        toast.success('Tutorial creado exitosamente')
      }

      await fetchAllVideos()
    } catch (error) {
      console.error('Error saving video:', error)
      toast.error('Error al guardar el tutorial')
      throw error
    }
  }

  const handleDeleteVideo = async () => {
    if (!selectedModule?.video) return

    try {
      const { error } = await supabase
        .from('video_tutorials')
        .delete()
        .eq('module_path', selectedModule.href)

      if (error) throw error

      toast.success('Tutorial eliminado exitosamente')
      await fetchAllVideos()
    } catch (error) {
      console.error('Error deleting video:', error)
      toast.error('Error al eliminar el tutorial')
      throw error
    }
  }

  const statsCount = {
    total: modulesWithVideos.length,
    withVideo: modulesWithVideos.filter(m => m.video).length,
    withoutVideo: modulesWithVideos.filter(m => !m.video).length,
  }

  return (
    <RouteGuard requiredRoles={['super_admin']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Configuraciones Globales
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra parámetros globales del sistema, tutoriales de video y usuarios
              </p>
            </div>
            <div className="bg-slate-500/15 backdrop-blur-sm rounded-xl p-3">
              <Settings className="w-8 h-8 text-slate-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tabs */}
          <Tabs defaultValue="videos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-fit">
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Tutoriales de Video
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuarios
              </TabsTrigger>
            </TabsList>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Módulos</p>
                    <p className="text-3xl font-bold text-gray-900">{statsCount.total}</p>
                  </div>
                  <Settings className="w-10 h-10 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Con Tutorial</p>
                    <p className="text-3xl font-bold text-green-600">{statsCount.withVideo}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sin Tutorial</p>
                    <p className="text-3xl font-bold text-orange-600">{statsCount.withoutVideo}</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tutoriales de Video Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Tutoriales de Video por Módulo
              </CardTitle>
              <CardDescription>
                Configura los tutoriales en video para cada módulo del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar módulo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Modules Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Módulo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Ruta
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Cargando...
                        </td>
                      </tr>
                    ) : filteredModules.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No se encontraron módulos
                        </td>
                      </tr>
                    ) : (
                      filteredModules.map((module) => (
                        <tr
                          key={module.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {module.title}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {module.href}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {module.video ? (
                              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Configurado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Sin configurar
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant={module.video ? "outline" : "default"}
                              onClick={() => handleConfigureVideo(module)}
                            >
                              {module.video ? (
                                <>
                                  <Edit className="w-3 h-3 mr-1" />
                                  Editar
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  Configurar
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <UsersManagementModule />
            </TabsContent>
          </Tabs>
        </div>

        {/* Config Modal */}
        {selectedModule && (
          <VideoConfigModal
            open={configModalOpen}
            onOpenChange={setConfigModalOpen}
            onSave={handleSaveVideo}
            onDelete={selectedModule.video ? handleDeleteVideo : undefined}
            existingVideo={selectedModule.video || null}
            modulePath={selectedModule.href}
          />
        )}
      </div>
    </RouteGuard>
  )
}
