"use client"

import { useState, useMemo, useEffect } from "react"
import { GanttChart } from "./GanttChart"
import { mockOrders, mockResources, mockProducts, Resource, ProductionOrder, Product } from "./mockData"
import { Home, Filter, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkCenters } from "@/hooks/use-work-centers"
import { addHours, startOfDay } from "date-fns"
import Link from "next/link"

export function PlanMasterDashboard() {
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

                        {/* Right side - Filters */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E] font-medium rounded-full h-9 px-4 text-sm">
                                <CalendarIcon className="w-4 h-4 mr-2 text-[#30D158]" />
                                Hoy
                            </Button>
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
                <div className="container mx-auto px-4 py-8 md:px-8 max-w-7xl">
                    <GanttChart
                        orders={orders}
                        resources={resources}
                        onPlanOrder={handlePlanOrder}
                    />
                </div>
            </div>
        </div>
    )
}
