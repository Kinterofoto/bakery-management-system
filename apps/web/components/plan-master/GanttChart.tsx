"use client"

import { useState, useMemo } from "react"
import { ProductionOrder, Resource } from "./mockData"
import { format, addHours, addDays, addMonths, differenceInHours, differenceInDays, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemandBreakdownModal } from "./DemandBreakdownModal"
import { InventoryDetailModal } from "./InventoryDetailModal"
import { ForecastBreakdownModal } from "./ForecastBreakdownModal"
import { useFinishedGoodsInventory } from "@/hooks/use-finished-goods-inventory"
import type { ViewMode } from "./PlanMasterDashboard"

import { Product } from "./mockData"

interface GanttChartProps {
    orders: ProductionOrder[]
    resources: Resource[]
    onPlanOrder?: (resourceId: string, product: Product) => void
    viewMode: ViewMode
}

export function GanttChart({ orders, resources, onPlanOrder, viewMode }: GanttChartProps) {
    const { inventory } = useFinishedGoodsInventory()
    const [demandModalOpen, setDemandModalOpen] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
    const [selectedProductName, setSelectedProductName] = useState<string>("")
    const [inventoryModalOpen, setInventoryModalOpen] = useState(false)
    const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<{
        id: string
        name: string
        produced: number
        dispatched: number
        available: number
    } | null>(null)
    const [forecastModalOpen, setForecastModalOpen] = useState(false)
    const [selectedForecastProduct, setSelectedForecastProduct] = useState<{
        id: string
        name: string
        forecast: number
    } | null>(null)
    // Estado para controlar qué máquinas están expandidas (por defecto todas expandidas)
    const [expandedResources, setExpandedResources] = useState<Set<string>>(() =>
        new Set(resources.map(r => r.id))
    )

    // Obtener hora actual en Colombia (UTC-5)
    const getColombiaTime = () => {
        // Convertir a hora de Colombia (America/Bogota)
        const now = new Date()
        const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
        return colombiaTime
    }

    // Calcular timeSlots dinámicamente según el viewMode
    const { timeSlots, startDate, endDate, totalUnits } = useMemo(() => {
        const now = getColombiaTime()
        const slots: Date[] = []
        let start: Date
        let end: Date
        let units: number

        switch (viewMode) {
            case 'day':
                // 24 horas del día actual
                start = startOfDay(now)
                end = addHours(start, 24)
                units = 24
                for (let i = 0; i < 24; i++) {
                    slots.push(addHours(start, i))
                }
                break

            case 'week':
                // 7 días de la semana actual
                start = startOfWeek(now, { weekStartsOn: 1 }) // Lunes
                end = endOfWeek(now, { weekStartsOn: 1 })
                units = 7
                for (let i = 0; i < 7; i++) {
                    slots.push(addDays(start, i))
                }
                break

            case 'month':
                // ~30 días del mes actual
                start = startOfMonth(now)
                end = endOfMonth(now)
                units = differenceInDays(end, start) + 1
                for (let i = 0; i < units; i++) {
                    slots.push(addDays(start, i))
                }
                break

            case 'year':
                // 12 meses del año actual
                start = startOfYear(now)
                end = endOfYear(now)
                units = 12
                for (let i = 0; i < 12; i++) {
                    slots.push(addMonths(start, i))
                }
                break

            default:
                // Fallback a día
                start = startOfDay(now)
                end = addHours(start, 24)
                units = 24
                for (let i = 0; i < 24; i++) {
                    slots.push(addHours(start, i))
                }
        }

        return { timeSlots: slots, startDate: start, endDate: end, totalUnits: units }
    }, [viewMode])

    const handleProductDemandClick = (product: Product) => {
        setSelectedProductId(product.id)
        setSelectedProductName(product.name)
        setDemandModalOpen(true)
    }

    const handleProductInventoryClick = (product: Product) => {
        const inventoryItem = inventory.find(inv => inv.productId === product.id)
        if (inventoryItem) {
            setSelectedInventoryProduct({
                id: product.id,
                name: product.name,
                produced: inventoryItem.producedQuantity,
                dispatched: inventoryItem.dispatchedQuantity,
                available: inventoryItem.quantity
            })
            setInventoryModalOpen(true)
        }
    }

    const handleProductForecastClick = (product: Product) => {
        setSelectedForecastProduct({
            id: product.id,
            name: product.name,
            forecast: product.demandForecast
        })
        setForecastModalOpen(true)
    }

    const toggleResourceExpansion = (resourceId: string) => {
        setExpandedResources(prev => {
            const newSet = new Set(prev)
            if (newSet.has(resourceId)) {
                newSet.delete(resourceId)
            } else {
                newSet.add(resourceId)
            }
            return newSet
        })
    }

    const getOrderStyle = (order: ProductionOrder) => {
        const start = new Date(order.startDate)
        const end = new Date(order.endDate)
        const dayStart = startOfDay(new Date("2023-11-20T00:00:00"))

        const startOffset = differenceInHours(start, dayStart)
        const duration = differenceInHours(end, start)

        // Apple Stocks Colors
        let colorClass = "bg-[#0A84FF] text-white" // Active (Blue)
        if (order.status === 'completed') colorClass = "bg-[#30D158] text-black font-bold" // Green
        if (order.status === 'delayed') colorClass = "bg-[#FF453A] text-white font-bold" // Red
        if (order.status === 'planned') colorClass = "bg-[#8E8E93] text-white" // Gray

        return {
            left: `${(startOffset / 24) * 100}%`,
            width: `${(duration / 24) * 100}%`,
            className: `absolute h-8 rounded-md ${colorClass} flex items-center px-2 text-xs overflow-hidden whitespace-nowrap transition-all hover:scale-[1.02] hover:z-10 cursor-pointer`
        }
    }

    // Función para formatear etiquetas según viewMode
    const formatTimeLabel = (date: Date) => {
        switch (viewMode) {
            case 'day':
                return format(date, "HH:mm", { locale: es })
            case 'week':
                return format(date, "EEE d", { locale: es })
            case 'month':
                return format(date, "d MMM", { locale: es })
            case 'year':
                return format(date, "MMM", { locale: es })
            default:
                return format(date, "HH:mm", { locale: es })
        }
    }

    // Calcular posición del momento actual como porcentaje
    const getCurrentTimePosition = () => {
        const now = getColombiaTime()

        switch (viewMode) {
            case 'day': {
                const hoursSinceStart = differenceInHours(now, startDate)
                return (hoursSinceStart / totalUnits) * 100
            }
            case 'week': {
                const daysSinceStart = differenceInDays(now, startDate)
                const hoursInDay = (now.getHours() + now.getMinutes() / 60) / 24
                return ((daysSinceStart + hoursInDay) / totalUnits) * 100
            }
            case 'month': {
                const daysSinceStart = differenceInDays(now, startDate)
                const hoursInDay = (now.getHours() + now.getMinutes() / 60) / 24
                return ((daysSinceStart + hoursInDay) / totalUnits) * 100
            }
            case 'year': {
                const monthsSinceStart = now.getMonth() - startDate.getMonth()
                const daysInMonth = now.getDate() / 30
                return ((monthsSinceStart + daysInMonth) / totalUnits) * 100
            }
            default:
                return 0
        }
    }

    const currentTimePosition = getCurrentTimePosition()

    return (
        <div className="bg-black border border-[#1C1C1E] rounded-xl overflow-hidden">
            <div className="flex">
                {/* Left Column - Fixed Sidebars */}
                <div className="w-80 flex-shrink-0 flex flex-col border-r border-[#1C1C1E] bg-black">
                    {/* Header Sidebar */}
                    <div className="p-4 border-b border-[#1C1C1E] font-semibold text-sm text-[#8E8E93] min-h-[61px] flex items-center">
                        Recurso / Inventario
                    </div>

                    {/* Resource Sidebars */}
                    {resources.map((resource) => {
                        const isExpanded = expandedResources.has(resource.id)
                        return (
                            <div key={`sidebar-${resource.id}`} className={`p-4 border-b border-[#1C1C1E] flex flex-col gap-3 transition-all duration-300 ${isExpanded ? 'min-h-[120px]' : 'min-h-[60px]'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-sm text-white block">{resource.name}</span>
                                        <span className="text-xs text-[#8E8E93] capitalize">{resource.type}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleResourceExpansion(resource.id)}
                                        className="p-1 rounded-md hover:bg-[#2C2C2E] transition-colors"
                                        title={isExpanded ? "Contraer productos" : "Expandir productos"}
                                    >
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-[#8E8E93]" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
                                        )}
                                    </button>
                                </div>

                                {/* Product List - Con animación de expansión */}
                                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="space-y-2 mt-1">
                                        {resource.products?.map(product => {
                                            const result = product.currentStock - product.pendingOrders - product.demandForecast
                                            const isShortage = result < 0
                                            const productLabel = product.weight ? `${product.name} ${product.weight}` : product.name
                                            return (
                                                <div key={product.id} className="flex items-center justify-between bg-[#1C1C1E] p-2 rounded-md text-xs">
                                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                        <span className="text-white font-medium truncate">{productLabel}</span>
                                                        <div className="flex items-center justify-between text-[11px] h-[16px]">
                                                            <div className="flex items-center gap-0.5">
                                                                <span
                                                                    className="text-[#8E8E93] cursor-pointer hover:text-white transition-colors"
                                                                    onClick={() => handleProductInventoryClick(product)}
                                                                    title="Click para ver inventario detallado"
                                                                >
                                                                    {product.currentStock}
                                                                </span>
                                                                <span className="text-[#8E8E93]">−</span>
                                                                <span
                                                                    className="text-[#8E8E93] cursor-pointer hover:text-white transition-colors"
                                                                    onClick={() => handleProductDemandClick(product)}
                                                                    title="Click para ver desglose"
                                                                >
                                                                    {product.pendingOrders}
                                                                </span>
                                                                <span className="text-[#8E8E93]">−</span>
                                                                <span
                                                                    className="text-[#8E8E93] cursor-pointer hover:text-white transition-colors"
                                                                    onClick={() => handleProductForecastClick(product)}
                                                                    title="Click para ver análisis de demanda proyectada"
                                                                >
                                                                    {product.demandForecast}
                                                                </span>
                                                                <span className="text-[#8E8E93]">=</span>
                                                            </div>
                                                            <span
                                                                className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity ${isShortage ? "text-[#FF453A]" : "text-[#30D158]"}`}
                                                                onClick={() => handleProductDemandClick(product)}
                                                                title="Click para ver desglose"
                                                            >
                                                                {result}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Right Column - Scrollable Timeline for ALL resources */}
                <div className="flex-1 overflow-x-auto">
                    {/* Timeline Header */}
                    <div className="flex border-b border-[#1C1C1E] bg-black min-h-[61px]">
                        {timeSlots.map((time, i) => (
                            <div key={i} className="flex-1 min-w-[80px] p-4 text-xs text-[#8E8E93] border-r border-[#1C1C1E] text-center font-medium">
                                {formatTimeLabel(time)}
                            </div>
                        ))}
                    </div>

                    {/* Timeline Rows */}
                    {resources.map((resource) => {
                        const isExpanded = expandedResources.has(resource.id)
                        return (
                            <div key={`timeline-${resource.id}`} className={`relative border-b border-[#1C1C1E] bg-black transition-all duration-300 group hover:bg-[#1C1C1E]/30 ${isExpanded ? 'min-h-[120px]' : 'min-h-[60px]'}`}>
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {timeSlots.map((_, i) => (
                                        <div key={i} className="flex-1 min-w-[80px] border-r border-[#1C1C1E] h-full" />
                                    ))}
                                </div>

                                {/* Current Time Line */}
                                {currentTimePosition >= 0 && currentTimePosition <= 100 && (
                                    <div
                                        className="absolute top-0 bottom-0 w-[2px] bg-[#FF453A] pointer-events-none z-20"
                                        style={{ left: `${currentTimePosition}%` }}
                                    >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FF453A] rounded-full" />
                                    </div>
                                )}

                                {/* Orders */}
                                <div className="absolute inset-0 flex items-center px-0 py-4">
                                    {orders
                                        .filter(o => o.resourceId === resource.id)
                                        .map(order => {
                                            const style = getOrderStyle(order)
                                            return (
                                                <div
                                                    key={order.id}
                                                    style={{ left: style.left, width: style.width }}
                                                    className={style.className}
                                                    title={`${order.productName} (${order.status})`}
                                                >
                                                    {order.productName}
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Demand Breakdown Modal */}
            {selectedProductId && (
                <DemandBreakdownModal
                    isOpen={demandModalOpen}
                    onClose={() => setDemandModalOpen(false)}
                    productId={selectedProductId}
                    productName={selectedProductName}
                />
            )}

            {/* Inventory Detail Modal */}
            {selectedInventoryProduct && (
                <InventoryDetailModal
                    open={inventoryModalOpen}
                    onOpenChange={(open) => {
                        setInventoryModalOpen(open)
                        if (!open) setSelectedInventoryProduct(null)
                    }}
                    productId={selectedInventoryProduct.id}
                    productName={selectedInventoryProduct.name}
                    totalProduced={selectedInventoryProduct.produced}
                    totalDispatched={selectedInventoryProduct.dispatched}
                    available={selectedInventoryProduct.available}
                />
            )}

            {/* Forecast Breakdown Modal */}
            {selectedForecastProduct && (
                <ForecastBreakdownModal
                    isOpen={forecastModalOpen}
                    onClose={() => {
                        setForecastModalOpen(false)
                        setSelectedForecastProduct(null)
                    }}
                    productId={selectedForecastProduct.id}
                    productName={selectedForecastProduct.name}
                    emaForecast={selectedForecastProduct.forecast}
                />
            )}
        </div>
    )
}
