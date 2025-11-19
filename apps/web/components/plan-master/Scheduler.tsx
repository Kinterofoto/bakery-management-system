"use client"

import { ProductionOrder } from "./mockData"
import { format } from "date-fns"
import { Calendar, Clock, AlertCircle } from "lucide-react"

interface SchedulerProps {
    orders: ProductionOrder[]
}

export function Scheduler({ orders }: SchedulerProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
                <div
                    key={order.id}
                    className="group relative overflow-hidden rounded-xl bg-[#1C1C1E] border border-transparent p-5 transition-all hover:bg-[#2C2C2E]"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-1">
                                {order.sku}
                            </span>
                            <h3 className="text-xl font-bold text-white">
                                {order.productName}
                            </h3>
                        </div>
                        <div className={`
              px-2.5 py-1 rounded-md text-xs font-bold
              ${order.status === 'completed' ? 'bg-[#30D158] text-black' : ''}
              ${order.status === 'in-progress' ? 'bg-[#0A84FF] text-white' : ''}
              ${order.status === 'delayed' ? 'bg-[#FF453A] text-white' : ''}
              ${order.status === 'planned' ? 'bg-[#3A3A3C] text-[#8E8E93]' : ''}
            `}>
                            {order.status}
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-[#8E8E93]">
                            <Calendar className="w-4 h-4 mr-2 opacity-70" />
                            {format(new Date(order.startDate), "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center text-sm text-[#8E8E93]">
                            <Clock className="w-4 h-4 mr-2 opacity-70" />
                            {format(new Date(order.startDate), "HH:mm")} - {format(new Date(order.endDate), "HH:mm")}
                        </div>
                    </div>

                    <div className="relative pt-2">
                        <div className="flex justify-between text-xs text-[#8E8E93] mb-1 font-medium">
                            <span>Progreso</span>
                            <span>{order.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#3A3A3C] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${order.status === 'delayed' ? 'bg-[#FF453A]' :
                                        order.status === 'completed' ? 'bg-[#30D158]' :
                                            'bg-[#0A84FF]'
                                    }`}
                                style={{ width: `${order.progress}%` }}
                            />
                        </div>
                    </div>

                    {order.status === 'delayed' && (
                        <div className="mt-4 flex items-center text-xs text-[#FF453A] font-bold">
                            <AlertCircle className="w-3 h-3 mr-2" />
                            Atención requerida: Retraso en producción
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
