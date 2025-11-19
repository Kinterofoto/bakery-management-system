"use client"

import { useRouter } from "next/navigation"
import { useFinishedGoodsInventory } from "@/hooks/use-finished-goods-inventory"
import { X, Package, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InventoryPage() {
    const router = useRouter()
    const { inventory, loading, error } = useFinishedGoodsInventory()

    const handleClose = () => {
        router.back()
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#1C1C1E]">
                <div className="container mx-auto px-4 py-4 md:px-8 max-w-7xl">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left side - Back button and Title */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleClose}
                                variant="ghost"
                                size="sm"
                                className="p-2 hover:bg-[#1C1C1E] transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </Button>
                            <h1 className="text-lg font-bold tracking-tight text-white">
                                Inventario de Producto Terminado
                            </h1>
                        </div>

                        {/* Right side - Close button */}
                        <Button
                            onClick={handleClose}
                            variant="ghost"
                            size="sm"
                            className="p-2 hover:bg-[#1C1C1E] transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="pt-20 px-4 py-8 md:px-8">
                <div className="container mx-auto max-w-7xl">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-[#8E8E93]">Cargando inventario...</div>
                        </div>
                    ) : error ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-red-500">Error: {error}</div>
                        </div>
                    ) : inventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <Package className="w-12 h-12 text-[#8E8E93]" />
                            <div className="text-[#8E8E93]">No hay productos terminados en inventario</div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Header Row */}
                            <div className="grid grid-cols-3 gap-4 p-4 bg-[#1C1C1E] rounded-lg text-sm font-semibold text-[#8E8E93] border border-[#2C2C2E]">
                                <div>Referencia</div>
                                <div>SKU</div>
                                <div className="text-right">Cantidad</div>
                            </div>

                            {/* Product Rows */}
                            {inventory.map((item) => (
                                <div
                                    key={item.productId}
                                    className="grid grid-cols-3 gap-4 p-4 rounded-lg border border-[#2C2C2E] hover:bg-[#0F0F11] transition-colors items-center"
                                >
                                    <div>
                                        <div className="text-white font-medium">{item.productName}</div>
                                    </div>
                                    <div>
                                        <div className="text-[#8E8E93] text-sm">{item.sku}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#30D158]/20 text-[#30D158] font-semibold">
                                            {item.quantity}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Summary */}
                            <div className="mt-8 p-4 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E]">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <div className="text-sm text-[#8E8E93] mb-1">Total de referencias</div>
                                        <div className="text-2xl font-bold text-white">{inventory.length}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-[#8E8E93] mb-1">Total de unidades</div>
                                        <div className="text-2xl font-bold text-[#30D158]">
                                            {inventory.reduce((sum, item) => sum + item.quantity, 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
