"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Loader2, Minus, AlertTriangle } from "lucide-react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useInventoryAdjustments, type ProductWithInventory } from "@/hooks/use-inventory-adjustments"
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

interface InventoryInfo {
  id: string
  name: string
  status: string
  created_at: string
}

export default function InventoryAdjustmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const inventoryId = params.id as string

  const {
    reasons,
    getProductsWithInventoryComparison,
    createAdjustment,
    applyAdjustment
  } = useInventoryAdjustments(inventoryId)

  const [inventory, setInventory] = useState<InventoryInfo | null>(null)
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null)
  const [selectedReasonId, setSelectedReasonId] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    loadInventoryData()
  }, [inventoryId])

  const loadInventoryData = async () => {
    try {
      setLoading(true)

      // Get inventory info
      const { data: invData, error: invError } = await supabase
        .from('inventories')
        .select('id, name, status, created_at')
        .eq('id', inventoryId)
        .single()

      if (invError) throw invError
      setInventory(invData)

      // Get products with comparison
      const productsData = await getProductsWithInventoryComparison(inventoryId)
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading inventory data:', error)
      toast.error('Error al cargar datos del inventario')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdjustDialog = (product: ProductWithInventory) => {
    setSelectedProduct(product)
    setSelectedReasonId('')
    setCustomReason('')
    setIsAdjustDialogOpen(true)
  }

  const handleApplyAdjustment = async () => {
    if (!selectedProduct || !selectedReasonId) {
      toast.error('Por favor selecciona una razón para el ajuste')
      return
    }

    // If "Otros" is selected, require custom reason
    const selectedReason = reasons.find(r => r.id === selectedReasonId)
    if (selectedReason?.reason === 'Otros' && !customReason.trim()) {
      toast.error('Por favor describe la razón del ajuste')
      return
    }

    try {
      setApplying(true)

      // Create adjustment
      const adjustment = await createAdjustment({
        inventory_id: inventoryId,
        product_id: selectedProduct.product_id,
        counted_quantity: selectedProduct.counted_quantity,
        actual_quantity: selectedProduct.actual_quantity,
        difference: selectedProduct.difference,
        adjustment_type: selectedProduct.adjustment_type as 'positive' | 'negative',
        adjustment_quantity: Math.abs(selectedProduct.difference),
        reason_id: selectedReasonId,
        custom_reason: customReason.trim() || null
      })

      // Close reason dialog and apply adjustment directly to location_id
      setIsAdjustDialogOpen(false)

      // Apply the adjustment immediately
      await applyAdjustment(adjustment.id)

      setSelectedProduct(null)

      // Reload data
      await loadInventoryData()
    } catch (error) {
      console.error('Error creating adjustment:', error)
    } finally {
      setApplying(false)
    }
  }


  const getDifferenceColor = (adjustmentType: string) => {
    switch (adjustmentType) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getDifferenceIcon = (adjustmentType: string) => {
    switch (adjustmentType) {
      case 'positive': return <TrendingUp className="h-4 w-4" />
      case 'negative': return <TrendingDown className="h-4 w-4" />
      default: return <Minus className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <RouteGuard>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-purple-600 animate-spin" />
              <p className="text-gray-600">Cargando ajustes...</p>
            </div>
          </div>
        </div>
      </RouteGuard>
    )
  }

  // Separate products into categories
  const productsCountedWithDifference = products.filter(p => p.adjustment_needed && p.counted_quantity > 0)
  const productsNotCounted = products.filter(p => p.counted_quantity === 0 && p.snapshot_quantity > 0 && !p.adjustment_status)
  const productsWithAppliedAdjustments = products.filter(p => p.adjustment_status === 'approved')
  const productsWithoutDifference = products.filter(p => !p.adjustment_needed && !p.adjustment_status)

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-purple-600 text-white p-4 md:p-8">
          <div className="container mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/inventory/adjustments">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-xl md:text-3xl font-bold">
                  {inventory?.name}
                </h1>
                <p className="text-purple-100 mt-1 text-sm md:text-base">
                  Ajustes de inventario - Solo materias primas
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-purple-200 text-xs">Total Productos</p>
                <p className="text-white text-2xl font-bold">{products.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-purple-200 text-xs">Requieren Ajuste</p>
                <p className="text-white text-2xl font-bold">{productsCountedWithDifference.length + productsNotCounted.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-purple-200 text-xs">Ajustes Aplicados</p>
                <p className="text-white text-2xl font-bold">{productsWithAppliedAdjustments.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-purple-200 text-xs">Ajustes Positivos</p>
                <p className="text-white text-2xl font-bold">
                  {products.filter(p => p.adjustment_type === 'positive').length}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-purple-200 text-xs">Ajustes Negativos</p>
                <p className="text-white text-2xl font-bold">
                  {products.filter(p => p.adjustment_type === 'negative').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto p-4 space-y-6">
          {/* Products counted with differences */}
          {productsCountedWithDifference.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Productos contados con diferencia ({productsCountedWithDifference.length})
              </h2>
              <div className="grid gap-4">
                {productsCountedWithDifference.map((product) => (
                  <Card key={product.product_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{product.product_name}{product.product_weight ? ` ${product.product_weight}` : ''}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-gray-500">Contado</p>
                              <p className="text-base md:text-lg font-semibold">{product.counted_quantity.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Sistema (Snapshot)</p>
                              <p className="text-base md:text-lg font-semibold">{product.snapshot_quantity.toFixed(2)}</p>
                            </div>
                            <div className="opacity-60">
                              <p className="text-xs text-gray-500">Actual (Info)</p>
                              <p className="text-sm md:text-base font-medium">{product.current_quantity.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Ajuste</p>
                              <div className={`flex items-center gap-1 ${getDifferenceColor(product.adjustment_type)}`}>
                                {getDifferenceIcon(product.adjustment_type)}
                                <p className="text-base md:text-lg font-bold">
                                  {product.difference > 0 ? '+' : ''}{product.difference.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                          {Math.abs(product.current_difference) > 0.01 && (
                            <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                              ℹ️ Diferencia vs inventario actual: {product.current_difference > 0 ? '+' : ''}{product.current_difference.toFixed(2)}
                            </div>
                          )}
                        </div>
                        {product.adjustment_status === 'approved' ? (
                          <Button
                            disabled
                            className="bg-green-600 cursor-not-allowed opacity-75"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Ajuste Aplicado
                          </Button>
                        ) : product.adjustment_status === 'pending' ? (
                          <Button
                            disabled
                            className="bg-blue-600 cursor-not-allowed opacity-75"
                          >
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Pendiente
                          </Button>
                        ) : product.adjustment_status === 'rejected' ? (
                          <Button
                            onClick={() => handleOpenAdjustDialog(product)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Rechazado - Reaplica
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleOpenAdjustDialog(product)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Aplicar Ajuste
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Products NOT counted but exist in inventory */}
          {productsNotCounted.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Productos NO contados pero con inventario ({productsNotCounted.length})
              </h2>
              <p className="text-sm text-gray-600 mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                ⚠️ Estos productos tienen cantidad en el sistema pero NO fueron contados en el inventario físico.
                Se asume cantidad real = 0, por lo que requieren ajuste negativo para sacar el inventario del sistema.
              </p>
              <div className="grid gap-4">
                {productsNotCounted.map((product) => (
                  <Card key={product.product_id} className="border-red-200 bg-red-50 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{product.product_name}{product.product_weight ? ` ${product.product_weight}` : ''}</h3>
                            <Badge variant="destructive" className="text-xs">
                              NO CONTADO
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-gray-500">Contado</p>
                              <p className="text-base md:text-lg font-semibold text-gray-400">0.00</p>
                              <p className="text-xs text-red-600 font-medium">No se contó</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Sistema (Snapshot)</p>
                              <p className="text-base md:text-lg font-semibold text-red-700">{product.snapshot_quantity.toFixed(2)}</p>
                            </div>
                            <div className="opacity-60">
                              <p className="text-xs text-gray-500">Actual (Info)</p>
                              <p className="text-sm md:text-base font-medium">{product.current_quantity.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Ajuste Necesario</p>
                              <div className="flex items-center gap-1 text-red-600">
                                <TrendingDown className="h-4 w-4" />
                                <p className="text-base md:text-lg font-bold">
                                  {product.difference.toFixed(2)}
                                </p>
                              </div>
                              <p className="text-xs text-red-600 font-medium">Sacar inventario</p>
                            </div>
                          </div>
                        </div>
                        {product.adjustment_status === 'approved' ? (
                          <Button
                            disabled
                            className="bg-green-600 cursor-not-allowed opacity-75"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Ajuste Aplicado
                          </Button>
                        ) : product.adjustment_status === 'pending' ? (
                          <Button
                            disabled
                            className="bg-blue-600 cursor-not-allowed opacity-75"
                          >
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Pendiente
                          </Button>
                        ) : product.adjustment_status === 'rejected' ? (
                          <Button
                            onClick={() => handleOpenAdjustDialog(product)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Rechazado - Reaplicar
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleOpenAdjustDialog(product)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Aplicar Ajuste Negativo
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Products with applied adjustments */}
          {productsWithAppliedAdjustments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
                Ajustes Aplicados ({productsWithAppliedAdjustments.length})
              </h2>
              <p className="text-sm text-gray-600 mb-4 bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                ℹ️ Estos productos tuvieron ajustes aplicados. El inventario ya fue actualizado.
              </p>
              <div className="grid gap-4">
                {productsWithAppliedAdjustments.map((product) => (
                  <Card key={product.product_id} className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{product.product_name}{product.product_weight ? ` ${product.product_weight}` : ''}</h3>
                            {product.adjustment_date && (
                              <p className="text-xs text-gray-500">
                                Ajustado el {new Date(product.adjustment_date).toLocaleDateString('es-CO', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                          <Button
                            disabled
                            className="bg-green-600 cursor-not-allowed opacity-75"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Aplicado
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Cantidad Ajustada</p>
                            <p className="text-base md:text-lg font-bold text-red-700">
                              {product.adjustment_quantity ?
                                `${product.adjustment_type === 'negative' ? '-' : '+'}${product.adjustment_quantity.toFixed(2)}`
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Balance Actual</p>
                            <p className="text-base md:text-lg font-semibold text-green-700">
                              {product.current_quantity.toFixed(2)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Razón</p>
                            <p className="text-sm font-medium text-gray-700">
                              {product.adjustment_reason || 'No especificada'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Products without difference */}
          {productsWithoutDifference.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Productos sin diferencias ({productsWithoutDifference.length})
              </h2>
              <div className="grid gap-3">
                {productsWithoutDifference.map((product) => (
                  <Card key={product.product_id} className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{product.product_name}{product.product_weight ? ` ${product.product_weight}` : ''}</h3>
                          <p className="text-sm text-gray-600">
                            Cantidad: {product.counted_quantity.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sin diferencia
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Adjustment Dialog */}
        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Ajuste de Inventario</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">{selectedProduct.product_name}{selectedProduct.product_weight ? ` ${selectedProduct.product_weight}` : ''}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Contado</p>
                      <p className="font-semibold text-lg">{selectedProduct.counted_quantity.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Sistema (Snapshot)</p>
                      <p className="font-semibold text-lg">{selectedProduct.snapshot_quantity.toFixed(2)}</p>
                    </div>
                    <div className="opacity-70">
                      <p className="text-gray-600 text-xs">Actual (Informativo)</p>
                      <p className="font-medium">{selectedProduct.current_quantity.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ajuste a aplicar</p>
                      <p className={`font-bold text-lg ${getDifferenceColor(selectedProduct.adjustment_type)}`}>
                        {selectedProduct.adjustment_type === 'positive' ? '+' : ''}{Math.abs(selectedProduct.difference).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200 text-xs text-gray-600">
                    <p>📌 El ajuste se calcula usando el snapshot del inventario al momento de finalizar el conteo</p>
                    {Math.abs(selectedProduct.current_difference) > 0.01 && (
                      <p className="mt-1 text-blue-600">ℹ️ Diferencia vs inventario actual: {selectedProduct.current_difference > 0 ? '+' : ''}{selectedProduct.current_difference.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Razón del ajuste *</Label>
                  <Select value={selectedReasonId} onValueChange={setSelectedReasonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una razón" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasons.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {reasons.find(r => r.id === selectedReasonId)?.reason === 'Otros' && (
                  <div>
                    <Label htmlFor="custom-reason">Describe la razón *</Label>
                    <Textarea
                      id="custom-reason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Describe la razón del ajuste..."
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsAdjustDialogOpen(false)}
                    disabled={applying}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApplyAdjustment}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={applying}
                  >
                    {applying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aplicar Ajuste
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </RouteGuard>
  )
}
