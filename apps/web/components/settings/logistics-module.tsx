"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Truck, Users, Route, PackageCheck } from "lucide-react"
import { VehiclesSection } from "./logistics/vehicles-section"
import { DriversSection } from "./logistics/drivers-section"
import { RoutesSection } from "./logistics/routes-section"
import { DispatchInventorySection } from "./logistics/dispatch-inventory-section"

export function LogisticsModule() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Configuración Logística
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vehicles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehículos
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Conductores
            </TabsTrigger>
            <TabsTrigger value="routes" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Rutas
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              Despachos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
            <VehiclesSection />
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
            <DriversSection />
          </TabsContent>

          <TabsContent value="routes" className="space-y-4">
            <RoutesSection />
          </TabsContent>

          <TabsContent value="dispatch" className="space-y-4">
            <DispatchInventorySection />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}