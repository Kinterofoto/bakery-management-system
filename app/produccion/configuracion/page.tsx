"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Settings, Package, Clock, Cog } from "lucide-react"
import { WorkCentersConfig } from "@/components/production/config/WorkCentersConfig"
import { ProductivityConfig } from "@/components/production/config/ProductivityConfig"
import { MaterialsConfig } from "@/components/production/config/MaterialsConfig"
import { BillOfMaterialsConfig } from "@/components/production/config/BillOfMaterialsConfig"

export default function ProductionConfigPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4 space-y-6">
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

      <Tabs defaultValue="work-centers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="work-centers" className="flex items-center gap-2">
            <Cog className="w-4 h-4" />
            <span className="hidden sm:inline">Centros</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Materiales</span>
          </TabsTrigger>
          <TabsTrigger value="bom" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">BOM</span>
          </TabsTrigger>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Productividad</span>
          </TabsTrigger>
        </TabsList>

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
                Gestión de Materiales
              </CardTitle>
              <CardDescription>
                Administra el catálogo de materiales y sus unidades de medida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialsConfig />
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

        <TabsContent value="productivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Parámetros de Productividad
              </CardTitle>
              <CardDescription>
                Configura los parámetros teóricos de producción (unidades por hora) por producto y centro de trabajo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductivityConfig />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}