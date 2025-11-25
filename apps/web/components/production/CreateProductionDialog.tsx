"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"
import { useBillOfMaterials } from "@/hooks/use-bill-of-materials"
import { useProductWorkCenterMapping } from "@/hooks/use-product-work-center-mapping"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftId: string
  workCenterId: string
  onSuccess?: () => void
}

export function CreateProductionDialog({ open, onOpenChange, shiftId, workCenterId, onSuccess }: Props) {
  const { createProduction } = useShiftProductions()
  const { getFinishedProducts } = useProducts()
  const { checkProductHasBOM } = useBillOfMaterials()
  const { mappings } = useProductWorkCenterMapping()
  const [loading, setLoading] = useState(false)
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    productId: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.productId) {
      toast.error("Selecciona un producto")
      return
    }

    try {
      setLoading(true)

      // Verificar si el producto tiene BOM configurado (advertencia, no bloqueo)
      const hasBOM = await checkProductHasBOM(formData.productId)
      if (!hasBOM) {
        toast.warning("Este producto no tiene configurado su Bill of Materials. Solo podrás registrar unidades buenas y malas.")
      }

      await createProduction({
        shift_id: shiftId,
        product_id: formData.productId,
        notes: null,
        status: "active"
      })

      toast.success("Producción iniciada exitosamente")
      setFormData({ productId: "" })
      onOpenChange(false)
      onSuccess?.() // Llamar callback para refetch
    } catch (error) {
      toast.error("Error al iniciar la producción")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar productos terminados y filtrar por centro de trabajo
  React.useEffect(() => {
    if (open) {
      getFinishedProducts().then(allProducts => {
        console.log('=== CreateProductionDialog Debug ===')
        console.log('Work Center ID:', workCenterId)
        console.log('All Products:', allProducts.length, allProducts.map(p => ({ id: p.id, name: p.name, category: p.category })))
        console.log('All Mappings:', mappings.length, mappings.map(m => ({ product_id: m.product_id, work_center_id: m.work_center_id, operation_id: m.operation_id })))

        // Obtener IDs de productos asignados a este centro de trabajo
        const assignedProductIds = new Set(
          mappings
            .filter(m => m.work_center_id === workCenterId)
            .map(m => m.product_id)
        )

        console.log('Assigned Product IDs for this work center:', Array.from(assignedProductIds))

        // Filtrar productos que están asignados a este centro
        const filteredProducts = allProducts.filter(p => assignedProductIds.has(p.id))
        console.log('Filtered Products:', filteredProducts.length, filteredProducts.map(p => ({ id: p.id, name: p.name })))
        console.log('====================================')

        setFinishedProducts(filteredProducts)
      })
    }
  }, [open, getFinishedProducts, mappings, workCenterId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Iniciar Nueva Producción</DialogTitle>
            <DialogDescription>
              Selecciona el producto que vas a producir en este turno
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Producto *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto..." />
                </SelectTrigger>
                <SelectContent>
                  {finishedProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.weight || 'Sin peso'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.productId}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Iniciando..." : "Iniciar Producción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}