"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { ProductionOrder, Resource, Product } from "./mockData"
import { format, addHours, addDays, addMonths, differenceInHours, differenceInDays, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, getWeek } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemandBreakdownModal } from "./DemandBreakdownModal"
import { InventoryDetailModal } from "./InventoryDetailModal"
import { ForecastBreakdownModal } from "./ForecastBreakdownModal"
import { PlanningModal } from "./PlanningModal"
import { ScheduleBlock } from "./ScheduleBlock"
import { useFinishedGoodsInventory } from "@/hooks/use-finished-goods-inventory"
import { useProductionSchedules, type ProductionSchedule } from "@/hooks/use-production-schedules"
import type { ViewMode } from "./PlanMasterDashboard"

interface GanttChartProps {
    orders: ProductionOrder[]
    resources: Resource[]
    onPlanOrder?: (resourceId: string, product: Product) => void
    viewMode: ViewMode
}

export function GanttChart({ orders, resources, onPlanOrder, viewMode }: GanttChartProps) {
    const { inventory } = useFinishedGoodsInventory()
    const { schedules, createSchedule, updateSchedule, deleteSchedule } = useProductionSchedules()
    const scrollContainerRef = useRef<HTMLDivElement>(null)
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
    const [planningModalOpen, setPlanningModalOpen] = useState(false)
    const [selectedProductForPlanning, setSelectedProductForPlanning] = useState<Product | null>(null)
    const [selectedResourceForPlanning, setSelectedResourceForPlanning] = useState<string>("")
    const [draggingSchedule, setDraggingSchedule] = useState<{ id: string; startX: number; startScrollX: number } | null>(null)
    const [resizingSchedule, setResizingSchedule] = useState<{ id: string; startX: number } | null>(null)
    const [productOffsets, setProductOffsets] = useState<Map<string, number[]>>(new Map())
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
                // 60 días: 30 antes + 30 después
                start = addDays(startOfDay(now), -30)
                units = 60 // 60 días
                for (let i = 0; i < units; i++) {
                    slots.push(addDays(start, i))
                }
                end = addDays(start, units)
                break

            case 'hour':
                // 7 días: 3 antes + 3 después, mostrado en horas
                start = addDays(startOfDay(now), -3)
                units = 7 * 24 // 7 días × 24 horas
                for (let i = 0; i < units; i++) {
                    slots.push(addHours(start, i))
                }
                end = addHours(start, units)
                break

            case 'week':
                // 16 semanas: 8 antes + 8 después
                const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
                start = addDays(currentWeekStart, -56) // 8 semanas antes (8 × 7)
                units = 16 // 16 semanas
                for (let i = 0; i < units; i++) {
                    slots.push(addDays(start, i * 7)) // Una columna por semana
                }
                end = addDays(start, units * 7)
                break

            case 'month':
                // 12 meses: todos los meses del año actual
                start = startOfMonth(startOfYear(now))
                units = 12
                for (let i = 0; i < 12; i++) {
                    slots.push(addMonths(start, i))
                }
                end = addMonths(start, 12)
                break

            case 'year':
                // 3 años: 1 antes + año actual + 1 después (36 meses)
                const currentYearStart = startOfYear(now)
                start = addMonths(currentYearStart, -12) // 1 año antes
                units = 36 // 12 meses × 3 años
                for (let i = 0; i < units; i++) {
                    slots.push(addMonths(start, i))
                }
                end = addMonths(start, units)
                break

            default:
                // Fallback a día
                start = addDays(startOfDay(now), -30)
                units = 60
                for (let i = 0; i < units; i++) {
                    slots.push(addDays(start, i))
                }
                end = addDays(start, units)
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

    const handleProductClick = (product: Product, resourceId: string) => {
        setSelectedProductForPlanning(product)
        setSelectedResourceForPlanning(resourceId)
        setPlanningModalOpen(true)
    }

    const handlePlan = async (quantity: number, startDate: Date, endDate: Date) => {
        await createSchedule({
            resource_id: selectedResourceForPlanning,
            product_id: selectedProductForPlanning?.id || "",
            quantity,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        })
    }

    // Calcular offsets reales de productos midiendo el DOM
    useEffect(() => {
        if (!expandedResources.size) return

        const offsets = new Map<string, number[]>()
        
        resources.forEach(resource => {
            if (!expandedResources.has(resource.id)) return
            
            const resourceOffsets: number[] = []
            resource.products?.forEach((product, idx) => {
                // Buscar el elemento del producto en el DOM
                const productElement = document.querySelector(`[data-product-id="${product.id}"][data-resource-id="${resource.id}"]`)
                if (productElement && productElement.parentElement) {
                    // Medir desde el top del sidebar
                    const sidebarElement = productElement.closest('.sticky')
                    if (sidebarElement) {
                        const offsetFromSidebar = productElement.getBoundingClientRect().top - sidebarElement.getBoundingClientRect().top
                        // El sidebar y timeline están al mismo nivel, usar el offset directamente
                        resourceOffsets.push(Math.max(0, offsetFromSidebar))
                    }
                }
            })
            
            if (resourceOffsets.length === resource.products?.length) {
                offsets.set(resource.id, resourceOffsets)
            }
        })
        
        setProductOffsets(offsets)
    }, [expandedResources, resources, expandedResources])

    // Auto-scroll al centro de la fecha actual
    useEffect(() => {
        if (!scrollContainerRef.current) return

        const scrollToCurrentDate = () => {
            const container = scrollContainerRef.current
            if (!container) return

            const currentTimePercentage = getCurrentTimePosition()
            const containerWidth = container.clientWidth
            const scrollWidth = container.scrollWidth

            // Calcular el scroll horizontal para centrar la fecha actual
            // currentTimePercentage es el porcentaje de la posición en el contenido total
            const scrollLeft = (currentTimePercentage / 100) * scrollWidth - containerWidth / 2

            container.scrollLeft = Math.max(0, scrollLeft)
        }

        // Pequeño delay para asegurar que el DOM está listo
        const timer = setTimeout(scrollToCurrentDate, 100)

        return () => clearTimeout(timer)
    }, [viewMode, totalUnits, startDate])

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
                // Mostrar fecha del día (ej: "25 Nov")
                return format(date, "d MMM", { locale: es })
            case 'hour':
                // Mostrar hora (ej: "00:00", "01:00", etc)
                return format(date, "HH:00", { locale: es })
            case 'week':
                // Mostrar número de semana (ej: "Sem 47")
                const weekNumber = getWeek(date, { weekStartsOn: 1, locale: es })
                return `Sem ${weekNumber}`
            case 'month':
                // Mostrar nombre del mes (ej: "Noviembre")
                return format(date, "MMMM", { locale: es })
            case 'year':
                // Mostrar mes para vista año (ej: "Ene")
                return format(date, "MMM", { locale: es })
            default:
                return format(date, "d MMM", { locale: es })
        }
    }

    // Calcular posición del momento actual como porcentaje
    const getCurrentTimePosition = () => {
        const now = getColombiaTime()

        switch (viewMode) {
            case 'day': {
                // Para vista día: calculamos días desde el inicio
                const daysSinceStart = differenceInDays(now, startDate)
                const hoursInDay = (now.getHours() + now.getMinutes() / 60) / 24
                return ((daysSinceStart + hoursInDay) / totalUnits) * 100
            }
            case 'hour': {
                // Para vista hora: calculamos horas desde el inicio
                const hoursSinceStart = differenceInHours(now, startDate)
                const minutesInHour = now.getMinutes() / 60
                return ((hoursSinceStart + minutesInHour) / totalUnits) * 100
            }
            case 'week': {
                // Para vista semana: calculamos semanas desde el inicio
                const daysSinceStart = differenceInDays(now, startDate)
                return (daysSinceStart / (totalUnits * 7)) * 100
            }
            case 'month': {
                // Para vista mes: calculamos meses desde el inicio
                const monthsSinceStart = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
                const daysInMonth = now.getDate() / 30
                return ((monthsSinceStart + daysInMonth) / totalUnits) * 100
            }
            case 'year': {
                // Para vista año: calculamos meses desde el inicio
                const monthsSinceStart = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
                const daysInMonth = now.getDate() / 30
                return ((monthsSinceStart + daysInMonth) / totalUnits) * 100
            }
            default:
                return 0
        }
    }

    const currentTimePosition = getCurrentTimePosition()

    // Helper para obtener el nombre del producto
    const getProductName = (productId: string) => {
        // Buscar en todos los recursos
        for (const resource of resources) {
            const product = resource.products?.find(p => p.id === productId)
            if (product) return product.name
        }
        return "Producto"
    }

    return (
        <div ref={scrollContainerRef} className="bg-black border border-[#1C1C1E] rounded-xl overflow-x-auto overflow-y-hidden min-h-fit">
            {/* Header Row */}
            <div className="flex border-b border-[#1C1C1E] bg-black" style={{ minWidth: `${320 + timeSlots.length * 160}px` }}>
                <div className="w-80 flex-shrink-0 p-4 border-r border-[#1C1C1E] font-semibold text-sm text-[#8E8E93] h-[61px] flex items-center sticky left-0 bg-black z-10">
                    Recurso / Inventario
                </div>
                <div className="flex h-[61px]" style={{ width: `${timeSlots.length * 160}px` }}>
                    {timeSlots.map((time, i) => (
                        <div key={i} className="flex-shrink-0 w-[160px] p-4 text-xs text-[#8E8E93] border-r border-[#1C1C1E] text-center font-medium">
                            {formatTimeLabel(time)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Resource Rows */}
            {resources.map((resource) => {
                const isExpanded = expandedResources.has(resource.id)
                const productsCount = resource.products?.length || 0
                const expandedHeight = Math.max(60, 36 + (productsCount * 36))
                
                return (
                    <div key={resource.id} className={`flex border-b border-[#1C1C1E] transition-all duration-300 ease-in-out group hover:bg-[#1C1C1E]/30`} style={{ minWidth: `${320 + timeSlots.length * 160}px`, minHeight: isExpanded ? `${expandedHeight}px` : '60px' }}>
                        {/* Sidebar */}
                        <div className="w-80 flex-shrink-0 p-4 border-r border-[#1C1C1E] flex flex-col gap-3 bg-black overflow-visible sticky left-0 z-10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-sm text-white block">{resource.name}</span>
                                        <span className="text-xs text-[#8E8E93] capitalize">{resource.type}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleResourceExpansion(resource.id)}
                                        className="p-1.5 rounded-lg hover:bg-[#2C2C2E] transition-all duration-200 ease-out hover:scale-110 active:scale-95"
                                        title={isExpanded ? "Contraer productos" : "Expandir productos"}
                                    >
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-[#8E8E93] transition-transform duration-200" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-[#8E8E93] transition-transform duration-200" />
                                        )}
                                    </button>
                                </div>

                                {/* Product List - Con animación de expansión */}
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="space-y-2 mt-1">
                                        {resource.products?.map(product => {
                                            const result = product.currentStock - product.pendingOrders - product.demandForecast
                                            const isShortage = result < 0
                                            const productLabel = product.weight ? `${product.name} ${product.weight}` : product.name
                                            return (
                                                <div key={product.id} data-product-id={product.id} data-resource-id={resource.id} className="flex items-center justify-between bg-[#1C1C1E] p-2 rounded-lg text-xs cursor-pointer hover:bg-[#2C2C2E] transition-all duration-200 ease-out hover:scale-[1.01] hover:shadow-md hover:shadow-black/20 active:scale-[0.99] group" onClick={() => handleProductClick(product, resource.id)}>
                                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                        <span className="text-white font-medium truncate">{productLabel}</span>
                                                        <div className="flex items-center justify-between text-[11px] h-[16px]">
                                                            <div className="flex items-center gap-0.5">
                                                                <span
                                                                    className="text-[#8E8E93] cursor-pointer hover:text-white transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleProductInventoryClick(product)
                                                                    }}
                                                                    title="Click para ver inventario detallado"
                                                                >
                                                                    {product.currentStock}
                                                                </span>
                                                                <span className="text-[#8E8E93]">−</span>
                                                                <span
                                                                    className="text-[#8E8E93] cursor-pointer hover:text-white transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleProductDemandClick(product)
                                                                    }}
                                                                    title="Click para ver desglose"
                                                                >
                                                                    {product.pendingOrders}
                                                                </span>
                                                                <span className="text-[#8E8E93]">−</span>
                                                                <span
                                                                    className="text-[#8E8E93] cursor-pointer hover:text-white transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleProductForecastClick(product)
                                                                    }}
                                                                    title="Click para ver análisis de demanda proyectada"
                                                                >
                                                                    {product.demandForecast}
                                                                </span>
                                                                <span className="text-[#8E8E93]">=</span>
                                                            </div>
                                                            <span
                                                                className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity ${isShortage ? "text-[#FF453A]" : "text-[#30D158]"}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleProductDemandClick(product)
                                                                }}
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

                        {/* Timeline */}
                        <div className="relative bg-black" style={{ width: `${timeSlots.length * 160}px` }}>
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {timeSlots.map((_, i) => (
                                    <div key={i} className="flex-shrink-0 w-[160px] border-r border-[#1C1C1E] h-full" />
                                ))}
                            </div>

                            {/* Current Time Line */}
                            {currentTimePosition >= 0 && currentTimePosition <= 100 && (
                                <div
                                    className="absolute top-0 bottom-0 w-[2px] bg-[#FF453A] pointer-events-none z-0"
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

                            {/* Production Schedules */}
                            <div className="absolute inset-0 px-0 py-4 transition-all duration-300 ease-in-out" style={{ height: '100%' }}>
                                {expandedResources.has(resource.id) ? (
                                    // Expandido: mostrar bloques alineados con productos
                                    // Usar offsets medidos del DOM si están disponibles, si no usar valor calculado
                                    resource.products?.map((product, productIdx) => {
                                        const productHeight = 44 // altura del card del producto
                                        const productGap = 8 // space-y-2
                                        // Usar offset medido si existe, si no calcular
                                        const resourceOffsets = productOffsets.get(resource.id)
                                        let topPosition: number
                                        if (resourceOffsets && resourceOffsets[productIdx] !== undefined) {
                                            // Usar el offset medido
                                            topPosition = resourceOffsets[productIdx]
                                        } else {
                                            // Fallback a cálculo: 36px para primer producto, luego +52px por cada uno
                                            const firstProductOffset = 36
                                            topPosition = firstProductOffset + (productIdx * (productHeight + productGap))
                                        }

                                        return (
                                            <div key={product.id} style={{ position: 'absolute', width: '100%', height: `${productHeight}px`, top: `${topPosition}px` }}>
                                                {schedules
                                                    .filter(s => s.resource_id === resource.id && s.product_id === product.id)
                                                    .map(schedule => (
                                                        <ScheduleBlock
                                                            key={schedule.id}
                                                            schedule={schedule}
                                                            resourceId={resource.id}
                                                            productIndex={0}
                                                            startDate={startDate}
                                                            endDate={endDate}
                                                            totalUnits={totalUnits}
                                                            viewMode={viewMode}
                                                            onDelete={deleteSchedule}
                                                            onUpdateDates={(id, newStart, newEnd) => updateSchedule(id, {
                                                                start_date: newStart.toISOString(),
                                                                end_date: newEnd.toISOString()
                                                            })}
                                                            onUpdateQuantity={(id, quantity) => updateSchedule(id, { quantity })}
                                                            productName={getProductName(schedule.product_id)}
                                                        />
                                                    ))}
                                            </div>
                                        )
                                    })
                                ) : (
                                    // Colapsado: TODOS los bloques en una sola línea horizontal con mejor espaciado
                                    <div style={{ position: 'absolute', width: '100%', height: '44px', top: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
                                        {schedules
                                            .filter(s => s.resource_id === resource.id)
                                            .map(schedule => (
                                                <ScheduleBlock
                                                    key={schedule.id}
                                                    schedule={schedule}
                                                    resourceId={resource.id}
                                                    productIndex={0}
                                                    startDate={startDate}
                                                    endDate={endDate}
                                                    totalUnits={totalUnits}
                                                    viewMode={viewMode}
                                                    onDelete={deleteSchedule}
                                                    onUpdateDates={(id, newStart, newEnd) => updateSchedule(id, {
                                                        start_date: newStart.toISOString(),
                                                        end_date: newEnd.toISOString()
                                                    })}
                                                    onUpdateQuantity={(id, quantity) => updateSchedule(id, { quantity })}
                                                    productName={getProductName(schedule.product_id)}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}

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

            {/* Planning Modal */}
            <PlanningModal
                open={planningModalOpen}
                onOpenChange={setPlanningModalOpen}
                product={selectedProductForPlanning}
                resourceId={selectedResourceForPlanning}
                onPlan={handlePlan}
            />
        </div>
    )
}
