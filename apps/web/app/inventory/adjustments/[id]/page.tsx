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
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Loader2, Minus } from "lucide-react"
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
  const [isDistributionDialogOpen, setIsDistributionDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null)
  const [selectedReasonId, setSelectedReasonId] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [applying, setApplying] = useState(false)
  const [pendingAdjustmentId, setPendingAdjustmentId] = useState<string | null>(null)
  const [warehouseQuantity, setWarehouseQuantity] = useState<number>(0)
  const [productionQuantity, setProductionQuantity] = useState<number>(0)

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

      // Close reason dialog and open distribution dialog
      setIsAdjustDialogOpen(false)
      setPendingAdjustmentId(adjustment.id)

      // Set default: 100% to warehouse
      const totalQty = Math.abs(selectedProduct.difference)
      setWarehouseQuantity(totalQty)
      setProductionQuantity(0)

      setIsDistributionDialogOpen(true)
    } catch (error) {
      console.error('Error creating adjustment:', error)
    } finally {
      setApplying(false)
    }
  }

  const handleApplyDistribution = async () => {
    if (!pendingAdjustmentId) return

    const total = warehouseQuantity + productionQuantity
    const adjustmentTotal = selectedProduct ? Math.abs(selectedProduct.difference) : 0

    if (total > adjustmentTotal + 0.01) {
      toast.error(`La suma (${total.toFixed(2)}) excede el ajuste total (${adjustmentTotal.toFixed(2)})`)
      return
    }

    try {
      setApplying(true)

      // Apply the adjustment with distribution
      await applyAdjustment(pendingAdjustmentId, warehouseQuantity, productionQuantity)

      setIsDistributionDialogOpen(false)
      setPendingAdjustmentId(null)
      setSelectedProduct(null)

      // Reload data
      await loadInventoryData()
    } catch (error) {
      console.error('Error applying distribution:', error)
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

  const productsNeedingAdjustment = products.filter(p => p.adjustment_needed)
  const productsWithoutDifference = products.filter(p => !p.adjustment_needed)

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
                <p className="text-white text-2xl font-bold">{productsNeedingAdjustment.length}</p>
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
          {/* Products needing adjustment */}
          {productsNeedingAdjustment.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Productos que requieren ajuste ({productsNeedingAdjustment.length})
              </h2>
              <div className="grid gap-4">
                {productsNeedingAdjustment.map((product) => (
                  <Card key={product.product_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{product.product_name}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Contado</p>
                              <p className="text-lg font-semibold">{product.counted_quantity.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Sistema</p>
                              <p className="text-lg font-semibold">{product.actual_quantity.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Diferencia</p>
                              <div className={`flex items-center gap-1 ${getDifferenceColor(product.adjustment_type)}`}>
                                {getDifferenceIcon(product.adjustment_type)}
                                <p className="text-lg font-bold">
                                  {product.difference > 0 ? '+' : ''}{product.difference.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleOpenAdjustDialog(product)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Aplicar Ajuste
                        </Button>
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
                          <h3 className="font-semibold">{product.product_name}</h3>
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
                  <h4 className="font-semibold mb-2">{selectedProduct.product_name}</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Contado</p>
                      <p className="font-semibold">{selectedProduct.counted_quantity.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Sistema</p>
                      <p className="font-semibold">{selectedProduct.actual_quantity.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ajuste</p>
                      <p className={`font-semibold ${getDifferenceColor(selectedProduct.adjustment_type)}`}>
                        {selectedProduct.adjustment_type === 'positive' ? '+' : ''}{Math.abs(selectedProduct.difference).toFixed(2)}
                      </p>
                    </div>
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

        {/* Distribution Dialog */}
        <Dialog open={isDistributionDialogOpen} onOpenChange={setIsDistributionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Distribuir Ajuste de Inventario</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{selectedProduct.product_name}</h4>
                  <p className="text-sm text-gray-600">
                    Total a ajustar: <span className="font-semibold">{Math.abs(selectedProduct.difference).toFixed(2)}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="warehouse-qty">Cantidad para Bodega</Label>
                    <Input
                      id="warehouse-qty"
                      type="number"
                      min="0"
                      step="0.01"
                      value={warehouseQuantity}
                      onChange={(e) => setWarehouseQuantity(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="production-qty">Cantidad para Producción</Label>
                    <Input
                      id="production-qty"
                      type="number"
                      min="0"
                      step="0.01"
                      value={productionQuantity}
                      onChange={(e) => setProductionQuantity(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total distribuido:</span>
                      <span className={`font-semibold ${
                        (warehouseQuantity + productionQuantity) > Math.abs(selectedProduct.difference) + 0.01
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {(warehouseQuantity + productionQuantity).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Disponible:</span>
                      <span className="font-semibold">
                        {Math.max(0, Math.abs(selectedProduct.difference) - (warehouseQuantity + productionQuantity)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDistributionDialogOpen(false)
                      setPendingAdjustmentId(null)
                    }}
                    disabled={applying}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApplyDistribution}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={applying || (warehouseQuantity + productionQuantity) > Math.abs(selectedProduct.difference) + 0.01}
                  >
                    {applying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aplicar Distribución
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
