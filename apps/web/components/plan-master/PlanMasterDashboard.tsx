"use client"

import { useState, useMemo, useEffect } from "react"
import { GanttChart } from "./GanttChart"
import { Scheduler } from "./Scheduler"
import { mockOrders, mockResources, mockProducts, Resource, ProductionOrder, Product } from "./mockData"
import { LayoutGrid, List, Plus, Filter, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { addHours, startOfDay } from "date-fns"

export function PlanMasterDashboard() {
    const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt')
    const [orders, setOrders] = useState<ProductionOrder[]>([])

    const { workCenters, loading } = useWorkCenters()

    const resources: Resource[] = useMemo(() => {
        if (loading) return mockResources

        // Filter active work centers (treating null status as active for now)
        const activeCenters = workCenters.filter(wc =>
            !wc.status ||
            ['active', 'ACTIVO', 'Active'].includes(wc.status)
        )

        if (activeCenters.length === 0) return mockResources

        return activeCenters.map((wc, index) => ({
            id: wc.id,
            name: wc.name,
            type: 'machine', // Defaulting to machine as we don't have type in work_centers yet or it might differ
            capacity: 100, // Default capacity
            // Assign different mock products to each resource for demo purposes
            products: index % 2 === 0
                ? [mockProducts[0], mockProducts[3]]
                : [mockProducts[1], mockProducts[2], mockProducts[4]]
        }))
    }, [workCenters, loading])

    // Initialize orders mapped to real resources
    useEffect(() => {
        if (loading || resources === mockResources) {
            setOrders(mockOrders)
            return
        }

        const mappedOrders = mockOrders.map((order, index) => ({
            ...order,
            resourceId: resources[index % resources.length].id
        }))
        setOrders(mappedOrders)
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
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1C1C1E] pb-6">
                <div>
                    <h1 className="text-5xl font-bold tracking-tight text-white mb-1">Plan Maestro</h1>
                    <p className="text-[#8E8E93] text-xl font-medium">Nov 20</p>
                </div>

                <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('gantt')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'gantt'
                            ? 'bg-[#3A3A3C] text-white'
                            : 'text-[#8E8E93] hover:text-white'
                            }`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list'
                            ? 'bg-[#3A3A3C] text-white'
                            : 'text-[#8E8E93] hover:text-white'
                            }`}
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3">
                    <Button variant="outline" className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E] font-medium rounded-full px-6">
                        <CalendarIcon className="w-4 h-4 mr-2 text-[#30D158]" />
                        Hoy
                    </Button>
                    <Button variant="outline" className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E] font-medium rounded-full px-6">
                        <Filter className="w-4 h-4 mr-2 text-[#0A84FF]" />
                        Filtros
                    </Button>
                </div>
                <Button className="bg-[#30D158] hover:bg-[#28B148] text-black font-bold rounded-full px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Orden
                </Button>
            </div>

            {/* Content Area */}
            <div className="min-h-[600px]">
                {viewMode === 'gantt' ? (
                    <GanttChart
                        orders={orders}
                        resources={resources}
                        onPlanOrder={handlePlanOrder}
                    />
                ) : (
                    <Scheduler orders={orders} />
                )}
            </div>
        </div>
    )
}
