"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RouteGuard } from "@/components/auth/RouteGuard"
import {
  Package,
  Users,
  Link2,
  Search,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Mail,
  Phone,
  MapPin,
  Building2
} from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useRawMaterials } from "@/hooks/use-raw-materials"
import { useMaterialSuppliers } from "@/hooks/use-material-suppliers"
import { useToast } from "@/components/ui/use-toast"
import { SupplierDialog } from "@/components/compras/SupplierDialog"
import { MaterialAssignmentDialog } from "@/components/compras/MaterialAssignmentDialog"

type TabType = "suppliers" | "materials" | "assignments"

export default function ParametrizacionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("suppliers")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<any>(null)

  const { suppliers, searchSuppliers, toggleSupplierStatus, deleteSupplier, getSupplierStats, loading } = useSuppliers()
  const { materials, searchMaterials: searchRawMaterials, toggleMaterialStatus, getMaterialStats, loading: loadingMaterials } = useRawMaterials()
  const { materialSuppliers, searchMaterialSuppliers, deleteMaterialSupplier, toggleMaterialSupplierStatus, loading: loadingAssignments } = useMaterialSuppliers()
  const { toast } = useToast()

  const stats = getSupplierStats()
  const materialStats = getMaterialStats()
  const filteredSuppliers = searchQuery ? searchSuppliers(searchQuery) : suppliers
  const filteredMaterials = searchQuery ? searchRawMaterials(searchQuery) : materials
  const filteredAssignments = searchQuery ? searchMaterialSuppliers(searchQuery) : materialSuppliers

  const handleCreateSupplier = () => {
    setEditingSupplier(null)
    setShowSupplierDialog(true)
  }

  const handleCreateAssignment = () => {
    setEditingAssignment(null)
    setShowAssignmentDialog(true)
  }

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment)
    setShowAssignmentDialog(true)
  }

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier)
    setShowSupplierDialog(true)
  }

  const handleToggleStatus = async (supplier: any) => {
    const success = await toggleSupplierStatus(supplier.id, supplier.status)
    if (success) {
      toast({
        title: "Estado actualizado",
        description: `El proveedor ha sido ${supplier.status === 'active' ? 'desactivado' : 'activado'}`,
      })
    }
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm("¿Estás seguro de eliminar este proveedor? Esta acción no se puede deshacer.")) return

    const success = await deleteSupplier(supplierId)
    if (success) {
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor ha sido eliminado exitosamente",
      })
    }
  }

  const handleToggleMaterialStatus = async (material: any) => {
    const success = await toggleMaterialStatus(material.id, material.is_active)
    if (success) {
      toast({
        title: "Estado actualizado",
        description: `El material ha sido ${material.is_active ? 'desactivado' : 'activado'}`,
      })
    }
  }

  const handleToggleAssignmentStatus = async (assignment: any) => {
    const success = await toggleMaterialSupplierStatus(assignment.id, assignment.status)
    if (success) {
      toast({
        title: "Estado actualizado",
        description: `La asignación ha sido ${assignment.status === 'active' ? 'desactivada' : 'activada'}`,
      })
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta asignación? Esta acción no se puede deshacer.")) return

    const success = await deleteMaterialSupplier(assignmentId)
    if (success) {
      toast({
        title: "Asignación eliminada",
        description: "La asignación ha sido eliminada exitosamente",
      })
    }
  }

  if (loading || loadingMaterials || loadingAssignments) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Parametrización</h1>
              <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                Configura materiales, proveedores y precios
              </p>
            </div>
          </div>

          {/* Tabs - Liquid Glass */}
          <div className="
            bg-white/70 dark:bg-black/50
            backdrop-blur-xl
            border border-white/20 dark:border-white/10
            rounded-2xl
            shadow-lg shadow-black/5
            p-2
            flex gap-2
          ">
            <button
              onClick={() => setActiveTab("suppliers")}
              className={`
                flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${activeTab === "suppliers"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/5"
                }
              `}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Proveedores
            </button>
            <button
              onClick={() => setActiveTab("materials")}
              className={`
                flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${activeTab === "materials"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/5"
                }
              `}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Materiales
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`
                flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${activeTab === "assignments"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/5"
                }
              `}
            >
              <Link2 className="w-4 h-4 inline mr-2" />
              Asignaciones
            </button>
          </div>

          {/* Suppliers Tab Content */}
          {activeTab === "suppliers" && (
            <div className="space-y-6">

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="
                  bg-white/70 dark:bg-black/50
                  backdrop-blur-xl
                  border border-white/20 dark:border-white/10
                  rounded-2xl
                  shadow-lg shadow-black/5
                  p-6
                ">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Proveedores</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {stats.totalSuppliers}
                  </p>
                </div>
                <div className="
                  bg-white/70 dark:bg-black/50
                  backdrop-blur-xl
                  border border-white/20 dark:border-white/10
                  rounded-2xl
                  shadow-lg shadow-black/5
                  p-6
                ">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</p>
                  <p className="text-3xl font-semibold text-green-600 mt-2">
                    {stats.activeSuppliers}
                  </p>
                </div>
                <div className="
                  bg-white/70 dark:bg-black/50
                  backdrop-blur-xl
                  border border-white/20 dark:border-white/10
                  rounded-2xl
                  shadow-lg shadow-black/5
                  p-6
                ">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactivos</p>
                  <p className="text-3xl font-semibold text-gray-500 mt-2">
                    {stats.inactiveSuppliers}
                  </p>
                </div>
              </div>

              {/* Search and Actions */}
              <div className="
                bg-white/70 dark:bg-black/50
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                shadow-lg shadow-black/5
                p-6
              ">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Buscar proveedores por nombre, NIT, contacto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="
                        pl-10
                        bg-white/50 dark:bg-black/30
                        backdrop-blur-md
                        border-gray-200/50 dark:border-white/10
                        rounded-xl
                        focus:ring-2 focus:ring-blue-500/50
                        focus:border-blue-500/50
                      "
                    />
                  </div>
                  <Button
                    onClick={handleCreateSupplier}
                    className="
                      bg-blue-500
                      text-white
                      font-semibold
                      px-6 py-3
                      rounded-xl
                      shadow-md shadow-blue-500/30
                      hover:bg-blue-600
                      hover:shadow-lg hover:shadow-blue-500/40
                      active:scale-95
                      transition-all duration-150
                    "
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Proveedor
                  </Button>
                </div>
              </div>

              {/* Suppliers List */}
              <div className="
                bg-white/60 dark:bg-black/40
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                overflow-hidden
                shadow-lg shadow-black/5
              ">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Empresa
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          NIT
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Contacto
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/30 dark:divide-white/10">
                      {filteredSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No se encontraron proveedores
                          </td>
                        </tr>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <tr
                            key={supplier.id}
                            className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {supplier.company_name}
                                </p>
                                {supplier.address && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {supplier.address}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                {supplier.nit}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {supplier.contact_person_name && (
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {supplier.contact_person_name}
                                  </p>
                                )}
                                {supplier.contact_phone && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {supplier.contact_phone}
                                  </p>
                                )}
                                {supplier.contact_email && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {supplier.contact_email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                className={`
                                  ${supplier.status === 'active'
                                    ? 'bg-green-500/20 text-green-600 border-green-500/30'
                                    : 'bg-gray-500/20 text-gray-600 border-gray-500/30'
                                  }
                                `}
                              >
                                {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSupplier(supplier)}
                                  className="hover:bg-blue-500/10"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(supplier)}
                                  className={`
                                    ${supplier.status === 'active'
                                      ? 'hover:bg-orange-500/10 text-orange-600'
                                      : 'hover:bg-green-500/10 text-green-600'
                                    }
                                  `}
                                >
                                  {supplier.status === 'active' ? (
                                    <PowerOff className="w-4 h-4" />
                                  ) : (
                                    <Power className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSupplier(supplier.id)}
                                  className="hover:bg-red-500/10 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Materials Tab */}
          {activeTab === "materials" && (
            <div className="space-y-6">

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Materiales</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">{materialStats.totalMaterials}</p>
                </div>
                <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</p>
                  <p className="text-3xl font-semibold text-green-600 mt-2">{materialStats.activeMaterials}</p>
                </div>
                <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactivos</p>
                  <p className="text-3xl font-semibold text-gray-500 mt-2">{materialStats.inactiveMaterials}</p>
                </div>
              </div>

              {/* Search */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Buscar materiales por nombre, código..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Materials List */}
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Material</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Unidad</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/30 dark:divide-white/10">
                      {filteredMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No se encontraron materiales con categoría MP
                          </td>
                        </tr>
                      ) : (
                        filteredMaterials.map((material) => (
                          <tr key={material.id} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{material.name}</p>
                                {material.description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{material.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{material.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{material.unit || '-'}</td>
                            <td className="px-6 py-4">
                              <Badge className={`${material.is_active !== false ? 'bg-green-500/20 text-green-600 border-green-500/30' : 'bg-gray-500/20 text-gray-600 border-gray-500/30'}`}>
                                {material.is_active !== false ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleToggleMaterialStatus(material)} className={`${material.is_active !== false ? 'hover:bg-orange-500/10 text-orange-600' : 'hover:bg-green-500/10 text-green-600'}`}>
                                  {material.is_active !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-6">

              {/* Search and Actions */}
              <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Buscar asignaciones por material o proveedor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    />
                  </div>
                  <Button
                    onClick={handleCreateAssignment}
                    className="bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-purple-500/30 hover:bg-purple-600 hover:shadow-lg hover:shadow-purple-500/40 active:scale-95 transition-all duration-150"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Asignación
                  </Button>
                </div>
              </div>

              {/* Assignments List */}
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Material</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proveedor</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Presentación</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Precio</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/30 dark:divide-white/10">
                      {filteredAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No se encontraron asignaciones. Crea una para comenzar.
                          </td>
                        </tr>
                      ) : (
                        filteredAssignments.map((assignment) => (
                          <tr key={assignment.id} className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{assignment.material?.name || 'N/A'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{assignment.material?.code || ''}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{assignment.supplier?.company_name || 'N/A'}</p>
                                {assignment.is_preferred && (
                                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs mt-1">Preferido</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{assignment.presentation || '-'}</p>
                              {assignment.packaging_unit && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Embalaje: {assignment.packaging_unit}</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900 dark:text-white">${assignment.unit_price?.toLocaleString('es-CO')}</p>
                              {assignment.lead_time_days && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{assignment.lead_time_days} días entrega</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={`${assignment.status === 'active' ? 'bg-green-500/20 text-green-600 border-green-500/30' : 'bg-gray-500/20 text-gray-600 border-gray-500/30'}`}>
                                {assignment.status === 'active' ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditAssignment(assignment)} className="hover:bg-purple-500/10">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleToggleAssignmentStatus(assignment)} className={`${assignment.status === 'active' ? 'hover:bg-orange-500/10 text-orange-600' : 'hover:bg-green-500/10 text-green-600'}`}>
                                  {assignment.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(assignment.id)} className="hover:bg-red-500/10 text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Supplier Dialog */}
      {showSupplierDialog && (
        <SupplierDialog
          supplier={editingSupplier}
          onClose={() => {
            setShowSupplierDialog(false)
            setEditingSupplier(null)
          }}
        />
      )}

      {/* Assignment Dialog */}
      {showAssignmentDialog && (
        <MaterialAssignmentDialog
          assignment={editingAssignment}
          onClose={() => {
            setShowAssignmentDialog(false)
            setEditingAssignment(null)
          }}
        />
      )}

    </RouteGuard>
  )
}
