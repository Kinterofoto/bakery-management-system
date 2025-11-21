"use client"

import { useState, useMemo } from "react"
import { ProductionOrder, Resource } from "./mockData"
import { format, addHours, differenceInHours, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DemandBreakdownModal } from "./DemandBreakdownModal"

import { Product } from "./mockData"

interface GanttChartProps {
    orders: ProductionOrder[]
    resources: Resource[]
    onPlanOrder?: (resourceId: string, product: Product) => void
}

export function GanttChart({ orders, resources, onPlanOrder }: GanttChartProps) {
    const [zoomLevel, setZoomLevel] = useState(1) // 1 hour per column
    const [demandModalOpen, setDemandModalOpen] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
    const [selectedProductName, setSelectedProductName] = useState<string>("")

    const timeSlots = useMemo(() => {
        const slots = []
        const start = startOfDay(new Date("2023-11-20T00:00:00"))
        for (let i = 0; i < 24; i++) {
            slots.push(addHours(start, i))
        }
        return slots
    }, [])

    const handleProductDemandClick = (product: Product) => {
        setSelectedProductId(product.id)
        setSelectedProductName(product.name)
        setDemandModalOpen(true)
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

    return (
        <div className="bg-black border border-[#1C1C1E] rounded-xl overflow-hidden">
            {/* Header Timeline */}
            <div className="flex border-b border-[#1C1C1E] bg-black">
                <div className="w-80 flex-shrink-0 p-4 border-r border-[#1C1C1E] font-semibold text-sm text-[#8E8E93]">
                    Recurso / Inventario
                </div>
                <div className="flex-1 flex relative overflow-x-auto hide-scrollbar">
                    {timeSlots.map((time, i) => (
                        <div key={i} className="flex-1 min-w-[60px] p-4 text-xs text-[#8E8E93] border-r border-[#1C1C1E] text-center font-medium">
                            {format(time, "HH:mm")}
                        </div>
                    ))}
                </div>
            </div>

            {/* Resources Rows */}
            <div className="divide-y divide-[#1C1C1E]">
                {resources.map((resource) => (
                    <div key={resource.id} className="flex group hover:bg-[#1C1C1E]/30 transition-colors min-h-[120px]">
                        {/* Sidebar with Products */}
                        <div className="w-80 flex-shrink-0 p-4 border-r border-[#1C1C1E] flex flex-col gap-3">
                            <div>
                                <span className="font-bold text-sm text-white block">{resource.name}</span>
                                <span className="text-xs text-[#8E8E93] capitalize">{resource.type}</span>
                            </div>

                            {/* Product List */}
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
                                                            onClick={() => handleProductDemandClick(product)}
                                                            title="Click para ver desglose"
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
                                                        <span className="text-[#8E8E93]">{product.demandForecast}</span>
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

                        {/* Timeline Area */}
                        <div className="flex-1 relative bg-black">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {timeSlots.map((_, i) => (
                                    <div key={i} className="flex-1 border-r border-[#1C1C1E] h-full" />
                                ))}
                            </div>

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
                    </div>
                ))}
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
        </div>
    )
}
