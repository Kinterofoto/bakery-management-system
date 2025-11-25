"use client"

import { useMemo, useEffect, useState } from "react"
import { GanttChart } from "./GanttChart"
import { Resource, ProductionOrder, Product } from "./mockData"
import { formatNumber } from "@/lib/format-utils"
import { Home, Filter, Calendar as CalendarIcon, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { useFinishedGoodsInventory } from "@/hooks/use-finished-goods-inventory"
import { useProductOperations } from "@/hooks/use-product-operations"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import { useProducts } from "@/hooks/use-products"
import { useProductDemand } from "@/hooks/use-product-demand"
import { useProductDemandForecast } from "@/hooks/use-product-demand-forecast"
import { addHours, startOfDay } from "date-fns"
import Link from "next/link"

export type ViewMode = 'day' | 'week' | 'month' | 'year'

export function PlanMasterDashboard() {
    const [orders, setOrders] = useState<ProductionOrder[]>([])
    const [armadoOperationId, setArmadoOperationId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('week')

    const { workCenters, loading } = useWorkCenters()
    const { inventory, loading: inventoryLoading } = useFinishedGoodsInventory()
    const { operations } = useProductOperations()
    const { mappings } = useProductWorkCenterMapping()
    const { getAllProducts } = useProducts()
    const { demand, getDemandByProductId } = useProductDemand()
    const { getForecastByProductId } = useProductDemandForecast()
    const [allProducts, setAllProducts] = useState<any[]>([])

    // Get the ID of "Armado" operation
    useEffect(() => {
        const armadoOp = operations.find(op => op.name.toLowerCase() === "armado")
        if (armadoOp) {
            setArmadoOperationId(armadoOp.id)
        }
    }, [operations])

    // Load all products (including inactive)
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const products = await getAllProducts(true) // true = includeInactive
                setAllProducts(products)
            } catch (error) {
                console.error("Error loading products:", error)
            }
        }
        loadProducts()
    }, [getAllProducts])

    const resources: Resource[] = useMemo(() => {
        if (loading || !armadoOperationId || allProducts.length === 0) {
            return []
        }

        // Filter active work centers that belong to "Armado" operation
        const activeCenters = workCenters.filter(wc =>
            wc.operation_id === armadoOperationId &&
            (!wc.status || ['active', 'ACTIVO', 'Active'].includes(wc.status))
        )

        if (activeCenters.length === 0) {
            return []
        }

        return activeCenters.map((wc) => {
            // Get products assigned to this work center for Armado operation
            const assignedProductIds = mappings
                .filter(m =>
                    m.work_center_id === wc.id &&
                    m.operation_id === armadoOperationId
                )
                .map(m => m.product_id)

            // Get actual product details with inventory and demand
            const assignedProducts = allProducts
                .filter(p => assignedProductIds.includes(p.id))
                .map(p => {
                    // Find inventory for this product (using productId from inventory)
                    const inventoryItem = inventory.find(inv => inv.productId === p.id)
                    const currentStock = inventoryItem?.quantity || 0

                    // Get pending orders (demand) for this product
                    const pendingOrders = getDemandByProductId(p.id)

                    // Get EMA demand forecast for this product
                    const demandForecast = Math.ceil(getForecastByProductId(p.id))

                    return {
                        id: p.id,
                        name: p.name,
                        weight: p.weight,
                        sku: p.code || p.id,
                        suggestedProduction: 100,
                        currentStock: currentStock,
                        pendingOrders: pendingOrders,
                        demandForecast: demandForecast
                    }
                })

            return {
                id: wc.id,
                name: wc.name,
                type: 'machine',
                capacity: 100,
                products: assignedProducts
            }
        })
    }, [workCenters, loading, armadoOperationId, mappings, allProducts, inventory, demand, getDemandByProductId, getForecastByProductId])

    // Initialize orders - empty for now (real orders will be loaded from production system)
    useEffect(() => {
        setOrders([])
    }, [resources, loading])

    const handlePlanOrder = (resourceId: string, product: Product) => {
        const newOrder: ProductionOrder = {
            id: `new-${Date.now()}`,
            orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
            productName: product.name,
            sku: `SKU-${product.id}`,
            quantity: product.suggestedProduction || 100,
            startDate: addHours(startOfDay(new Date("2023-11-20T00:00:00")), 8).toISOString(), // Start at 8 AM
            endDate: addHours(startOfDay(new Date("2023-11-20T00:00:00")), 12).toISOString(), // 4 hours duration
            status: 'planned',
            resourceId: resourceId,
            progress: 0
        }
        setOrders(prev => [...prev, newOrder])
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Fixed Header Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#1C1C1E]">
                <div className="container mx-auto px-4 py-3 md:px-8 max-w-7xl">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left side - Home icon and Title */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="p-2 rounded-md hover:bg-[#1C1C1E] transition-colors">
                                <Home className="w-5 h-5 text-white" />
                            </Link>
                            <h1 className="text-lg font-bold tracking-tight text-white">Plan Master</h1>
                        </div>

                        {/* Right side - View modes and Inventory */}
                        <div className="flex items-center gap-2">
                            <Link href="/planmaster/inventory">
                                <Button className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E] font-medium rounded-full h-9 px-4 text-sm">
                                    <Package className="w-4 h-4 mr-2 text-[#FF9500]" />
                                    Inventario
                                    {!inventoryLoading && inventory.length > 0 && (
                                        <span className="ml-2 bg-[#FF9500]/20 text-[#FF9500] text-xs px-2 rounded-full">
                                            {formatNumber(inventory.reduce((sum, item) => sum + item.quantity, 0))}
                                        </span>
                                    )}
                                </Button>
                            </Link>

                            {/* View Mode Buttons */}
                            <div className="flex items-center gap-1 bg-[#1C1C1E] rounded-full p-1">
                                <Button
                                    onClick={() => setViewMode('day')}
                                    className={`h-7 px-3 text-xs font-medium rounded-full transition-all ${
                                        viewMode === 'day'
                                            ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                                            : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                                    }`}
                                >
                                    Día
                                </Button>
                                <Button
                                    onClick={() => setViewMode('week')}
                                    className={`h-7 px-3 text-xs font-medium rounded-full transition-all ${
                                        viewMode === 'week'
                                            ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                                            : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                                    }`}
                                >
                                    Semana
                                </Button>
                                <Button
                                    onClick={() => setViewMode('month')}
                                    className={`h-7 px-3 text-xs font-medium rounded-full transition-all ${
                                        viewMode === 'month'
                                            ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                                            : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                                    }`}
                                >
                                    Mes
                                </Button>
                                <Button
                                    onClick={() => setViewMode('year')}
                                    className={`h-7 px-3 text-xs font-medium rounded-full transition-all ${
                                        viewMode === 'year'
                                            ? 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90'
                                            : 'bg-transparent text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                                    }`}
                                >
                                    Año
                                </Button>
                            </div>

                            <Button variant="outline" className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E] font-medium rounded-full h-9 px-4 text-sm">
                                <Filter className="w-4 h-4 mr-2 text-[#0A84FF]" />
                                Filtros
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area - with top padding for fixed header */}
            <div className="flex-1 pt-16 overflow-auto">
                <div className="w-full">
                    <GanttChart
                        orders={orders}
                        resources={resources}
                        onPlanOrder={handlePlanOrder}
                        viewMode={viewMode}
                    />
                </div>
            </div>
        </div>
    )
}
