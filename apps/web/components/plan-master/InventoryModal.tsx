"use client"

import { useState } from "react"
import { useFinishedGoodsInventory, type FinishedGoodsItem } from "@/hooks/use-finished-goods-inventory"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InventoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryModal({ open, onOpenChange }: InventoryModalProps) {
  const { inventory, loading, error } = useFinishedGoodsInventory()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0A0A0A] border-[#1C1C1E] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#30D158]" />
            Inventario de Producto Terminado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#8E8E93]">Cargando inventario...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-red-500">Error: {error}</div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-[#8E8E93]">No hay productos terminados en inventario</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4 p-3 bg-[#1C1C1E] rounded-lg text-sm font-semibold text-[#8E8E93] border border-[#2C2C2E]">
                <div>Referencia</div>
                <div>SKU</div>
                <div className="text-right">Cantidad</div>
              </div>

              {inventory.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-3 gap-4 p-3 rounded-lg border border-[#2C2C2E] hover:bg-[#1C1C1E] transition-colors items-center"
                >
                  <div>
                    <div className="text-white font-medium text-sm">{item.productName}</div>
                  </div>
                  <div>
                    <div className="text-[#8E8E93] text-sm">{item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#30D158]/20 text-[#30D158] font-semibold text-sm">
                      {item.quantity}
                    </div>
                  </div>
                </div>
              ))}

              {inventory.length > 0 && (
                <div className="mt-4 p-3 bg-[#1C1C1E] rounded-lg border border-[#2C2C2E]">
                  <div className="text-sm text-[#8E8E93]">
                    Total de referencias: <span className="text-white font-semibold">{inventory.length}</span>
                  </div>
                  <div className="text-sm text-[#8E8E93] mt-1">
                    Total de unidades:
                    <span className="text-white font-semibold ml-1">
                      {inventory.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            className="bg-[#1C1C1E] border-0 text-white hover:bg-[#2C2C2E]"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
