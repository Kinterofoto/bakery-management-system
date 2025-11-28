"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  CheckCircle2, 
  Download,
  Package,
  BarChart3,
  Calculator,
  Trophy
} from "lucide-react"
import { useInventories } from '@/hooks/use-inventories'
import { useReconciliation } from '@/hooks/use-reconciliation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface FinalResult {
  id: string
  product: {
    id: string
    name: string
    unit: string
    description: string | null
    weight: string | null
  }
  final_quantity: number
  final_grams_per_unit: number
  final_total_grams: number
  final_value: number | null
  variance_from_count1_percentage: number | null
  variance_from_count2_percentage: number | null
  resolution_method: string | null
  notes: string | null
}

export default function InventoryFinalResultsPage() {
  const params = useParams()
  const inventoryId = params.id as string
  
  const { inventories } = useInventories()
  const { isReconciled, loading: reconciliationLoading } = useReconciliation(inventoryId)
  const [finalResults, setFinalResults] = useState<FinalResult[]>([])
  const [loading, setLoading] = useState(true)

  const inventory = inventories.find(inv => inv.id === inventoryId)

  const fetchFinalResults = useCallback(async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('inventory_final_results')
        .select(`
          *,
          product:products (
            id,
            name,
            unit,
            description,
            weight
          )
        `)
        .eq('inventory_id', inventoryId)
        .order('final_total_grams', { ascending: false })

      if (error) throw error

      setFinalResults(data as FinalResult[])
    } catch (err) {
      console.error('Error loading final results:', err)
      toast.error('Error al cargar resultados finales')
    } finally {
      setLoading(false)
    }
  }, [inventoryId])

  useEffect(() => {
    if (inventoryId) {
      // Intentar cargar resultados finales si el inventario está completado o reconciliado
      if (inventory?.status === 'completed' || isReconciled) {
        fetchFinalResults()
      } else if (!reconciliationLoading) {
        setLoading(false)
      }
    }
  }, [inventoryId, inventory?.status, isReconciled, reconciliationLoading, fetchFinalResults])

  const getResolutionBadge = (method: string | null) => {
    switch (method) {
      case 'accept_count1':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Conteo 1</Badge>
      case 'accept_count2':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Conteo 2</Badge>
      case 'manual':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Manual</Badge>
      case 'third_count':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700">3er Conteo</Badge>
      default:
        return <Badge variant="secondary">N/A</Badge>
    }
  }

  const getVarianceColor = (variance: number | null) => {
    if (!variance) return 'text-gray-500'
    if (variance <= 2) return 'text-green-600'
    if (variance <= 5) return 'text-amber-600'
    return 'text-red-600'
  }

  const getTotalStats = () => {
    const totalProducts = finalResults.length
    const totalGrams = finalResults.reduce((sum, item) => sum + item.final_total_grams, 0)
    const totalValue = finalResults.reduce((sum, item) => sum + (item.final_value || 0), 0)
    
    // Calcular variación promedio de ambos conteos respecto al resultado final
    const avgVarianceCount1 = totalProducts > 0 ? 
      finalResults.reduce((sum, item) => sum + (item.variance_from_count1_percentage || 0), 0) / totalProducts : 0
    const avgVarianceCount2 = totalProducts > 0 ? 
      finalResults.reduce((sum, item) => sum + (item.variance_from_count2_percentage || 0), 0) / totalProducts : 0
    
    // Promedio general de precisión (menor es mejor)
    const avgVarianceOverall = totalProducts > 0 ? 
      (avgVarianceCount1 + avgVarianceCount2) / 2 : 0
      
    const highVarianceProducts = finalResults.filter(item => 
      (item.variance_from_count1_percentage || 0) > 5 || 
      (item.variance_from_count2_percentage || 0) > 5
    ).length

    return {
      totalProducts,
      totalGrams,
      totalValue,
      avgVarianceCount1,
      avgVarianceCount2,
      avgVarianceOverall,
      highVarianceProducts
    }
  }

  const stats = getTotalStats()

  const generateExcelReport = () => {
    try {
      // Crear un nuevo workbook
      const wb = XLSX.utils.book_new()

      // Hoja 1: Resumen del Inventario
      const summaryData = [
        ['REPORTE FINAL DE INVENTARIO', '', '', ''],
        ['', '', '', ''],
        ['Inventario:', inventory?.name || 'N/A', '', ''],
        ['Fecha de Generación:', new Date().toLocaleString('es-ES'), '', ''],
        ['Estado:', 'Completado', '', ''],
        ['', '', '', ''],
        ['RESUMEN ESTADÍSTICO', '', '', ''],
        ['', '', '', ''],
        ['Total de Productos:', stats.totalProducts, '', ''],
        ['Total de Gramos:', stats.totalGrams.toLocaleString(), 'g', ''],
        ['Variación Promedio General:', stats.avgVarianceOverall.toFixed(2) + '%', '', ''],
        ['Variación Promedio Conteo 1:', stats.avgVarianceCount1.toFixed(2) + '%', '', ''],
        ['Variación Promedio Conteo 2:', stats.avgVarianceCount2.toFixed(2) + '%', '', ''],
        ['Productos de Alta Precisión (<5% variación):', stats.totalProducts - stats.highVarianceProducts, '', ''],
        ['Productos de Baja Precisión (≥5% variación):', stats.highVarianceProducts, '', '']
      ]
      
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
      
      // Establecer anchos de columna para la hoja resumen
      ws1['!cols'] = [
        { width: 30 }, // Columna A
        { width: 20 }, // Columna B
        { width: 10 }, // Columna C
        { width: 10 }  // Columna D
      ]

      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

      // Hoja 2: Resultados Detallados por Producto
      const detailHeaders = [
        'Código del Producto',
        'Nombre del Producto', 
        'Peso del Producto',
        'Descripción',
        'Unidad',
        'Cantidad Final',
        'Gramos por Unidad',
        'Total Gramos',
        'Valor Final',
        'Método de Resolución',
        'Variación vs Conteo 1 (%)',
        'Variación vs Conteo 2 (%)',
        'Variación Máxima (%)',
        'Observaciones'
      ]

      const detailData = finalResults.map(result => [
        result.product.id,
        result.product.name,
        result.product.weight || '',
        result.product.description || '',
        result.product.unit,
        result.final_quantity,
        result.final_grams_per_unit,
        result.final_total_grams,
        result.final_value || 0,
        getResolutionText(result.resolution_method),
        result.variance_from_count1_percentage?.toFixed(2) || '0.00',
        result.variance_from_count2_percentage?.toFixed(2) || '0.00',
        Math.max(
          result.variance_from_count1_percentage || 0,
          result.variance_from_count2_percentage || 0
        ).toFixed(2),
        result.notes || ''
      ])

      const ws2 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailData])
      
      // Establecer anchos de columna para la hoja de detalles
      ws2['!cols'] = [
        { width: 15 }, // Código
        { width: 30 }, // Nombre
        { width: 12 }, // Peso
        { width: 25 }, // Descripción
        { width: 10 }, // Unidad
        { width: 12 }, // Cantidad
        { width: 15 }, // Gramos/Unidad
        { width: 15 }, // Total Gramos
        { width: 12 }, // Valor
        { width: 18 }, // Método
        { width: 15 }, // Var 1
        { width: 15 }, // Var 2
        { width: 15 }, // Var Max
        { width: 30 }  // Observaciones
      ]

      XLSX.utils.book_append_sheet(wb, ws2, 'Resultados Detallados')

      // Generar el archivo y descargarlo
      const fileName = `Reporte_Final_Inventario_${inventory?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success('Reporte Excel generado correctamente')
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast.error('Error al generar el reporte Excel')
    }
  }

  const getResolutionText = (method: string | null) => {
    switch (method) {
      case 'accept_count1':
        return 'Conteo 1 Aceptado'
      case 'accept_count2':
        return 'Conteo 2 Aceptado'
      case 'manual':
        return 'Ajuste Manual'
      case 'third_count':
        return 'Tercer Conteo'
      default:
        return 'No Especificado'
    }
  }

  if (loading || reconciliationLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600">Cargando resultados finales...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si no está conciliado Y no está completado, mostrar estado pendiente
  // (Inventarios completados con un solo conteo no necesitan reconciliación)
  if (!isReconciled && inventory?.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-amber-600 text-white sticky top-0 z-10 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/inventory">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-amber-500 p-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold truncate">{inventory?.name || 'Inventario'}</h1>
                  <p className="text-amber-100 text-sm">Pendiente de Conciliación</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-amber-200" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-4 space-y-6">
          {/* Pending Banner */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-8">
              <div className="flex items-center justify-center text-center">
                <div>
                  <Calculator className="h-16 w-16 mx-auto mb-4 text-amber-600" />
                  <h2 className="text-2xl font-bold text-amber-800 mb-2">
                    Inventario Pendiente de Conciliación
                  </h2>
                  <p className="text-amber-700 mb-6">
                    Los conteos han sido completados, pero aún falta resolver las discrepancias para finalizar el inventario.
                  </p>

                  <div className="space-y-3">
                    <Link href={`/inventory/${inventoryId}/summary`}>
                      <Button size="lg" variant="outline" className="mr-3 border-amber-500 text-amber-700 hover:bg-amber-100">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Ver Comparación de Conteos
                      </Button>
                    </Link>

                    <Link href={`/inventory/${inventoryId}/reconciliation`}>
                      <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                        <Calculator className="h-4 w-4 mr-2" />
                        Resolver Discrepancias
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
      <div className="bg-green-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="text-white hover:bg-green-500 p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold truncate">{inventory.name}</h1>
                <p className="text-green-100 text-sm">Resultados Finales - Inventario Completado</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-green-200" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-green-500"
                onClick={generateExcelReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Success Banner */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-center">
              <div>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  ¡Inventario Completado Exitosamente!
                </h2>
                <p className="text-green-700">
                  Todos los conteos han sido conciliados y los resultados finales están listos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Productos</p>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Gramos</p>
                  <p className="text-2xl font-bold">{stats.totalGrams.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm text-gray-600">Variación Promedio</p>
                  <p className="text-2xl font-bold">
                    {stats.avgVarianceOverall.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Alta Precisión</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalProducts - stats.highVarianceProducts}
                  </p>
                  <p className="text-xs text-gray-500">productos &lt;5% variación</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Final Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Resultados Finales por Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finalResults.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No se encontraron resultados finales</p>
              </div>
            ) : (
              <div className="space-y-4">
                {finalResults.map((result, index) => (
                  <div key={result.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg truncate">{result.product.name}</h3>
                        <p className="text-sm text-gray-600">{result.product.id} • {result.product.unit}</p>
                      </div>
                      <div className="ml-4 text-right">
                        {getResolutionBadge(result.resolution_method)}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-600">Cantidad Final</p>
                        <p className="text-lg font-bold">{result.final_quantity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Gramos/Unidad</p>
                        <p className="text-lg font-bold">{result.final_grams_per_unit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total Gramos</p>
                        <p className="text-xl font-bold text-blue-600">
                          {result.final_total_grams.toLocaleString()} g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Variación Máxima</p>
                        <p className={`text-lg font-bold ${getVarianceColor(
                          Math.max(
                            result.variance_from_count1_percentage || 0,
                            result.variance_from_count2_percentage || 0
                          )
                        )}`}>
                          {Math.max(
                            result.variance_from_count1_percentage || 0,
                            result.variance_from_count2_percentage || 0
                          ).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {result.notes && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Observaciones:</strong> {result.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/inventory/${inventoryId}/summary`}>
                <Button variant="outline" size="lg">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Comparación de Conteos
                </Button>
              </Link>
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700"
                onClick={generateExcelReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Reporte Final
              </Button>
              <Link href="/inventory">
                <Button variant="outline" size="lg">
                  Volver a Inventarios
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}