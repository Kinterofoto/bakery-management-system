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
      requiredRoles={['super_admin', 'administrator', 'commercial']}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header - Mobile optimized */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Administra clientes, productos y configuraciones logísticas</p>
            </div>

            {/* Tabs - Mobile optimized */}
            <Tabs defaultValue="clients" className="space-y-4 sm:space-y-6">
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:w-auto h-auto p-1 gap-1">
                  <TabsTrigger
                    value="clients"
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span>Clientes</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="products"
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Package className="h-4 w-4 flex-shrink-0" />
                    <span>Productos</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="logistics"
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Truck className="h-4 w-4 flex-shrink-0" />
                    <span>Logística</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="system"
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Cog className="h-4 w-4 flex-shrink-0" />
                    <span>Sistema</span>
                  </TabsTrigger>
                </TabsList>
              </div>

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