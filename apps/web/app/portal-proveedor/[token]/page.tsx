"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useSupplierMaterials } from "@/hooks/use-supplier-materials"
import { useSupplierPurchaseOrders } from "@/hooks/use-supplier-purchase-orders"
import { useToast } from "@/components/ui/use-toast"
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Weight,
  Info,
  Check,
  X as CloseIcon,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck
} from "lucide-react"

type DeliveryDays = {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

type MaterialFormData = {
  material_id: string
  material_name: string
  supplier_commercial_name: string
  presentation: string
  unit_price: number
  packaging_weight_grams: number
}

type TabType = "materials" | "orders"

export default function SupplierPortalPage() {
  const params = useParams()
  const token = params.token as string
  const { toast } = useToast()

  const {
    supplier,
    materials,
    allMaterials,
    loading,
    error,
    createMaterial,
    assignMaterial,
    updateMaterialAssignment,
    deleteMaterialAssignment,
    updateDeliveryDays,
    calculatePricePerGram,
  } = useSupplierMaterials(token)

  const {
    purchaseOrders,
    loading: loadingOrders,
    error: ordersError,
    getOrderCompletion,
    getOrderStats
  } = useSupplierPurchaseOrders(token)

  const [activeTab, setActiveTab] = useState<TabType>("materials")
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [showNewMaterialForm, setShowNewMaterialForm] = useState(false)
  const [savingDeliveryDays, setSavingDeliveryDays] = useState(false)

  const [materialFormData, setMaterialFormData] = useState<MaterialFormData>({
    material_id: "",
    material_name: "",
    supplier_commercial_name: "",
    presentation: "",
    unit_price: 0,
    packaging_weight_grams: 0,
  })

  const [newMaterialData, setNewMaterialData] = useState({
    name: "",
    unit: "g",
    description: "",
  })

  const [deliveryDays, setDeliveryDays] = useState<DeliveryDays>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  })

  const dayLabels = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
  }

  // Load delivery days from supplier when data is available
  useEffect(() => {
    if (supplier?.delivery_days) {
      setDeliveryDays(supplier.delivery_days)
    }
  }, [supplier])

  const handleAddMaterial = () => {
    setEditingMaterial(null)
    setMaterialFormData({
      material_id: "",
      material_name: "",
      supplier_commercial_name: "",
      presentation: "",
      unit_price: 0,
      packaging_weight_grams: 0,
    })
    setShowMaterialForm(true)
  }

  const handleEditMaterial = (material: any) => {
    setEditingMaterial(material)
    setMaterialFormData({
      material_id: material.material_id,
      material_name: material.material?.name || "",
      supplier_commercial_name: material.supplier_commercial_name || "",
      presentation: material.presentation || "",
      unit_price: material.unit_price || 0,
      packaging_weight_grams: material.packaging_weight_grams || 0,
    })
    setShowMaterialForm(true)
  }

  const handleSaveMaterial = async () => {
    if (!supplier) return

    if (!materialFormData.material_id || !materialFormData.presentation || materialFormData.unit_price <= 0 || materialFormData.packaging_weight_grams <= 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      })
      return
    }

    let success = false

    if (editingMaterial) {
      // Update existing material
      success = await updateMaterialAssignment(editingMaterial.id, {
        supplier_commercial_name: materialFormData.supplier_commercial_name || null,
        presentation: materialFormData.presentation,
        unit_price: materialFormData.unit_price,
        packaging_weight_grams: materialFormData.packaging_weight_grams,
      })
    } else {
      // Assign new material
      success = await assignMaterial({
        material_id: materialFormData.material_id,
        supplier_id: supplier.id,
        supplier_commercial_name: materialFormData.supplier_commercial_name || null,
        presentation: materialFormData.presentation,
        unit_price: materialFormData.unit_price,
        packaging_weight_grams: materialFormData.packaging_weight_grams,
        status: "active",
      })
    }

    if (success) {
      toast({
        title: "Material guardado",
        description: editingMaterial ? "El material ha sido actualizado" : "El material ha sido asignado",
      })
      setShowMaterialForm(false)
      setEditingMaterial(null)
    }
  }

  const handleDeleteMaterial = async (assignmentId: string) => {
    if (!confirm("¿Estás seguro de eliminar este material?")) return

    const success = await deleteMaterialAssignment(assignmentId)
    if (success) {
      toast({
        title: "Material eliminado",
        description: "El material ha sido eliminado de tu lista",
      })
    }
  }

  const handleCreateNewMaterial = async () => {
    if (!newMaterialData.name) {
      toast({
        title: "Error",
        description: "El nombre del material es requerido",
        variant: "destructive"
      })
      return
    }

    const newMaterial = await createMaterial(newMaterialData)
    if (newMaterial) {
      toast({
        title: "Material creado",
        description: "El material ha sido creado exitosamente",
      })
      setShowNewMaterialForm(false)
      setNewMaterialData({
        name: "",
        unit: "g",
        description: "",
      })
      // Auto-select the newly created material
      setMaterialFormData(prev => ({
        ...prev,
        material_id: newMaterial.id,
        material_name: newMaterial.name,
      }))
    }
  }

  const handleDayToggle = (day: keyof DeliveryDays) => {
    setDeliveryDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }))
  }

  const handleSaveDeliveryDays = async () => {
    setSavingDeliveryDays(true)
    const success = await updateDeliveryDays(deliveryDays)
    setSavingDeliveryDays(false)

    if (success) {
      toast({
        title: "Días de entrega actualizados",
        description: "Tus días de entrega han sido guardados",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pendiente',
          className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
        }
      case 'ordered':
        return {
          icon: FileText,
          label: 'Ordenado',
          className: 'bg-blue-500/20 text-blue-600 border-blue-500/30'
        }
      case 'partially_received':
        return {
          icon: Truck,
          label: 'Parcialmente Recibido',
          className: 'bg-purple-500/20 text-purple-600 border-purple-500/30'
        }
      case 'received':
        return {
          icon: CheckCircle,
          label: 'Recibido',
          className: 'bg-green-500/20 text-green-600 border-green-500/30'
        }
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelado',
          className: 'bg-red-500/20 text-red-600 border-red-500/30'
        }
      default:
        return {
          icon: AlertCircle,
          label: status,
          className: 'bg-gray-500/20 text-gray-600 border-gray-500/30'
        }
    }
  }

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <p className="text-red-600 font-semibold text-lg mb-4">
              {error || "No se encontró el proveedor"}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Verifica que el link sea correcto o contacta al administrador
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl">

        {/* Header */}
        <div className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          rounded-2xl
          shadow-lg shadow-black/5
          p-6
        ">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <Building2 className="w-8 h-8 text-purple-600" />
                {supplier.company_name}
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400 mt-2">
                Portal de Gestión de Materiales
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <strong>NIT:</strong> {supplier.nit}
                </p>
                {supplier.contact_person_name && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Contacto:</strong> {supplier.contact_person_name}
                  </p>
                )}
                {supplier.contact_email && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {supplier.contact_email}
                  </p>
                )}
                {supplier.contact_phone && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {supplier.contact_phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
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
            onClick={() => setActiveTab("materials")}
            className={`
              flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === "materials"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/5"
              }
            `}
          >
            <Package className="w-4 h-4" />
            Materiales
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`
              flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === "orders"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white/30 dark:hover:bg-white/5"
              }
            `}
          >
            <FileText className="w-4 h-4" />
            Órdenes de Compra
          </button>
        </div>

        {/* Materials Tab Content */}
        {activeTab === "materials" && (
          <>
            {/* Delivery Days Section */}
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              shadow-lg shadow-black/5
              p-6
            ">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Días de Entrega
            </h2>
            <Button
              onClick={handleSaveDeliveryDays}
              disabled={savingDeliveryDays}
              className="
                bg-purple-500
                text-white
                font-semibold
                px-4 py-2
                rounded-xl
                shadow-md shadow-purple-500/30
                hover:bg-purple-600
                active:scale-95
                transition-all duration-150
              "
            >
              {savingDeliveryDays ? "Guardando..." : "Guardar Días"}
            </Button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Selecciona los días en los que realizas entregas
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(dayLabels).map(([key, label]) => (
              <div
                key={key}
                className={`
                  flex items-center space-x-2
                  p-3 rounded-xl
                  border-2
                  transition-all duration-150
                  cursor-pointer
                  ${deliveryDays[key as keyof DeliveryDays]
                    ? 'bg-purple-500/20 border-purple-500 dark:bg-purple-500/30'
                    : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10'
                  }
                `}
                onClick={() => handleDayToggle(key as keyof DeliveryDays)}
              >
                <Checkbox
                  id={`day-${key}`}
                  checked={deliveryDays[key as keyof DeliveryDays]}
                  onCheckedChange={() => handleDayToggle(key as keyof DeliveryDays)}
                />
                <Label
                  htmlFor={`day-${key}`}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Materials Section */}
        <div className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          rounded-2xl
          shadow-lg shadow-black/5
          p-6
        ">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Materiales Asignados ({materials.length})
            </h2>
            <Button
              onClick={handleAddMaterial}
              className="
                bg-purple-500
                text-white
                font-semibold
                px-6 py-3
                rounded-xl
                shadow-md shadow-purple-500/30
                hover:bg-purple-600
                active:scale-95
                transition-all duration-150
              "
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Material
            </Button>
          </div>

          {/* Materials List */}
          {materials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No tienes materiales asignados aún
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Haz clic en "Agregar Material" para comenzar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => {
                const pricePerGram = calculatePricePerGram(material.unit_price, material.packaging_weight_grams)
                return (
                  <div
                    key={material.id}
                    className="
                      bg-white/50 dark:bg-black/30
                      backdrop-blur-md
                      border border-gray-200/50 dark:border-white/10
                      rounded-xl
                      p-4
                      hover:shadow-lg
                      transition-shadow duration-150
                    "
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {material.supplier_commercial_name || material.material?.name || "Sin nombre"}
                        </h3>
                        {material.supplier_commercial_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Nombre oficial: {material.material?.name}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {material.presentation}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Precio</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                ${material.unit_price.toLocaleString('es-CO')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Peso Total</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {material.packaging_weight_grams} g
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-purple-600" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Precio/Gramo</p>
                              <p className="text-sm font-semibold text-purple-600">
                                ${pricePerGram.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMaterial(material)}
                          className="hover:bg-blue-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="hover:bg-red-500/10 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
          </>
        )}

        {/* Purchase Orders Tab Content */}
        {activeTab === "orders" && (
          <div className="
            bg-white/70 dark:bg-black/50
            backdrop-blur-xl
            border border-white/20 dark:border-white/10
            rounded-2xl
            shadow-lg shadow-black/5
            p-6
          ">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Órdenes de Compra ({purchaseOrders.length})
              </h2>
            </div>

            {/* Stats Cards */}
            {purchaseOrders.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {getOrderStats().pendingOrders}
                  </p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ordenados</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {getOrderStats().orderedOrders}
                  </p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Parciales</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {getOrderStats().partiallyReceivedOrders}
                  </p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Recibidos</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {getOrderStats().receivedOrders}
                  </p>
                </div>
              </div>
            )}

            {/* Orders List */}
            {purchaseOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  No tienes órdenes de compra aún
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  Las órdenes de compra aparecerán aquí cuando sean creadas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {purchaseOrders.map((order) => {
                  const statusInfo = getStatusBadge(order.status || 'pending')
                  const StatusIcon = statusInfo.icon
                  const completion = getOrderCompletion(order)

                  return (
                    <div
                      key={order.id}
                      className="
                        bg-white/50 dark:bg-black/30
                        backdrop-blur-md
                        border border-gray-200/50 dark:border-white/10
                        rounded-xl
                        p-4
                        hover:shadow-lg
                        transition-shadow duration-150
                      "
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Orden #{order.order_number}
                            </h3>
                            <div className={`
                              inline-flex items-center gap-1.5 px-3 py-1 rounded-lg
                              text-xs font-medium border
                              ${statusInfo.className}
                            `}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusInfo.label}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Fecha de Orden</p>
                              <p className="text-gray-900 dark:text-white font-medium">
                                {new Date(order.order_date).toLocaleDateString('es-CO', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>

                            {order.expected_delivery_date && (
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Entrega Esperada</p>
                                <p className="text-gray-900 dark:text-white font-medium">
                                  {new Date(order.expected_delivery_date).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Valor Total</p>
                              <p className="text-gray-900 dark:text-white font-bold">
                                ${(order.total_amount || 0).toLocaleString('es-CO')}
                              </p>
                            </div>
                          </div>

                          {order.notes && (
                            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <strong>Notas:</strong>
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {order.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items List */}
                      {order.items && order.items.length > 0 && (
                        <div className="mt-4 border-t border-gray-200/50 dark:border-white/10 pt-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Materiales ({order.items.length})
                          </p>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="
                                  flex items-center justify-between
                                  p-3
                                  bg-gray-50/50 dark:bg-white/5
                                  rounded-lg
                                "
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.material?.name || 'Material desconocido'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Cantidad: {item.quantity_ordered.toLocaleString('es-CO')} {item.material?.unit || 'unidades'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    ${(item.unit_price || 0).toLocaleString('es-CO')}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    por unidad
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Completion Progress */}
                          {(order.status === 'partially_received' || order.status === 'received') && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Progreso de Recepción
                                </p>
                                <p className="text-xs font-semibold text-purple-600">
                                  {completion.toFixed(0)}%
                                </p>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${completion}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Material Form Modal */}
      {showMaterialForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="
            bg-white/90 dark:bg-black/80
            backdrop-blur-2xl
            border border-white/30 dark:border-white/15
            rounded-3xl
            shadow-2xl shadow-black/20
            max-w-2xl
            w-full
            max-h-[90vh]
            overflow-hidden
          ">
            {/* Header */}
            <div className="
              bg-purple-500
              px-6 py-4
              flex items-center justify-between
            ">
              <h2 className="text-xl font-semibold text-white">
                {editingMaterial ? "Editar Material" : "Agregar Material"}
              </h2>
              <button
                onClick={() => {
                  setShowMaterialForm(false)
                  setEditingMaterial(null)
                }}
                className="
                  text-white
                  hover:bg-white/20
                  rounded-lg
                  p-2
                  transition-colors
                "
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">

              {/* Material Selection */}
              {!editingMaterial && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Material *
                  </Label>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={materialFormData.material_id}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        const selectedMaterial = allMaterials.find(m => m.id === selectedId)
                        setMaterialFormData(prev => ({
                          ...prev,
                          material_id: selectedId,
                          material_name: selectedMaterial?.name || "",
                        }))
                      }}
                      className="
                        flex-1
                        bg-white/50 dark:bg-black/30
                        backdrop-blur-md
                        border border-gray-200/50 dark:border-white/10
                        rounded-xl
                        px-4 py-2
                        focus:ring-2 focus:ring-purple-500/50
                        focus:border-purple-500/50
                      "
                    >
                      <option value="">Selecciona un material</option>
                      {allMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => setShowNewMaterialForm(true)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nuevo
                    </Button>
                  </div>
                </div>
              )}

              {editingMaterial && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Material
                  </Label>
                  <p className="mt-1.5 text-lg font-semibold text-gray-900 dark:text-white">
                    {materialFormData.material_name}
                  </p>
                </div>
              )}

              {/* Supplier Commercial Name */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre Comercial (opcional)
                </Label>
                <Input
                  value={materialFormData.supplier_commercial_name}
                  onChange={(e) => setMaterialFormData(prev => ({ ...prev, supplier_commercial_name: e.target.value }))}
                  placeholder="Ej: Harina Panadera Premium"
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  "
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El nombre con el que tú conoces este material (puede ser diferente al nombre oficial)
                </p>
              </div>

              {/* Presentation */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Presentación *
                </Label>
                <Input
                  value={materialFormData.presentation}
                  onChange={(e) => setMaterialFormData(prev => ({ ...prev, presentation: e.target.value }))}
                  placeholder="Ej: Caja x 500 g"
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  "
                />
              </div>

              {/* Packaging Weight in Grams */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Peso Total del Empaque (gramos) *
                </Label>
                <Input
                  type="number"
                  value={materialFormData.packaging_weight_grams || ""}
                  onChange={(e) => setMaterialFormData(prev => ({ ...prev, packaging_weight_grams: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ej: 500"
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  "
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ingresa el peso total en gramos (ej: caja de 500g = 500, saco de 50kg = 50000)
                </p>
              </div>

              {/* Unit Price */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Precio del Empaque *
                </Label>
                <Input
                  type="number"
                  value={materialFormData.unit_price || ""}
                  onChange={(e) => setMaterialFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ej: 15000"
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  "
                />
              </div>

              {/* Price per Gram Info */}
              {materialFormData.unit_price > 0 && materialFormData.packaging_weight_grams > 0 && (
                <div className="
                  bg-purple-500/10
                  border border-purple-500/30
                  rounded-xl
                  p-4
                ">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Precio por gramo
                  </p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    ${calculatePricePerGram(materialFormData.unit_price, materialFormData.packaging_weight_grams).toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Este es el precio calculado por cada gramo del material
                  </p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="
              bg-gray-50/50 dark:bg-white/5
              backdrop-blur-sm
              px-6 py-4
              flex justify-end gap-3
            ">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowMaterialForm(false)
                  setEditingMaterial(null)
                }}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveMaterial}
                className="
                  bg-purple-500
                  text-white
                  font-semibold
                  px-6
                  rounded-xl
                  shadow-md shadow-purple-500/30
                  hover:bg-purple-600
                  active:scale-95
                  transition-all duration-150
                "
              >
                {editingMaterial ? "Actualizar" : "Agregar"}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* New Material Form Modal */}
      {showNewMaterialForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="
            bg-white/90 dark:bg-black/80
            backdrop-blur-2xl
            border border-white/30 dark:border-white/15
            rounded-3xl
            shadow-2xl shadow-black/20
            max-w-md
            w-full
          ">
            {/* Header */}
            <div className="
              bg-green-500
              px-6 py-4
              flex items-center justify-between
            ">
              <h2 className="text-xl font-semibold text-white">
                Crear Nuevo Material
              </h2>
              <button
                onClick={() => setShowNewMaterialForm(false)}
                className="
                  text-white
                  hover:bg-white/20
                  rounded-lg
                  p-2
                  transition-colors
                "
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre del Material *
                </Label>
                <Input
                  value={newMaterialData.name}
                  onChange={(e) => setNewMaterialData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Harina de Trigo"
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  "
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unidad
                </Label>
                <select
                  value={newMaterialData.unit}
                  onChange={(e) => setNewMaterialData(prev => ({ ...prev, unit: e.target.value }))}
                  className="
                    mt-1.5
                    w-full
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border border-gray-200/50 dark:border-white/10
                    rounded-xl
                    px-4 py-2
                  "
                >
                  <option value="g">Gramos (g)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="L">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="unidad">Unidad</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción (opcional)
                </Label>
                <Input
                  value={newMaterialData.description}
                  onChange={(e) => setNewMaterialData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción breve"
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                  "
                />
              </div>
            </div>

            {/* Footer */}
            <div className="
              bg-gray-50/50 dark:bg-white/5
              backdrop-blur-sm
              px-6 py-4
              flex justify-end gap-3
            ">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowNewMaterialForm(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateNewMaterial}
                className="
                  bg-green-500
                  text-white
                  font-semibold
                  px-6
                  rounded-xl
                  shadow-md shadow-green-500/30
                  hover:bg-green-600
                  active:scale-95
                  transition-all duration-150
                "
              >
                Crear Material
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
