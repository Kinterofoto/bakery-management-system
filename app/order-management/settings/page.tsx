"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/layout/sidebar"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { Users, Package, Settings, Truck, Cog } from "lucide-react"
import { AdvancedClientsModule } from "@/components/settings/advanced-clients-module"
import { ProductsModule } from "@/components/settings/products-module"
import { LogisticsModule } from "@/components/settings/logistics-module"
import { SystemConfigModule } from "@/components/settings/system-config-module"

export default function SettingsPage() {
  return (
    <RouteGuard
      requiredPermissions={['order_management_settings']}
      requiredRoles={['administrator', 'commercial']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
              </div>
              <p className="text-gray-600">Administra clientes, productos y configuraciones logísticas del sistema</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="clients" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-fit">
                <TabsTrigger value="clients" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clientes
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos
                </TabsTrigger>
                <TabsTrigger value="logistics" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Logística
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Cog className="h-4 w-4" />
                  Sistema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="clients" className="space-y-6">
                <AdvancedClientsModule />
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <ProductsModule />
              </TabsContent>

              <TabsContent value="logistics" className="space-y-6">
                <LogisticsModule />
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                <SystemConfigModule />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
    </RouteGuard>
  )
}