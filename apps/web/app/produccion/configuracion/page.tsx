"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Settings, Package, Cog, Workflow, Box, Link2, SlidersHorizontal } from "lucide-react"
import { OperationsConfig } from "@/components/production/config/OperationsConfig"
import { WorkCentersConfig } from "@/components/production/config/WorkCentersConfig"
import { MaterialsConfig } from "@/components/production/config/MaterialsConfig"
import { ProductsConfig } from "@/components/production/config/ProductsConfig"
import { BillOfMaterialsConfig } from "@/components/production/config/BillOfMaterialsConfig"
import { OperacionesConfig } from "@/components/production/config/OperacionesConfig"
import { useWcInventoryEnabled } from "@/hooks/use-wc-inventory-enabled"
import { toast } from "sonner"

function ProductionConfigContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "operations"

  const {
    enabled: wcInventoryEnabled,
    loading: wcInventoryLoading,
    updating: wcInventoryUpdating,
    setEnabled: setWcInventoryEnabled,
  } = useWcInventoryEnabled()

  const handleTabChange = useCallback((value: string) => {
    router.replace(`/produccion/configuracion?tab=${value}`, { scroll: false })
  }, [router])

  const handleToggleWcInventory = useCallback(async (next: boolean) => {
    try {
      await setWcInventoryEnabled(next)
      toast.success(
        next
          ? "Inventario por centro de trabajo activado"
          : "Inventario por centro desactivado. Los descuentos se harán automáticamente desde WH1-RECEIVING al finalizar cada producción."
      )
    } catch {
      toast.error("No se pudo actualizar la configuración")
    }
  }, [setWcInventoryEnabled])

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/produccion")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configuración de Producción</h1>
          <p className="text-gray-600">Gestiona la configuración del módulo de producción</p>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
          <TabsList className="flex w-max min-w-full sm:grid sm:grid-cols-7 h-auto p-1">
            <TabsTrigger value="operations" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <Workflow className="w-4 h-4" />
              <span>Operaciones</span>
            </TabsTrigger>
            <TabsTrigger value="work-centers" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <Cog className="w-4 h-4" />
              <span>Centros</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <Package className="w-4 h-4" />
              <span>Materiales</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <Box className="w-4 h-4" />
              <span>Productos</span>
            </TabsTrigger>
            <TabsTrigger value="operaciones" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <Link2 className="w-4 h-4" />
              <span>Asignación</span>
            </TabsTrigger>
            <TabsTrigger value="bom" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <Settings className="w-4 h-4" />
              <span>BOM</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2 py-2 px-3 sm:px-4">
              <SlidersHorizontal className="w-4 h-4" />
              <span>General</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5" />
                Gestión de Operaciones
              </CardTitle>
              <CardDescription>
                Configura las operaciones de producción que se realizan en los centros de trabajo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-centers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="w-5 h-5" />
                Gestión de Centros de Trabajo
              </CardTitle>
              <CardDescription>
                Configura y administra los centros de trabajo donde se realizan las operaciones de producción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkCentersConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Gestión de Materias Primas
              </CardTitle>
              <CardDescription>
                Administra el catálogo de materias primas y sus unidades de medida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialsConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-5 h-5" />
                Gestión de Productos
              </CardTitle>
              <CardDescription>
                Administra productos terminados (PT) y productos en proceso (PP)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductsConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operaciones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Asignación de Operaciones a Productos
              </CardTitle>
              <CardDescription>
                Asigna centros de trabajo a cada producto según la operación que realicen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperacionesConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bill of Materials (BOM)
              </CardTitle>
              <CardDescription>
                Define las listas de materiales necesarios para cada producto con sus equivalencias personalizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillOfMaterialsConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Configuración general del módulo
              </CardTitle>
              <CardDescription>
                Parámetros globales que cambian la forma de operar producción.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="wc-inventory-toggle" className="text-base font-semibold">
                    Inventario por centro de trabajo
                  </Label>
                  <p className="text-sm text-gray-600">
                    <strong>Activado:</strong> el inventario se maneja en cada centro de trabajo. Compras
                    transfiere materiales al centro y los operarios registran manualmente lo que consumen
                    en cada producción.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Desactivado:</strong> no hay inventario por centro ni transferencias. Al finalizar
                    cada producción se descuenta automáticamente el BOM (filtrado por la operación del centro
                    de trabajo) desde la ubicación general de recepción <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">WH1-RECEIVING</code>,
                    multiplicado por las unidades buenas producidas. Las producciones que ya estaban abiertas
                    al cambiar el modo finalizan con la lógica con la que se iniciaron.
                  </p>
                </div>
                <Switch
                  id="wc-inventory-toggle"
                  checked={wcInventoryEnabled}
                  disabled={wcInventoryLoading || wcInventoryUpdating}
                  onCheckedChange={handleToggleWcInventory}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProductionConfigPage() {
  return (
    <Suspense>
      <ProductionConfigContent />
    </Suspense>
  )
}