"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Product } from "./mockData"
import { addHours, format } from "date-fns"
import { es } from "date-fns/locale"

interface PlanningModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: Product | null
    resourceId: string
    onPlan: (quantity: number, startDate: Date, endDate: Date) => void
}

export function PlanningModal({
    open,
    onOpenChange,
    product,
    resourceId,
    onPlan
}: PlanningModalProps) {
    const [quantity, setQuantity] = useState<number>(0)
    const [percentageAdjustment, setPercentageAdjustment] = useState<number>(0)
    const [durationHours, setDurationHours] = useState<number>(24)

    useEffect(() => {
        if (product && open) {
            setQuantity(product.demandForecast)
            setPercentageAdjustment(0)
            setDurationHours(24)
        }
    }, [product, open])

    if (!product) return null

    // Get next hour in Colombia timezone
    const getNextHour = () => {
        const now = new Date()
        const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
        const nextHour = new Date(colombiaTime)
        nextHour.setMinutes(0, 0, 0)
        nextHour.setHours(nextHour.getHours() + 1)
        return nextHour
    }

    const adjustedQuantity = Math.round(product.demandForecast * (1 + percentageAdjustment / 100))
    const startDate = getNextHour()
    const endDate = addHours(startDate, durationHours)

    // Calculate days and hours breakdown for better readability
    const getDurationDisplay = (hours: number) => {
        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24

        if (days === 0) {
            return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
        } else if (remainingHours === 0) {
            return `${days} ${days === 1 ? 'día' : 'días'}`
        } else {
            return `${days}d ${remainingHours}h`
        }
    }

    const handlePlan = () => {
        onPlan(adjustedQuantity, startDate, endDate)
        onOpenChange(false)
    }

    const handleQuantityChange = (value: string) => {
        const val = parseInt(value) || 0
        const newPercentage = product.demandForecast > 0
            ? ((val - product.demandForecast) / product.demandForecast) * 100
            : 0
        setPercentageAdjustment(newPercentage)
    }

    const percentageColor = percentageAdjustment >= 0 ? '#30D158' : '#FF453A'
    const percentageSign = percentageAdjustment > 0 ? '+' : ''

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="
                bg-[#1C1C1E]/95
                backdrop-blur-2xl
                border border-white/10
                shadow-2xl shadow-black/50
                w-[calc(100vw-2rem)]
                max-w-[calc(100vw-2rem)]
                sm:max-w-md
                sm:w-full
                rounded-2xl
                p-5
                max-h-[90vh]
                overflow-y-auto
            ">
                {/* Header */}
                <DialogHeader className="pb-3">
                    <DialogTitle className="text-lg sm:text-xl font-semibold text-white">
                        {product.name} {product.weight && `(${product.weight})`}
                    </DialogTitle>
                    <p className="text-xs text-[#8E8E93]">
                        Demanda base: <span className="text-[#0A84FF] font-semibold">{product.demandForecast} uds</span>
                    </p>
                </DialogHeader>

                {/* Main Content */}
                <div className="space-y-4 py-1">

                    {/* Quantity Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-white">
                                Cantidad
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    value={adjustedQuantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    className="
                                        bg-[#2C2C2E]/80
                                        border border-white/10
                                        text-white
                                        text-base
                                        font-bold
                                        h-9
                                        w-24
                                        text-center
                                        rounded-lg
                                        [appearance:textfield]
                                        [&::-webkit-outer-spin-button]:appearance-none
                                        [&::-webkit-inner-spin-button]:appearance-none
                                    "
                                />
                                <span className="text-xs text-[#8E8E93]">uds</span>
                                <div
                                    className="text-sm font-bold px-2 py-1 rounded-md"
                                    style={{
                                        color: percentageColor,
                                        backgroundColor: `${percentageColor}15`
                                    }}
                                >
                                    {percentageSign}{percentageAdjustment.toFixed(0)}%
                                </div>
                            </div>
                        </div>

                        <Slider
                            min={-50}
                            max={100}
                            step={5}
                            value={[percentageAdjustment]}
                            onValueChange={(value) => setPercentageAdjustment(value[0])}
                            className="w-full"
                        />
                    </div>

                    {/* Duration Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-white">
                                Duración
                            </Label>
                            <span className="text-base font-bold text-white">
                                {getDurationDisplay(durationHours)}
                            </span>
                        </div>

                        <Slider
                            min={1}
                            max={168}
                            step={1}
                            value={[durationHours]}
                            onValueChange={(value) => setDurationHours(value[0])}
                            className="w-full"
                        />

                        {/* Quick Duration Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { hours: 8, label: '8h' },
                                { hours: 24, label: '1d' },
                                { hours: 48, label: '2d' },
                                { hours: 72, label: '3d' }
                            ].map(({ hours, label }) => (
                                <button
                                    key={hours}
                                    onClick={() => setDurationHours(hours)}
                                    className={`
                                        px-2 py-2
                                        rounded-lg
                                        text-xs font-semibold
                                        transition-all duration-150
                                        ${durationHours === hours
                                            ? 'bg-[#0A84FF] text-white'
                                            : 'bg-white/5 text-[#8E8E93] hover:bg-white/10'
                                        }
                                    `}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="
                        bg-white/5
                        border border-white/10
                        rounded-xl
                        p-3
                        space-y-2
                    ">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#8E8E93]">Inicio</span>
                            <span className="text-xs text-white font-medium">
                                {format(startDate, "d MMM, HH:mm", { locale: es })}
                            </span>
                        </div>
                        <div className="border-t border-white/10"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#8E8E93]">Fin</span>
                            <span className="text-xs text-white font-medium">
                                {format(endDate, "d MMM, HH:mm", { locale: es })}
                            </span>
                        </div>
                        <div className="border-t border-white/10"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#8E8E93]">Ritmo</span>
                            <span className="text-xs text-[#30D158] font-bold">
                                {(adjustedQuantity / durationHours).toFixed(1)} uds/h
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-2 pt-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-lg"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handlePlan}
                        className="flex-1 h-10 bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white rounded-lg"
                    >
                        Crear
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
