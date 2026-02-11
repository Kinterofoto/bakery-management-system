"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Package, 
  Calculator, 
  BarChart3, 
  Download,
  CheckCircle2,
  Clock
} from "lucide-react"
import { useInventories } from '@/hooks/use-inventories'
import { useInventoryCounts } from '@/hooks/use-inventory-counts'
import { toast } from 'sonner'
import Link from 'next/link'

export default function InventorySummaryPage() {
  const params = useParams()
  const router = useRouter()
  const inventoryId = params.id as string
  
  const { inventories, getInventorySummary } = useInventories()
  const { counts } = useInventoryCounts(inventoryId)
  
  const [summaryData, setSummaryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const inventory = inventories.find(inv => inv.id === inventoryId)

  useEffect(() => {
    if (inventoryId) {
      getInventorySummary(inventoryId)
        .then(data => setSummaryData(data))
        .catch(err => console.error('Error loading summary:', err))
        .finally(() => setLoading(false))
    }
  }, [inventoryId, getInventorySummary])

  const firstCount = counts.find(c => c.count_number === 1)
  const secondCount = counts.find(c => c.count_number === 2)

  const getCountSummary = (count: any) => {
    if (!count || !count.inventory_count_items) return { totalProducts: 0, totalGrams: 0 }
    
    const items = count.inventory_count_items
    const totalProducts = items.length
    const totalGrams = items.reduce((sum: number, item: any) => sum + item.total_grams, 0)
    
    return { totalProducts, totalGrams }
  }

  const firstCountSummary = getCountSummary(firstCount)
  const secondCountSummary = getCountSummary(secondCount)

  const variancePercentage = firstCountSummary.totalGrams > 0 ? 
    Math.abs((secondCountSummary.totalGrams - firstCountSummary.totalGrams) / firstCountSummary.totalGrams * 100) : 0

  const getProductComparison = () => {
    if (!firstCount?.inventory_count_items) return []
    
    const firstCountItems = firstCount.inventory_count_items
    const secondCountItems = secondCount?.inventory_count_items || []
    
    const comparison = firstCountItems.map((item1: any) => {
      const item2 = secondCountItems.find((item: any) => item.product_id === item1.product_id)
      const variance = item2 ? Math.abs(item2.total_grams - item1.total_grams) : item1.total_grams
      const variancePercent = item1.total_grams > 0 ? (variance / item1.total_grams) * 100 : 0
      
      return {
        product: item1.product,
        count1: item1,
        count2: item2,
        variance,
        variancePercent,
        hasDiscrepancy: variancePercent > 5 // Considera discrepancia si hay más de 5% diferencia
      }
    })
    
    // Agregar productos que solo están en el segundo conteo
    if (secondCountItems) {
      secondCountItems.forEach((item2: any) => {
        const existsInFirst = firstCountItems.find((item: any) => item.product_id === item2.product_id)
        if (!existsInFirst) {
          comparison.push({
            product: item2.product,
            count1: null,
            count2: item2,
            variance: item2.total_grams,
            variancePercent: 100,
            hasDiscrepancy: true
          })
        }
      })
    }
    
    return comparison.sort((a, b) => b.variancePercent - a.variancePercent)
  }

  const productComparison = getProductComparison()
  const hasDiscrepancies = productComparison.some(item => item.hasDiscrepancy)

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600">Cargando resumen...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-red-600">Inventario no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/inventory">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{inventory.name}</h1>
                <p className="text-sm text-gray-600">Resumen de Inventario</p>
              </div>
            </div>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Productos Primer Conteo</p>
                  <p className="text-2xl font-bold">{firstCountSummary.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Productos Segundo Conteo</p>
                  <p className="text-2xl font-bold">{secondCountSummary.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm text-gray-600">Variación Total</p>
                  <p className="text-2xl font-bold">{variancePercentage.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                {hasDiscrepancies ? (
                  <Clock className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="text-lg font-bold">
                    {hasDiscrepancies ? 'Requiere Conciliación' : 'Conforme'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Count Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* First Count */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default">1</Badge>
                Primer Conteo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Productos:</span>
                  <span className="font-bold">{firstCountSummary.totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Gramos:</span>
                  <span className="font-bold">{firstCountSummary.totalGrams.toLocaleString()} g</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completado
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second Count */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary">2</Badge>
                Segundo Conteo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {secondCount ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Productos:</span>
                    <span className="font-bold">{secondCountSummary.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Gramos:</span>
                    <span className="font-bold">{secondCountSummary.totalGrams.toLocaleString()} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completado
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600 mb-4">Segundo conteo no realizado</p>
                  <Link href={`/inventory/${inventoryId}/count?second=true`}>
                    <Button>Realizar Segundo Conteo</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Conteo 1</th>
                    <th className="text-right py-2">Conteo 2</th>
                    <th className="text-right py-2">Diferencia</th>
                    <th className="text-center py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productComparison.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3">
                        <div>
                          <div className="font-semibold">{item.product?.name}{item.product?.weight ? ` - ${item.product.weight}` : ''}</div>
                          <div className="text-sm text-gray-600">{item.product?.id}</div>
                        </div>
                      </td>
                      <td className="text-right py-3">
                        {item.count1 ? `${item.count1.total_grams.toLocaleString()} ${item.product?.unit || 'g'}` : '-'}
                      </td>
                      <td className="text-right py-3">
                        {item.count2 ? `${item.count2.total_grams.toLocaleString()} ${item.product?.unit || 'g'}` : '-'}
                      </td>
                      <td className="text-right py-3">
                        <span className={item.hasDiscrepancy ? 'text-red-600 font-bold' : ''}>
                          {item.variance.toLocaleString()} ${item.product?.unit || 'g'} ({item.variancePercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="text-center py-3">
                        {item.hasDiscrepancy ? (
                          <Badge variant="destructive">Discrepancia</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">Conforme</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {hasDiscrepancies && secondCount && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-amber-700">
                  Se detectaron discrepancias entre los conteos
                </h3>
                <p className="text-gray-600">
                  Para finalizar el inventario, es necesario conciliar las diferencias encontradas
                </p>
                <Link href={`/inventory/${inventoryId}/reconciliation`}>
                  <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                    Proceder a Conciliación
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasDiscrepancies && secondCount && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-green-700">
                  ¡Inventario conforme!
                </h3>
                <p className="text-gray-600">
                  No se detectaron discrepancias significativas entre los conteos
                </p>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizar Inventario
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}