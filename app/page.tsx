"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Users, ArrowRight, BarChart3, Calendar, Target, Calculator } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Panadería Industrial
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema integral de gestión empresarial. Selecciona el módulo que necesitas utilizar.
          </p>
        </div>

        {/* Module Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          
          {/* Orders Management Module */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-8 group-hover:bg-blue-600 transition-colors">
                  <Package className="h-12 w-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Gestión de Pedidos
                </h2>
                
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Administra todo el ciclo de vida de los pedidos: desde la recepción hasta la entrega, 
                  incluyendo revisión, despacho y rutas de distribución.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard completo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Gestión de rutas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>Control de inventario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Multi-usuario</span>
                  </div>
                </div>

                <Link href="/orders">
                  <Button size="lg" className="w-full text-lg py-6 group-hover:bg-blue-600">
                    Acceder al Sistema de Pedidos
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* CRM Module */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 group-hover:bg-green-600 transition-colors">
                  <Users className="h-12 w-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  CRM Ventas
                </h2>
                
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Gestiona tu pipeline de ventas con una interfaz intuitiva. 
                  Visualiza oportunidades en formato Kanban y calendario para maximizar conversiones.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Pipeline visual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Vista calendario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>Métricas de valor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Gestión de leads</span>
                  </div>
                </div>

                <Link href="/crm">
                  <Button size="lg" variant="outline" className="w-full text-lg py-6 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white group-hover:border-green-600">
                    Acceder al CRM
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Module */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center mb-8 group-hover:bg-purple-600 transition-colors">
                  <Calculator className="h-12 w-12 text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  CountPro Inventarios
                </h2>
                
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Aplicación móvil optimizada para inventarios con interfaz tipo calculadora. 
                  Sistema de doble conteo y conciliación automática para máxima precisión.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span>Interfaz calculadora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>Doble verificación</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Conciliación automática</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Búsqueda ultrarrápida</span>
                  </div>
                </div>

                <Link href="/inventory">
                  <Button size="lg" variant="outline" className="w-full text-lg py-6 border-2 border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white group-hover:border-purple-600">
                    Acceder a CountPro
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-16">
          <p className="text-gray-500">
            ¿Necesitas ayuda? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
