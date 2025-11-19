"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFinishedGoodsInventory } from "@/hooks/use-finished-goods-inventory"
import { InventoryDetailModal } from "./InventoryDetailModal"
import { X, Package, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SelectedProduct {
  id: string
  name: string
  produced: number
  dispatched: number
  available: number
}

export function InventoryPage() {
    const router = useRouter()
    const { inventory, loading, error } = useFinishedGoodsInventory()
    const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)

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
                            <div className="grid grid-cols-4 gap-4 p-4 bg-[#1C1C1E] rounded-lg text-sm font-semibold text-[#8E8E93] border border-[#2C2C2E]">
                                <div>Referencia</div>
                                <div className="text-center">Producido</div>
                                <div className="text-center">Despachado</div>
                                <div className="text-center">Disponible</div>
                            </div>

                            {/* Product Rows */}
                            {inventory.map((item) => (
                                <div
                                    key={item.productId}
                                    onClick={() => setSelectedProduct({
                                        id: item.productId,
                                        name: item.productName,
                                        produced: item.producedQuantity,
                                        dispatched: item.dispatchedQuantity,
                                        available: item.quantity
                                    })}
                                    className="grid grid-cols-4 gap-4 p-4 rounded-lg border border-[#2C2C2E] hover:bg-[#1C1C1E] transition-colors items-center cursor-pointer"
                                >
                                    <div>
                                        <div className="text-white font-medium">{item.productName}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[#0A84FF]">{item.producedQuantity}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[#FF3B30]">{item.dispatchedQuantity}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#30D158]/20 text-[#30D158] font-semibold">
                                            {item.quantity}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Summary */}
                            <div className="mt-8 p-4 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E]">
                                <div className="grid grid-cols-4 gap-8">
                                    <div>
                                        <div className="text-sm text-[#8E8E93] mb-1">Referencias</div>
                                        <div className="text-2xl font-bold text-white">{inventory.length}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-[#8E8E93] mb-1">Total Producido</div>
                                        <div className="text-2xl font-bold text-[#0A84FF]">
                                            {inventory.reduce((sum, item) => sum + item.producedQuantity, 0)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-[#8E8E93] mb-1">Total Despachado</div>
                                        <div className="text-2xl font-bold text-[#FF3B30]">
                                            {inventory.reduce((sum, item) => sum + item.dispatchedQuantity, 0)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-[#8E8E93] mb-1">Total Disponible</div>
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

            {/* Detail Modal */}
            {selectedProduct && (
                <InventoryDetailModal
                    open={!!selectedProduct}
                    onOpenChange={(open) => !open && setSelectedProduct(null)}
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                    totalProduced={selectedProduct.produced}
                    totalDispatched={selectedProduct.dispatched}
                    available={selectedProduct.available}
                />
            )}
        </div>
    )
}
