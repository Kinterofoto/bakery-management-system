"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Upload,
  Trash2,
  Truck,
} from "lucide-react"
import { expressDelivery, uploadEvidence } from "@/app/order-management/orders/actions"
import type { ExpressDeliveryItem } from "@/app/order-management/orders/actions"

interface OrderItem {
  id: string
  product_id?: string
  quantity_requested?: number
  quantity_available?: number
  quantity_delivered?: number
  product?: {
    id: string
    name: string
    unit?: string
    weight?: string
  }
}

interface Order {
  id: string
  order_number?: string
  status: string
  expected_delivery_date?: string
  client?: {
    id: string
    name: string
  }
  branch?: {
    id: string
    name: string
  }
  order_items?: OrderItem[]
}

interface ExpressDeliveryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onDeliveryComplete: () => void
}

type DeliveryStatus = "delivered" | "partial" | "not_delivered"

interface ProductDelivery {
  status: DeliveryStatus
  quantity_delivered: number
  quantity_returned: number
}

export function ExpressDeliveryModal({
  open,
  onOpenChange,
  order,
  onDeliveryComplete,
}: ExpressDeliveryModalProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState<string | undefined>()
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [generalReturnReason, setGeneralReturnReason] = useState("")

  // Product deliveries state: { [item_id]: { status, quantity_delivered, quantity_returned } }
  const [productDeliveries, setProductDeliveries] = useState<
    Record<string, ProductDelivery>
  >({})

  // Initialize product deliveries when order changes
  useEffect(() => {
    if (order?.order_items) {
      const initialDeliveries: Record<string, ProductDelivery> = {}
      order.order_items.forEach((item) => {
        const availableQty = item.quantity_available ?? item.quantity_requested ?? 0
        initialDeliveries[item.id] = {
          status: "delivered",
          quantity_delivered: availableQty,
          quantity_returned: 0,
        }
      })
      setProductDeliveries(initialDeliveries)
    }
  }, [order])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setEvidenceUrl(undefined)
      setEvidenceFile(null)
      setGeneralReturnReason("")
      setProductDeliveries({})
    }
  }, [open])

  const handleProductDeliveryChange = (
    itemId: string,
    field: keyof ProductDelivery,
    value: any
  ) => {
    setProductDeliveries((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const handleEvidenceUpload = async (file: File) => {
    setUploadingEvidence(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadEvidence(formData)

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.data) {
        setEvidenceUrl(result.data.evidence_url)
        setEvidenceFile(file)
        toast({
          title: "Evidencia subida",
          description: "La foto se ha comprimido y guardado correctamente",
        })
      }
    } catch (error) {
      console.error("Error uploading evidence:", error)
      toast({
        title: "Error",
        description: "No se pudo subir la evidencia",
        variant: "destructive",
      })
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleEvidenceDelete = () => {
    setEvidenceUrl(undefined)
    setEvidenceFile(null)
    toast({
      title: "Evidencia eliminada",
      description: "La foto se ha eliminado",
    })
  }

  const handleCompleteDelivery = async () => {
    if (!order?.order_items) {
      toast({
        title: "Error",
        description: "No se pudo obtener informaci\u00f3n del pedido",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Check if there are returns and validate reason
      const hasReturns = Object.values(productDeliveries).some(
        (d) => d.quantity_returned > 0
      )

      if (hasReturns && !generalReturnReason) {
        toast({
          title: "Motivo requerido",
          description: "Debes seleccionar un motivo para las devoluciones",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      // Prepare items for the API
      const items: ExpressDeliveryItem[] = order.order_items.map((item) => {
        const delivery = productDeliveries[item.id] || {
          status: "delivered" as DeliveryStatus,
          quantity_delivered: item.quantity_available ?? item.quantity_requested ?? 0,
          quantity_returned: 0,
        }

        return {
          item_id: item.id,
          quantity_delivered: delivery.quantity_delivered,
          quantity_returned: delivery.quantity_returned,
          status: delivery.status,
        }
      })

      const result = await expressDelivery({
        order_id: order.id,
        evidence_url: evidenceUrl,
        items,
        general_return_reason: hasReturns ? generalReturnReason : undefined,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: "Entrega completada",
        description: result.data?.message || "Todos los productos han sido procesados",
      })

      onOpenChange(false)
      onDeliveryComplete()
    } catch (error) {
      console.error("Error completing delivery:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo completar la entrega",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!order) return null

  const hasReturns = Object.values(productDeliveries).some(
    (d) => d.quantity_returned > 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            Entrega Express
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="font-semibold text-lg">
              Pedido: {order.order_number || order.id.slice(0, 8)}
            </div>
            <div className="text-sm text-gray-600">
              Cliente: {order.client?.name || "Sin cliente"}
            </div>
            {order.branch?.name && (
              <div className="text-sm text-gray-600">
                Sucursal: {order.branch.name}
              </div>
            )}
            <div className="text-sm text-gray-600">
              Fecha de entrega: {order.expected_delivery_date || "No especificada"}
            </div>
          </div>

          {/* Evidence Upload - OPTIONAL */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Evidencia de Entrega (Opcional)</h3>
            </div>

            {!evidenceUrl ? (
              <div>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleEvidenceUpload(file)
                    }
                  }}
                  disabled={uploadingEvidence}
                />
                {uploadingEvidence && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo y comprimiendo imagen...
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <img
                  src={evidenceUrl}
                  alt="Evidencia de entrega"
                  className="w-full max-h-48 object-contain rounded-lg border"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={handleEvidenceDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Products List */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Productos</h3>

            {order.order_items?.map((item) => {
              const requestedQuantity = item.quantity_requested ?? 0
              const availableQuantity = item.quantity_available ?? requestedQuantity
              const delivery = productDeliveries[item.id] || {
                status: "delivered" as DeliveryStatus,
                quantity_delivered: availableQuantity,
                quantity_returned: 0,
              }

              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 space-y-3 bg-white"
                >
                  {/* Product Info */}
                  <div>
                    <div className="font-semibold">
                      {item.product?.name || "Producto"}
                      {item.product?.weight ? ` (${item.product.weight})` : ""}
                    </div>
                    <div className="text-sm text-gray-600">
                      Cantidad solicitada: {requestedQuantity} {item.product?.unit || "unidades"}
                    </div>
                    {availableQuantity !== requestedQuantity && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1 inline-block">
                        Disponible: {availableQuantity} {item.product?.unit || "unidades"}
                      </div>
                    )}
                  </div>

                  {/* Status Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={delivery.status === "delivered" ? "default" : "outline"}
                      className={
                        delivery.status === "delivered"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : ""
                      }
                      onClick={() => {
                        handleProductDeliveryChange(item.id, "status", "delivered")
                        handleProductDeliveryChange(
                          item.id,
                          "quantity_delivered",
                          availableQuantity
                        )
                        handleProductDeliveryChange(item.id, "quantity_returned", 0)
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Entregado
                    </Button>

                    <Button
                      size="sm"
                      variant={delivery.status === "partial" ? "default" : "outline"}
                      className={
                        delivery.status === "partial"
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : ""
                      }
                      onClick={() => {
                        handleProductDeliveryChange(item.id, "status", "partial")
                      }}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Parcial
                    </Button>

                    <Button
                      size="sm"
                      variant={delivery.status === "not_delivered" ? "default" : "outline"}
                      className={
                        delivery.status === "not_delivered"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : ""
                      }
                      onClick={() => {
                        handleProductDeliveryChange(item.id, "status", "not_delivered")
                        handleProductDeliveryChange(item.id, "quantity_delivered", 0)
                        handleProductDeliveryChange(
                          item.id,
                          "quantity_returned",
                          availableQuantity
                        )
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      No Entregado
                    </Button>
                  </div>

                  {/* Quantity Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Cantidad entregada</Label>
                      <Input
                        type="number"
                        min="0"
                        max={availableQuantity}
                        value={delivery.quantity_delivered}
                        onChange={(e) =>
                          handleProductDeliveryChange(
                            item.id,
                            "quantity_delivered",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Cantidad devuelta</Label>
                      <Input
                        type="number"
                        min="0"
                        max={availableQuantity}
                        value={delivery.quantity_returned}
                        onChange={(e) =>
                          handleProductDeliveryChange(
                            item.id,
                            "quantity_returned",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Return Reason - Only show if there are returns */}
          {hasReturns && (
            <div className="border rounded-lg p-4 space-y-3 bg-yellow-50">
              <h3 className="font-semibold text-yellow-800">
                Motivo General de Devoluciones
              </h3>
              <Select
                value={generalReturnReason}
                onValueChange={setGeneralReturnReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo general" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente_no_presente">
                    Cliente no presente
                  </SelectItem>
                  <SelectItem value="producto_danado">Producto da\u00f1ado</SelectItem>
                  <SelectItem value="cantidad_incorrecta">
                    Cantidad incorrecta
                  </SelectItem>
                  <SelectItem value="cliente_rechaza">
                    Cliente rechaza el producto
                  </SelectItem>
                  <SelectItem value="direccion_incorrecta">
                    Direcci\u00f3n incorrecta
                  </SelectItem>
                  <SelectItem value="calidad_no_satisfactoria">
                    Calidad no satisfactoria
                  </SelectItem>
                  <SelectItem value="otro">Otro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteDelivery}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completar Entrega
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
