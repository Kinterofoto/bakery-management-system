"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Product } from "./mockData"
import { addDays } from "date-fns"

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
    const [durationDays, setDurationDays] = useState<number>(1)

    useEffect(() => {
        if (product) {
            setQuantity(product.demandForecast)
            setPercentageAdjustment(0)
            setDurationDays(1)
        }
    }, [product, open])

    if (!product) return null

    const adjustedQuantity = Math.round(product.demandForecast * (1 + percentageAdjustment / 100))

    const handlePlan = () => {
        const now = new Date()
        // Set to start of today at 00:00 Colombia time
        const startDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }))
        startDate.setHours(0, 0, 0, 0)

        const endDate = addDays(startDate, durationDays)

        onPlan(adjustedQuantity, startDate, endDate)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1C1C1E] border border-[#3C3C3E] max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg">Planificar Producción</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Product Info */}
                    <div className="bg-[#2C2C2E] p-3 rounded-lg">
                        <div className="text-sm text-[#8E8E93]">Producto</div>
                        <div className="text-white font-semibold text-base">
                            {product.name} {product.weight && `(${product.weight})`}
                        </div>
                    </div>

                    {/* Quantity Section */}
                    <div className="space-y-3">
                        <div>
                            <Label className="text-sm text-[#8E8E93] block mb-2">
                                Cantidad Base (Proyectada): {product.demandForecast} unidades
                            </Label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="number"
                                    value={adjustedQuantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0
                                        setPercentageAdjustment(((val - product.demandForecast) / product.demandForecast) * 100)
                                    }}
                                    className="bg-[#2C2C2E] border border-[#3C3C3E] text-white h-9 text-sm"
                                />
                                <span className="text-xs text-[#8E8E93] min-w-fit">unidades</span>
                            </div>
                        </div>

                        {/* Percentage Slider */}
                        <div className="space-y-2">
                            <Label className="text-sm text-[#8E8E93]">
                                Ajuste Porcentual: {percentageAdjustment > 0 ? '+' : ''}{percentageAdjustment.toFixed(0)}%
                            </Label>
                            <Slider
                                min={-50}
                                max={100}
                                step={5}
                                value={[percentageAdjustment]}
                                onValueChange={(value) => setPercentageAdjustment(value[0])}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-[#8E8E93]">
                                <span>-50%</span>
                                <span>0%</span>
                                <span>+100%</span>
                            </div>
                        </div>
                    </div>

                    {/* Duration Section */}
                    <div className="space-y-3">
                        <Label className="text-sm text-[#8E8E93]">
                            Duración: {durationDays} día{durationDays > 1 ? 's' : ''}
                        </Label>
                        <Slider
                            min={1}
                            max={30}
                            step={1}
                            value={[durationDays]}
                            onValueChange={(value) => setDurationDays(value[0])}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-[#8E8E93]">
                            <span>1 día</span>
                            <span>15 días</span>
                            <span>30 días</span>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-[#2C2C2E] p-3 rounded-lg">
                        <div className="text-xs text-[#8E8E93] mb-1">Resumen</div>
                        <div className="text-white font-semibold text-sm">
                            {adjustedQuantity} unidades × {durationDays} día{durationDays > 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-[#3C3C3E] text-[#8E8E93] hover:bg-[#2C2C2E]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handlePlan}
                        className="bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-white"
                    >
                        Crear Programación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
