"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, Settings, Edit, Save, RefreshCw } from "lucide-react"
import { useSystemConfig } from "@/hooks/use-system-config"
import { useToast } from "@/hooks/use-toast"

export function SystemConfigModule() {
  const { configs, loading, updateConfig, getConfigValue, refetch } = useSystemConfig()
  const { toast } = useToast()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<any | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEditConfig = (config: any) => {
    setSelectedConfig(config)
    setEditValue(config.config_value || "")
    setIsEditDialogOpen(true)
  }

  const handleUpdateConfig = async () => {
    if (!selectedConfig) return

    setIsSubmitting(true)
    try {
      await updateConfig(selectedConfig.config_key, editValue)
      
      toast({
        title: "Éxito",
        description: "Configuración actualizada correctamente",
      })

      setIsEditDialogOpen(false)
      setSelectedConfig(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetEditForm = () => {
    setSelectedConfig(null)
    setEditValue("")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando configuración del sistema...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Separate configurations by category
  const invoiceConfigs = configs.filter(c => c.config_key.includes("invoice"))
  const woConfigs = configs.filter(c => c.config_key.startsWith("wo_"))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>
          <p className="text-gray-600">Administra parámetros globales y configuración de World Office</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Invoice Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Facturación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoiceConfigs.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones</h3>
              <p className="text-gray-600">Las configuraciones de facturación aparecerán aquí.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Valor Actual</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.config_key}</TableCell>
                    <TableCell>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {config.config_value || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {config.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditConfig(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* World Office Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de World Office
          </CardTitle>
        </CardHeader>
        <CardContent>
          {woConfigs.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones</h3>
              <p className="text-gray-600">Las configuraciones de World Office aparecerán aquí.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Valor Actual</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {woConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {config.config_key.replace('wo_', '').replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {config.config_value || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {config.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditConfig(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Configuration Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuración</DialogTitle>
            <DialogDescription>
              Modifica el valor de la configuración del sistema.
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="grid gap-4 py-4">
              <div>
                <Label>Parámetro</Label>
                <Input 
                  value={selectedConfig.config_key} 
                  disabled 
                  readOnly 
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input 
                  value={selectedConfig.description || ""} 
                  disabled 
                  readOnly 
                />
              </div>
              <div>
                <Label>Valor *</Label>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Ingresa el nuevo valor"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetEditForm()
                    setIsEditDialogOpen(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpdateConfig} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}