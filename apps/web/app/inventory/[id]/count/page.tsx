"use client"

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Calculator, 
  Search, 
  Plus, 
  ShoppingCart, 
  ArrowLeft, 
  Package,
  X,
  Check,
  RotateCcw,
  List,
  Trash2,
  AlertTriangle,
  Save,
  Edit2
} from "lucide-react"
import { useInventories } from '@/hooks/use-inventories'
import { useInventoryCounts } from '@/hooks/use-inventory-counts'
import { useProducts } from '@/hooks/use-products'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

type View = 'search' | 'calculator' | 'cart'

interface CalculatorState {
  selectedProduct: any
  quantityBoxes: string
  quantityUnits: string
  gramsPerUnit: string
  currentResult: number
  accumulatedTotal: number
}

export default function InventoryCountPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const inventoryId = params.id as string
  const isSecondCount = searchParams.get('second') === 'true'
  
  // Helper function to format product name with weight
  const getProductDisplayName = (product: any) => {
    if (product.weight && product.weight.trim()) {
      return `${product.name} - ${product.weight}`
    }
    return product.name
  }
  
  // Helper functions for product category-based labels and units
  const isFinishedProduct = (product: any) => {
    return product?.category === 'PT'
  }
  
  const getUnitLabel = (product: any) => {
    return isFinishedProduct(product) ? 'und' : 'g'
  }
  
  const getQuantityLabel = (product: any) => {
    return isFinishedProduct(product) ? 'UND' : 'G'
  }
  
  const getPackageLabel = () => {
    return 'Empaques'
  }
  
  const { inventories, updateInventory } = useInventories()
  const { counts, addCountItem, removeCountItem, completeCount, getFirstCountProducts, getOrCreateActiveCount } = useInventoryCounts(inventoryId)
  const { filteredProducts, searchTerm, setSearchTerm } = useProducts()
  
  const [currentView, setCurrentView] = useState<View>('search')
  const [activeCount, setActiveCount] = useState<any>(null)
  const [cart, setCart] = useState<any[]>([])
  const [firstCountProducts, setFirstCountProducts] = useState<any[]>([])
  const [countedProductIds, setCountedProductIds] = useState<Set<string>>(new Set())
  
  // Filter state for MP/PT categories
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'MP' | 'PT'>('all')
  const [visibleProducts, setVisibleProducts] = useState(20)
  
  // Sistema de backup para productos en edición
  const [editingBackup, setEditingBackup] = useState<any>(null)
  
  // Estados para el modal de confirmación
  const [showExitModal, setShowExitModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    selectedProduct: null,
    quantityBoxes: '1',
    quantityUnits: '1',
    gramsPerUnit: '1',
    currentResult: 0,
    accumulatedTotal: 0
  })

  const inventory = inventories.find(inv => inv.id === inventoryId)

  // Filter products by category and search term
  const getFilteredProducts = () => {
    let products = filteredProducts
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      products = products.filter(product => product.category === categoryFilter)
    }
    
    return products
  }

  // Handle infinite scroll
  const handleLoadMore = () => {
    setVisibleProducts(prev => prev + 20)
  }
  
  // Reset visible products when search term or category filter changes
  useEffect(() => {
    setVisibleProducts(20)
  }, [searchTerm, categoryFilter])

  // Automatic scroll loading
  useEffect(() => {
    const handleScroll = () => {
      if (currentView !== 'search') return
      
      const scrollTop = document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Load more when user is 100px from bottom
      if (scrollTop + windowHeight >= documentHeight - 100) {
        const totalFiltered = getFilteredProducts().length
        if (visibleProducts < totalFiltered) {
          setVisibleProducts(prev => Math.min(prev + 20, totalFiltered))
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [currentView, visibleProducts, searchTerm, categoryFilter, getFilteredProducts])

  useEffect(() => {
    if (inventoryId) {
      const countNumber = isSecondCount ? 2 : 1
      getOrCreateActiveCount(inventoryId, countNumber)
        .then(count => setActiveCount(count))
        .catch(err => console.error('Error creating count:', err))
      
      // Si es segundo conteo, cargar productos del primer conteo
      if (isSecondCount) {
        getFirstCountProducts(inventoryId)
          .then(products => {
            setFirstCountProducts(products)
          })
          .catch(err => console.error('Error loading first count products:', err))
      }
    }
  }, [inventoryId, isSecondCount, getOrCreateActiveCount, getFirstCountProducts])


  // Actualizar productos contados cuando cambie el carrito
  useEffect(() => {
    const countedIds = new Set(cart.map(item => item.product.id))
    setCountedProductIds(countedIds)
  }, [cart])

  useEffect(() => {
    const boxes = parseFloat(calculatorState.quantityBoxes) || 0
    const units = parseFloat(calculatorState.quantityUnits) || 0
    const grams = parseFloat(calculatorState.gramsPerUnit) || 0
    setCalculatorState(prev => ({
      ...prev,
      currentResult: boxes * units * grams
    }))
  }, [calculatorState.quantityBoxes, calculatorState.quantityUnits, calculatorState.gramsPerUnit])

  // Cargar datos existentes del conteo activo para restaurar la sesión
  useEffect(() => {
    if (activeCount && activeCount.inventory_count_items) {
      const existingItems = activeCount.inventory_count_items.map((item: any) => ({
        id: item.id, // Usar el ID real de la base de datos
        product: item.product,
        quantityUnits: item.quantity_units,
        gramsPerUnit: item.grams_per_unit,
        totalGrams: item.total_grams,
        notes: item.notes
      }))
      
      if (existingItems.length > 0) {
        setCart(existingItems)
        toast.success(`✓ Continuando conteo: ${existingItems.length} productos cargados`)
      }
    }
  }, [activeCount])

  const handleClearAll = () => {
    setCalculatorState(prev => ({
      ...prev,
      quantityBoxes: '1',
      quantityUnits: '1',
      gramsPerUnit: '1',
      currentResult: 0,
      accumulatedTotal: 0
    }))
  }

  const handleAddToTotal = () => {
    if (calculatorState.currentResult > 0) {
      // Haptic feedback más fuerte para acciones importantes
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]) // Patrón de vibración
      }
      
      setCalculatorState(prev => ({
        ...prev,
        accumulatedTotal: prev.accumulatedTotal + prev.currentResult
      }))
      const unit = calculatorState.selectedProduct ? getUnitLabel(calculatorState.selectedProduct) : 'g'
      toast.success(`+${calculatorState.currentResult.toLocaleString()}${unit} agregado`)
    }
  }

  // Función para restaurar un producto del backup
  const restoreEditingBackup = async () => {
    if (!editingBackup || !activeCount) return

    try {
      // Recrear el item en la base de datos con los datos originales
      const countItem = await addCountItem({
        inventory_count_id: activeCount.id,
        product_id: editingBackup.product.id,
        quantity_units: editingBackup.quantityUnits,
        grams_per_unit: editingBackup.gramsPerUnit,
        notes: editingBackup.notes || `Restaurado: ${editingBackup.totalGrams}${getUnitLabel(editingBackup.product)}`
      })

      // Restaurar en el carrito con el nuevo ID
      const restoredItem = {
        id: countItem.id,
        product: editingBackup.product,
        quantityUnits: editingBackup.quantityUnits,
        gramsPerUnit: editingBackup.gramsPerUnit,
        totalGrams: editingBackup.totalGrams
      }

      setCart(prev => [...prev, restoredItem])
      setEditingBackup(null)
      
      toast.success(`${getProductDisplayName(editingBackup.product)} restaurado al carrito`)
    } catch (error) {
      toast.error('Error al restaurar el producto')
    }
  }

  const handleSelectProduct = async (product: any) => {
    // Si hay un backup de edición y es un producto diferente, restaurar primero
    if (editingBackup && editingBackup.product.id !== product.id) {
      await restoreEditingBackup()
    }
    
    // Si estamos seleccionando el mismo producto que está en edición, limpiar el backup
    if (editingBackup && editingBackup.product.id === product.id) {
      setEditingBackup(null)
    }
    
    setCalculatorState(prev => ({
      ...prev,
      selectedProduct: product,
      quantityBoxes: '1',
      quantityUnits: '1',
      gramsPerUnit: '1',
      currentResult: 0,
      accumulatedTotal: 0
    }))
    setCurrentView('calculator')
    setSearchTerm('')
  }

  const handleAddToCart = async () => {
    if (!calculatorState.selectedProduct || !activeCount) {
      toast.error('Error: producto no seleccionado')
      return
    }

    if (calculatorState.accumulatedTotal <= 0) {
      toast.error('Agrega al menos una medición')
      return
    }

    try {
      // En lugar de dividir, guardamos el total acumulado como gramos por unidad y 1 unidad
      // Esto preserva la información exacta del peso medido
      const countItem = await addCountItem({
        inventory_count_id: activeCount.id,
        product_id: calculatorState.selectedProduct.id,
        quantity_units: 1,
        grams_per_unit: calculatorState.accumulatedTotal,
        notes: `Total acumulado: ${calculatorState.accumulatedTotal}${getUnitLabel(calculatorState.selectedProduct)}`
      })

      const cartItem = {
        id: countItem.id,
        product: calculatorState.selectedProduct,
        quantityUnits: 1,
        gramsPerUnit: calculatorState.accumulatedTotal,
        totalGrams: calculatorState.accumulatedTotal
      }

      setCart(prev => [...prev, cartItem])
      
      // Limpiar backup si estábamos editando este producto
      if (editingBackup && editingBackup.product.id === calculatorState.selectedProduct.id) {
        setEditingBackup(null)
      }
      
      setCalculatorState({
        selectedProduct: null,
        quantityBoxes: '1',
        quantityUnits: '1',
        gramsPerUnit: '1',
        currentResult: 0,
        accumulatedTotal: 0
      })

      setCurrentView('search')
      toast.success('✓ Producto agregado')
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleRemoveFromCart = async (cartItemId: string, productName: string) => {
    try {
      await removeCountItem(cartItemId)
      setCart(prev => prev.filter(item => item.id !== cartItemId))
      toast.success(`${productName} eliminado del conteo`)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleEditFromCart = async (cartItem: any) => {
    try {
      // Crear backup del item antes de eliminarlo
      setEditingBackup(cartItem)
      
      // Eliminar el item del carrito y de la base de datos
      await removeCountItem(cartItem.id)
      setCart(prev => prev.filter(item => item.id !== cartItem.id))
      
      // Establecer el producto en la calculadora con los valores anteriores
      setCalculatorState({
        selectedProduct: cartItem.product,
        quantityBoxes: '1',
        quantityUnits: '1',
        gramsPerUnit: '1',
        currentResult: 0,
        accumulatedTotal: cartItem.totalGrams || 0
      })
      
      // Cambiar a la vista de calculadora
      setCurrentView('calculator')
      
      toast.success(`${getProductDisplayName(cartItem.product)} cargado en la calculadora para editar`)
    } catch (error) {
      toast.error('Error al editar el producto')
    }
  }

  // Funciones para manejar navegación con confirmación
  const handleNavigationAttempt = (url: string) => {
    // Permitir navegación libre ya que todo se guarda inmediatamente
    router.push(url)
  }

  const handleSaveAndExit = async () => {
    try {
      // Finalizar el conteo completamente
      await handleFinishCount()

      // El handleFinishCount ya redirige, pero por si acaso...
      setTimeout(() => {
        if (pendingNavigation) {
          router.push(pendingNavigation)
        }
      }, 1000)
    } catch (error) {
      toast.error('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setShowExitModal(false)
      setPendingNavigation(null)
    }
  }

  const handleDiscardAndExit = async () => {
    try {
      // Limpiar carrito local
      setCart([])
      
      // Asegurar que el conteo quede como 'in_progress' para poder continuarlo
      if (activeCount) {
        const { error } = await supabase
          .from('inventory_counts')
          .update({ 
            status: 'in_progress',
            completed_at: null 
          })
          .eq('id', activeCount.id)
        
        if (error) {
          console.error('Error al actualizar estado del conteo:', error)
        }
      }
      
      // Navegar
      if (pendingNavigation) {
        router.push(pendingNavigation)
      }
      
    } catch (error) {
      console.error('Error al descartar cambios:', error)
      toast.error('Error al salir. Inténtalo de nuevo.')
    } finally {
      setShowExitModal(false)
      setPendingNavigation(null)
    }
  }

  const handleCancelExit = () => {
    setShowExitModal(false)
    setPendingNavigation(null)
  }

  const handleFinishCount = async () => {
    if (!activeCount) return

    // Validar que en segundo conteo se hayan contado todos los productos obligatorios
    if (isSecondCount && firstCountProducts.length > 0) {
      const uncountedProducts = firstCountProducts.filter(product => 
        !countedProductIds.has(product.id)
      )
      
      if (uncountedProducts.length > 0) {
        toast.error(`Debes contar estos productos del primer conteo: ${uncountedProducts.map(p => p.name).join(', ')}`)
        return
      }
    }

    try {
      await completeCount(activeCount.id)
      
      if (isSecondCount) {
        await updateInventory(inventoryId, { status: 'completed' })
        toast.success('¡Segundo conteo completado! Inventario terminado.')
      } else {
        await updateInventory(inventoryId, { status: 'in_progress' })
        toast.success('¡Primer conteo completado! Ya puedes hacer el segundo conteo.')
      }
      
      router.push('/inventory')
    } catch (error) {
      // Errors handled by hooks
    }
  }

  if (!inventory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-red-600 text-lg">Inventario no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* MOBILE HEADER - STICKY */}
      <div className="bg-blue-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-blue-500 p-2"
                onClick={() => handleNavigationAttempt('/inventory')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold truncate">{inventory.name}</h1>
                <p className="text-blue-100 text-sm">
                  {isSecondCount ? '2do Conteo' : '1er Conteo'}
                </p>
              </div>
            </div>
            
            <Badge variant="secondary" className="bg-blue-800 text-blue-100 border-blue-700">
              <Calculator className="h-3 w-3 mr-1" />
              CountPro
            </Badge>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-t border-blue-500">
          <button
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              currentView === 'search' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-500'
            }`}
            onClick={async () => {
              // Restaurar backup si existe y no se han hecho cambios al producto en edición
              if (editingBackup && calculatorState.selectedProduct && 
                  editingBackup.product.id === calculatorState.selectedProduct.id &&
                  calculatorState.accumulatedTotal === editingBackup.totalGrams) {
                await restoreEditingBackup()
              }
              setCurrentView('search')
            }}
          >
            <Search className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs">Buscar</div>
          </button>
          <button
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              currentView === 'calculator' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-500'
            }`}
            onClick={() => setCurrentView('calculator')}
            disabled={!calculatorState.selectedProduct}
          >
            <Calculator className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs">Calcular</div>
          </button>
          <button
            className={`flex-1 py-3 px-2 text-center transition-colors relative ${
              currentView === 'cart' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-500'
            }`}
            onClick={async () => {
              // Restaurar backup si existe y no se han hecho cambios al producto en edición
              if (editingBackup && calculatorState.selectedProduct && 
                  editingBackup.product.id === calculatorState.selectedProduct.id &&
                  calculatorState.accumulatedTotal === editingBackup.totalGrams) {
                await restoreEditingBackup()
              }
              setCurrentView('cart')
            }}
          >
            <ShoppingCart className="h-4 w-4 mx-auto mb-1" />
            <div className="text-xs">Carrito</div>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Indicador de producto en edición */}
      {editingBackup && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-4 mt-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="text-amber-800 text-sm">
              <strong>⚠️ Producto en edición:</strong> {getProductDisplayName(editingBackup.product)} ({editingBackup.totalGrams.toLocaleString()}{getUnitLabel(editingBackup.product)})
            </div>
          </div>
          <div className="text-amber-600 text-xs mt-1">
            Se restaurará automáticamente si no guardas los cambios
          </div>
        </div>
      )}

      {/* SEARCH VIEW */}
      {currentView === 'search' && (
        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <Input
              placeholder="Buscar producto por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-lg h-14 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoFocus
              autoComplete="off"
              inputMode="text"
            />
            
            {/* Category Filter Chips */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategoryFilter('all')
                  setVisibleProducts(20)
                }}
                className="h-8 px-4 text-sm font-medium"
              >
                Todos
              </Button>
              <Button
                variant={categoryFilter === 'MP' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategoryFilter('MP')
                  setVisibleProducts(20)
                }}
                className="h-8 px-4 text-sm font-medium"
              >
                MP
              </Button>
              <Button
                variant={categoryFilter === 'PT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategoryFilter('PT')
                  setVisibleProducts(20)
                }}
                className="h-8 px-4 text-sm font-medium"
              >
                PT
              </Button>
            </div>
          </div>

          {/* Selected Product Display */}
          {calculatorState.selectedProduct && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-green-800 font-semibold text-lg">
                    ✓ {getProductDisplayName(calculatorState.selectedProduct)}
                  </div>
                  <div className="text-green-600 text-sm">
                    {calculatorState.selectedProduct.id}
                  </div>
                </div>
                <Button
                  onClick={() => setCurrentView('calculator')}
                  className="bg-green-600 hover:bg-green-700 h-12 px-6"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Productos Obligatorios (solo en segundo conteo) */}
          {isSecondCount && firstCountProducts.length > 0 && (
            <div className="space-y-2">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <h3 className="text-amber-800 font-semibold mb-2">
                  📋 Productos del Primer Conteo (Obligatorios)
                </h3>
                <p className="text-amber-700 text-sm">
                  Debes contar todos estos productos (puedes poner 0 si no los encuentras)
                </p>
              </div>
              
              {firstCountProducts.map((product) => {
                const isCounted = countedProductIds.has(product.id)
                return (
                  <div
                    key={product.id}
                    className={`rounded-xl p-4 shadow-sm active:bg-gray-50 transition-colors border-2 ${
                      isCounted 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-red-200'
                    }`}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-lg truncate flex items-center gap-2">
                          {isCounted ? (
                            <span className="text-green-600">✅</span>
                          ) : (
                            <span className="text-red-500">❌</span>
                          )}
                          {getProductDisplayName(product)}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {product.id} • {product.unit}
                          {isCounted && <span className="text-green-600 ml-2">• Contado</span>}
                          {!isCounted && <span className="text-red-500 ml-2">• Pendiente</span>}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Package className={`h-6 w-6 ${isCounted ? 'text-green-400' : 'text-red-400'}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Productos Adicionales */}
          {isSecondCount && searchTerm && (
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <h4 className="text-blue-800 font-semibold text-sm">
                  ➕ Productos Adicionales (Opcionales)
                </h4>
              </div>
              
              {getFilteredProducts()
                .filter(product => !firstCountProducts.some(fp => fp.id === product.id))
                .slice(0, visibleProducts)
                .map((product) => {
                  const isInCart = countedProductIds.has(product.id)
                  return (
                    <div
                      key={product.id}
                      className={`rounded-xl p-4 shadow-sm active:bg-gray-50 transition-colors border ${
                        isInCart 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-white border-blue-200'
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-lg truncate flex items-center gap-2">
                            {isInCart && <span className="text-green-600">✓</span>}
                            {getProductDisplayName(product)}
                          </div>
                          <div className="text-gray-600 text-sm flex items-center gap-2">
                            {product.id} • {product.unit}
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                            <span className="text-blue-600">• Adicional</span>
                            {isInCart && <span className="text-green-600 font-medium">• Contado</span>}
                          </div>
                        </div>
                        <div className="ml-4">
                          <Package className={`h-6 w-6 ${isInCart ? 'text-green-400' : 'text-blue-400'}`} />
                        </div>
                      </div>
                    </div>
                  )
                })
              }
              
              {/* Loading indicator for Additional Products */}
              {searchTerm && 
               getFilteredProducts().filter(product => !firstCountProducts.some(fp => fp.id === product.id)).length > visibleProducts && (
                <div className="text-center pt-4 pb-2">
                  <div className="text-blue-600 text-sm">
                    Desliza hacia abajo para cargar más productos adicionales
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Productos Normales (primer conteo) */}
          {!isSecondCount && (
            <div className="space-y-2">
              {getFilteredProducts().slice(0, visibleProducts).map((product) => {
                const isInCart = countedProductIds.has(product.id)
                return (
                  <div
                    key={product.id}
                    className={`rounded-xl p-4 shadow-sm active:bg-gray-50 transition-colors border-2 ${
                      isInCart 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-white border-gray-200'
                    }`}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-lg truncate flex items-center gap-2">
                          {isInCart && <span className="text-green-600">✓</span>}
                          {getProductDisplayName(product)}
                        </div>
                        <div className="text-gray-600 text-sm flex items-center gap-2">
                          {product.id} • {product.unit}
                          {product.category && (
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                          {isInCart && <span className="text-green-600 font-medium">• Contado</span>}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Package className={`h-6 w-6 ${isInCart ? 'text-green-400' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Loading indicator */}
              {visibleProducts < getFilteredProducts().length && (
                <div className="text-center pt-4 pb-2">
                  <div className="text-gray-500 text-sm">
                    Mostrando {visibleProducts} de {getFilteredProducts().length} productos
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Desliza hacia abajo para cargar más
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CALCULATOR VIEW */}
      {currentView === 'calculator' && calculatorState.selectedProduct && (
        <div className="p-4 space-y-4">
          {/* Product Header */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 mb-1">
                {getProductDisplayName(calculatorState.selectedProduct)}
              </div>
              <div className="text-gray-600 text-sm">
                {calculatorState.selectedProduct.id}
              </div>
            </div>
          </div>

          {/* Input Fields - All in one row */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Cajas
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={calculatorState.quantityBoxes}
                  onChange={(e) => setCalculatorState(prev => ({ ...prev, quantityBoxes: e.target.value }))}
                  className="text-xl font-bold text-center h-14 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="1"
                  min="0"
                  step="0.001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  {getPackageLabel()}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={calculatorState.quantityUnits}
                  onChange={(e) => setCalculatorState(prev => ({ ...prev, quantityUnits: e.target.value }))}
                  className="text-xl font-bold text-center h-14 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="50"
                  min="0"
                  step="0.001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  {getQuantityLabel(calculatorState.selectedProduct)}
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={calculatorState.gramsPerUnit}
                  onChange={(e) => setCalculatorState(prev => ({ ...prev, gramsPerUnit: e.target.value }))}
                  className="text-xl font-bold text-center h-14 border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="1000"
                  min="0"
                  step="0.001"
                />
              </div>
            </div>
          </div>

          {/* Result Display */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center space-y-4">
              <div>
                <div className="text-gray-600 text-sm mb-1">Resultado Actual</div>
                <div className="text-4xl font-bold text-blue-600">
                  {calculatorState.currentResult.toLocaleString()} {calculatorState.selectedProduct ? getUnitLabel(calculatorState.selectedProduct) : 'g'}
                </div>
              </div>
              
              {calculatorState.accumulatedTotal > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-800 text-sm mb-1">Total Acumulado</div>
                  <div className="text-3xl font-bold text-green-600">
                    {calculatorState.accumulatedTotal.toLocaleString()} {calculatorState.selectedProduct ? getUnitLabel(calculatorState.selectedProduct) : 'g'}
                  </div>
                  <div className="text-green-600 text-xs mt-1">
                    💡 Este total incluye mediciones anteriores
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              <Button 
                onClick={handleAddToTotal}
                disabled={calculatorState.currentResult <= 0}
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar al Total ({calculatorState.currentResult.toLocaleString()}{calculatorState.selectedProduct ? getUnitLabel(calculatorState.selectedProduct) : 'g'})
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={handleClearAll}
                  variant="outline"
                  className="h-12 text-lg font-bold hover:bg-red-50 text-red-600"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Limpiar
                </Button>
                
                {calculatorState.accumulatedTotal > 0 && (
                  <Button 
                    onClick={handleAddToCart}
                    className="h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Guardar
                  </Button>
                )}
              </div>

              {calculatorState.accumulatedTotal > 0 && calculatorState.currentResult > 0 && (
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Tip:</strong> Puedes seguir agregando más mediciones del mismo producto al total antes de guardarlo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CART VIEW */}
      {currentView === 'cart' && (
        <div className="p-4 space-y-4">
          {/* Header Stats */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {cart.length}
              </div>
              <div className="text-gray-600">
                Productos Contados
              </div>
            </div>
          </div>

          {/* Progreso en Segundo Conteo */}
          {isSecondCount && firstCountProducts.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <div className="text-center">
                <div className="text-amber-800 font-semibold mb-2">
                  Progreso del Segundo Conteo
                </div>
                <div className="flex justify-center items-center gap-2 mb-2">
                  <div className="text-2xl font-bold text-amber-700">
                    {countedProductIds.size} / {firstCountProducts.length}
                  </div>
                  <div className="text-amber-600">productos obligatorios</div>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-3">
                  <div 
                    className="bg-amber-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(countedProductIds.size / firstCountProducts.length) * 100}%` }}
                  ></div>
                </div>
                {countedProductIds.size < firstCountProducts.length && (
                  <p className="text-amber-700 text-sm mt-2">
                    Faltan {firstCountProducts.length - countedProductIds.size} productos obligatorios
                  </p>
                )}
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <div className="text-gray-600 text-lg mb-4">
                No hay productos en el carrito
              </div>
              <Button 
                onClick={() => setCurrentView('search')}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
              >
                Agregar Productos
              </Button>
            </div>
          ) : (
            <>
              {/* Lista de Productos */}
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={item.id || index} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-lg truncate flex items-center gap-2">
                          {getProductDisplayName(item.product)}
                          {isSecondCount && firstCountProducts.some(fp => fp.id === item.product.id) && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Obligatorio
                            </span>
                          )}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {item.product.id} • {item.product.unit}
                        </div>
                        <div className="text-blue-600 font-bold text-lg">
                          {(item.totalGrams || 0).toLocaleString()} {getUnitLabel(item.product)}
                        </div>
                      </div>
                      <div className="ml-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditFromCart(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFromCart(item.id, getProductDisplayName(item.product))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen Total */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-green-800 text-lg font-semibold">
                    Total: {cart.length} productos contados
                  </div>
                  <div className="text-green-600 text-sm mt-1">
                    {isSecondCount ? 'Segundo conteo en progreso' : 'Primer conteo en progreso'}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-3">
                <Button 
                  onClick={() => setCurrentView('search')}
                  variant="outline"
                  className="w-full h-12 text-lg font-bold"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Más Productos
                </Button>

                {cart.length > 0 && (
                  <Button 
                    onClick={handleFinishCount}
                    className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-lg"
                  >
                    <Check className="h-6 w-6 mr-2" />
                    Finalizar {isSecondCount ? 'Segundo' : 'Primer'} Conteo
                  </Button>
                )}

                {isSecondCount && countedProductIds.size < firstCountProducts.length && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-red-700 text-sm text-center">
                      ⚠️ No puedes finalizar hasta contar todos los productos obligatorios
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de confirmación al salir */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              ¿Salir del conteo?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">Tienes productos contados pendientes de finalizar.</p>
              <p className="font-medium">¿Qué quieres hacer?</p>
            </div>

            <div className="grid gap-2">
              <Button 
                onClick={handleSaveAndExit} 
                className="bg-green-600 hover:bg-green-700 h-12"
              >
                <Save className="h-4 w-4 mr-2" />
                Finalizar Conteo y Salir
              </Button>
              
              <Button 
                onClick={handleDiscardAndExit} 
                variant="outline" 
                className="text-blue-600 border-blue-300 hover:bg-blue-50 h-12"
              >
                <Package className="h-4 w-4 mr-2" />
                Guardar y Continuar Más Tarde
              </Button>
              
              <Button 
                onClick={handleCancelExit} 
                variant="outline" 
                className="h-12"
              >
                Cancelar - Continuar Conteo
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Tu progreso se guarda automáticamente. Puedes continuar el conteo cuando quieras.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}