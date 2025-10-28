"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, ClipboardList, TrendingUp, Calendar as CalendarIcon, Filter, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { VisitCard } from "@/components/visitas/VisitCard"
import { useStoreVisits } from "@/hooks/use-store-visits"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useAuth } from "@/contexts/AuthContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function VisitasPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { visits, loading } = useStoreVisits()
  const { clients } = useClients()
  const { branches } = useBranches()

  const [filteredVisits, setFilteredVisits] = useState(visits)
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const [selectedBranch, setSelectedBranch] = useState<string>("all")

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Apply filters
  useEffect(() => {
    let filtered = [...visits]

    if (selectedClient !== "all") {
      filtered = filtered.filter(v => v.client_id === selectedClient)
    }

    if (selectedBranch !== "all") {
      filtered = filtered.filter(v => v.branch_id === selectedBranch)
    }

    setFilteredVisits(filtered)
  }, [visits, selectedClient, selectedBranch])

  // Calculate stats
  const totalVisits = visits.length
  const averageScore = visits.length > 0
    ? (visits.reduce((sum, v) => sum + (v.average_score || 0), 0) / visits.length)
    : 0

  const thisWeekVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return visitDate >= weekAgo
  }).length

  const availableBranches = selectedClient !== "all"
    ? branches.filter(b => b.client_id === selectedClient)
    : branches

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sin Sidebar */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  PastryApp
                </h1>
              </Link>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Visitas a Tiendas
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role?.replace("_", " ")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
            <ClipboardList className="h-10 w-10 text-teal-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Visitas a Tiendas
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Registra y evalúa el estado de tus productos en puntos de venta
          </p>
          <Button
            onClick={() => router.push("/visitas/nueva")}
            size="lg"
            className="bg-teal-600 hover:bg-teal-700 h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-6 w-6 mr-2" />
            Nueva Visita
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Total Visitas
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {totalVisits}
                  </p>
                </div>
                <div className="p-4 bg-blue-100 rounded-full">
                  <ClipboardList className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Calificación Promedio
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {averageScore.toFixed(1)}
                  </p>
                </div>
                <div className="p-4 bg-yellow-100 rounded-full">
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Esta Semana
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {thisWeekVisits}
                  </p>
                </div>
                <div className="p-4 bg-green-100 rounded-full">
                  <CalendarIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-2 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filtros:</span>
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full sm:w-64 h-12">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={selectedClient === "all"}
              >
                <SelectTrigger className="w-full sm:w-64 h-12">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {availableBranches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(selectedClient !== "all" || selectedBranch !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedClient("all")
                    setSelectedBranch("all")
                  }}
                  className="text-teal-600 hover:text-teal-700"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visits Grid */}
        {filteredVisits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVisits.map(visit => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay visitas registradas
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza registrando tu primera visita a una tienda
              </p>
              <Button
                onClick={() => router.push("/visitas/nueva")}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nueva Visita
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
