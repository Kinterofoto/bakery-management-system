"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator,
  Save,
  RefreshCw
} from "lucide-react"
import { useInventories } from '@/hooks/use-inventories'
import { useInventoryCounts } from '@/hooks/use-inventory-counts'
import { useReconciliation } from '@/hooks/use-reconciliation'
import { toast } from 'sonner'
import Link from 'next/link'

interface ReconciliationItem {
  product: any
  count1: any
  count2: any
  variance: number
  variancePercent: number
  hasDiscrepancy: boolean
  resolution: 'accept_count1' | 'accept_count2' | 'manual' | null
  finalQuantity: number
  finalGramsPerUnit: number
  notes: string
}

export default function InventoryReconciliationPage() {
  const params = useParams()
  const router = useRouter()
  const inventoryId = params.id as string
  
  const { inventories, updateInventory } = useInventories()
  const { counts } = useInventoryCounts(inventoryId)
  const { isReconciled, saveReconciliation } = useReconciliation(inventoryId)
  
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const inventory = inventories.find(inv => inv.id === inventoryId)
  const firstCount = counts.find(c => c.count_number === 1)
  const secondCount = counts.find(c => c.count_number === 2)

  useEffect(() => {
    if (firstCount?.inventory_count_items && secondCount?.inventory_count_items) {
      const items = processReconciliationItems()
      setReconciliationItems(items)
      setLoading(false)
    }
  }, [firstCount, secondCount])

  // Redirigir si ya está conciliado
  useEffect(() => {
    if (isReconciled && !loading) {
      router.push(`/inventory/${inventoryId}/final-results`)
    }
  }, [isReconciled, loading, inventoryId, router])

  const processReconciliationItems = (): ReconciliationItem[] => {
    if (!firstCount?.inventory_count_items || !secondCount?.inventory_count_items) return []
    
    const firstCountItems = firstCount.inventory_count_items
    const secondCountItems = secondCount.inventory_count_items
    
    const items: ReconciliationItem[] = []
    
    // Procesar productos del primer conteo
    firstCountItems.forEach((item1: any) => {
      const item2 = secondCountItems.find((item: any) => item.product_id === item1.product_id)
      const variance = item2 ? Math.abs(item2.total_grams - item1.total_grams) : item1.total_grams
      const variancePercent = item1.total_grams > 0 ? (variance / item1.total_grams) * 100 : 0
      const hasDiscrepancy = variancePercent > 5
      
      items.push({
        product: item1.product,
        count1: item1,
        count2: item2,
        variance,
        variancePercent,
        hasDiscrepancy,
        resolution: hasDiscrepancy ? null : 'accept_count1',
        finalQuantity: item1.quantity_units,
        finalGramsPerUnit: item1.grams_per_unit,
        notes: ''
      })
    })
    
    // Agregar productos que solo están en el segundo conteo
    secondCountItems.forEach((item2: any) => {
      const existsInFirst = firstCountItems.find((item: any) => item.product_id === item2.product_id)
      if (!existsInFirst) {
        items.push({
          product: item2.product,
          count1: null,
          count2: item2,
          variance: item2.total_grams,
          variancePercent: 100,
          hasDiscrepancy: true,
          resolution: null,
          finalQuantity: item2.quantity_units,
          finalGramsPerUnit: item2.grams_per_unit,
          notes: ''
        })
      }
    })
    
    return items.sort((a, b) => b.variancePercent - a.variancePercent)
  }

  const updateReconciliationItem = (index: number, updates: Partial<ReconciliationItem>) => {
    setReconciliationItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ))
  }

  const handleResolutionChange = (index: number, resolution: string) => {
    const item = reconciliationItems[index]
    let finalQuantity = item.finalQuantity
    let finalGramsPerUnit = item.finalGramsPerUnit
    
    if (resolution === 'accept_count1' && item.count1) {
      finalQuantity = item.count1.quantity_units
      finalGramsPerUnit = item.count1.grams_per_unit
    } else if (resolution === 'accept_count2' && item.count2) {
      finalQuantity = item.count2.quantity_units
      finalGramsPerUnit = item.count2.grams_per_unit
    }
    
    updateReconciliationItem(index, {
      resolution: resolution as any,
      finalQuantity,
      finalGramsPerUnit
    })
  }

  const canSave = () => {
    const discrepantItems = reconciliationItems.filter(item => item.hasDiscrepancy)
    return discrepantItems.every(item => item.resolution !== null)
  }

  const handleSaveReconciliation = async () => {
    if (!canSave()) {
      toast.error('Debes resolver todas las discrepancias antes de guardar')
      return
    }

    if (saving) return // Prevenir doble click

    setSaving(true)
    
    try {
      console.log('Iniciando guardado de conciliación...')
      
      // Usar el hook para guardar la conciliación
      const success = await saveReconciliation(reconciliationItems)
      
      if (success) {
        console.log('Conciliación guardada, actualizando inventario...')
        
        // Actualizar estado del inventario a finalizado
        await updateInventory(inventoryId, {
          status: 'completed',
          completed_at: new Date().toISOString()
        })

        console.log('Inventario actualizado, redirigiendo...')
        toast.success('¡Conciliación completada exitosamente!')
        
        // Pequeño delay para asegurar que el toast se muestre
        setTimeout(() => {
          router.push(`/inventory/${inventoryId}/final-results`)
        }, 500)
      } else {
        toast.error('Error al guardar la conciliación')
        setSaving(false)
      }
      
    } catch (error) {
      console.error('Error saving reconciliation:', error)
      toast.error('Error al guardar la conciliación')
      setSaving(false)
    }
    // No llamamos setSaving(false) aquí para mantener el botón desactivado durante la navegación
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
            <p className="text-gray-600">Procesando conciliación...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!inventory || !firstCount || !secondCount) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-red-600">No se encontraron los datos necesarios para la conciliación</p>
        </div>
      </div>
    )
  }

  const discrepantItems = reconciliationItems.filter(item => item.hasDiscrepancy)
  const conformItems = reconciliationItems.filter(item => !item.hasDiscrepancy)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/inventory/${inventoryId}/summary`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{inventory.name}</h1>
                <p className="text-sm text-gray-600">Conciliación de Discrepancias</p>
              </div>
            </div>
            
            <Button 
              onClick={handleSaveReconciliation}
              disabled={!canSave() || saving}
              size="lg"
              className={`${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Guardando...' : 'Finalizar Conciliación'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Resumen de Conciliación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{discrepantItems.length}</div>
                <div className="text-sm text-gray-600">Con Discrepancias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{conformItems.length}</div>
                <div className="text-sm text-gray-600">Conformes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{reconciliationItems.length}</div>
                <div className="text-sm text-gray-600">Total Productos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discrepant Items */}
        {discrepantItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Productos con Discrepancias ({discrepantItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {discrepantItems.map((item, globalIndex) => {
                  const actualIndex = reconciliationItems.findIndex(r => r.product.id === item.product.id)
                  return (
                    <div key={item.product.id} className="border rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{item.product.name}</h3>
                          <p className="text-sm text-gray-600">{item.product.id}</p>
                        </div>
                        <Badge variant="destructive">
                          Diferencia: {item.variancePercent.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="border rounded p-3 bg-white">
                          <h4 className="font-semibold mb-2">Primer Conteo</h4>
                          {item.count1 ? (
                            <div className="space-y-1">
                              <div>Cantidad: {item.count1.quantity_units} unidades</div>
                              <div>Gramos/unidad: {item.count1.grams_per_unit.toLocaleString()}</div>
                              <div className="font-bold">Total: {item.count1.total_grams.toLocaleString()} g</div>
                            </div>
                          ) : (
                            <div className="text-gray-500">No contado</div>
                          )}
                        </div>

                        <div className="border rounded p-3 bg-white">
                          <h4 className="font-semibold mb-2">Segundo Conteo</h4>
                          {item.count2 ? (
                            <div className="space-y-1">
                              <div>Cantidad: {item.count2.quantity_units} unidades</div>
                              <div>Gramos/unidad: {item.count2.grams_per_unit.toLocaleString()}</div>
                              <div className="font-bold">Total: {item.count2.total_grams.toLocaleString()} g</div>
                            </div>
                          ) : (
                            <div className="text-gray-500">No contado</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-semibold">Resolución:</Label>
                          <RadioGroup
                            value={item.resolution || ''}
                            onValueChange={(value) => handleResolutionChange(actualIndex, value)}
                          >
                            {item.count1 && (
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="accept_count1" id={`count1-${item.product.id}`} />
                                <Label htmlFor={`count1-${item.product.id}`}>
                                  Aceptar Primer Conteo ({item.count1.total_grams.toLocaleString()} g)
                                </Label>
                              </div>
                            )}
                            {item.count2 && (
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="accept_count2" id={`count2-${item.product.id}`} />
                                <Label htmlFor={`count2-${item.product.id}`}>
                                  Aceptar Segundo Conteo ({item.count2.total_grams.toLocaleString()} g)
                                </Label>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="manual" id={`manual-${item.product.id}`} />
                              <Label htmlFor={`manual-${item.product.id}`}>
                                Ajuste Manual
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {item.resolution === 'manual' && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Cantidad Final (unidades)</Label>
                              <Input
                                type="number"
                                value={item.finalQuantity}
                                onChange={(e) => updateReconciliationItem(actualIndex, {
                                  finalQuantity: parseInt(e.target.value) || 0
                                })}
                              />
                            </div>
                            <div>
                              <Label>Gramos por Unidad</Label>
                              <Input
                                type="number"
                                value={item.finalGramsPerUnit}
                                onChange={(e) => updateReconciliationItem(actualIndex, {
                                  finalGramsPerUnit: parseFloat(e.target.value) || 0
                                })}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Observaciones</Label>
                          <Textarea
                            placeholder="Notas sobre la resolución de esta discrepancia..."
                            value={item.notes}
                            onChange={(e) => updateReconciliationItem(actualIndex, {
                              notes: e.target.value
                            })}
                          />
                        </div>

                        {item.resolution && (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="font-semibold">Valor Final:</span>
                            </div>
                            <div className="mt-1">
                              {item.finalQuantity} unidades × {item.finalGramsPerUnit.toLocaleString()} g = {' '}
                              <span className="font-bold">
                                {(item.finalQuantity * item.finalGramsPerUnit).toLocaleString()} g
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conform Items Summary */}
        {conformItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Productos Conformes ({conformItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Los siguientes productos no presentan discrepancias significativas y se aceptará automáticamente el primer conteo:
              </p>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {conformItems.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <div>
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-sm text-gray-600 ml-2">({item.product.id})</span>
                    </div>
                    <div className="text-sm">
                      {item.count1?.total_grams.toLocaleString()} g
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {!canSave() ? (
                <div>
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-amber-700 font-semibold">
                    Debes resolver todas las discrepancias antes de finalizar
                  </p>
                  <p className="text-gray-600 text-sm">
                    {discrepantItems.filter(item => !item.resolution).length} productos pendientes de resolución
                  </p>
                </div>
              ) : (
                <div>
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-green-700 font-semibold">
                    ¡Todas las discrepancias han sido resueltas!
                  </p>
                  <p className="text-gray-600 text-sm">
                    El inventario está listo para finalizar
                  </p>
                </div>
              )}
              
              <Button 
                onClick={handleSaveReconciliation}
                disabled={!canSave() || saving}
                size="lg"
                className={`${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Guardando...' : 'Finalizar Conciliación'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}