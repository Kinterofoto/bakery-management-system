"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useShiftProductions } from "@/hooks/use-shift-productions"
import { useProducts } from "@/hooks/use-products"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftId: string
}

export function CreateProductionDialog({ open, onOpenChange, shiftId }: Props) {
  const { createProduction } = useShiftProductions()
  const { getFinishedProducts } = useProducts()
  const [loading, setLoading] = useState(false)
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    productId: "",
    notes: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.productId) {
      toast.error("Selecciona un producto")
      return
    }

    try {
      setLoading(true)
      await createProduction({
        shift_id: shiftId,
        product_id: formData.productId,
        notes: formData.notes.trim() || null,
        status: "active"
      })
      
      toast.success("Producción iniciada exitosamente")
      setFormData({ productId: "", notes: "" })
      onOpenChange(false)
    } catch (error) {
      toast.error("Error al iniciar la producción")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = finishedProducts.find(p => p.id === formData.productId)

  // Cargar productos terminados cuando se abre el diálogo
  React.useEffect(() => {
    if (open) {
      getFinishedProducts().then(setFinishedProducts)
    }
  }, [open, getFinishedProducts])

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
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        {product.description && (
                          <span className="text-xs text-gray-500">{product.description}</span>
                        )}
                        <span className="text-xs text-blue-600">PT - Producto Terminado</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-1">Detalles del Producto</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Nombre:</span> {selectedProduct.name}</p>
                  <p><span className="font-medium">Unidad:</span> {selectedProduct.unit}</p>
                  {selectedProduct.weight && (
                    <p><span className="font-medium">Peso:</span> {selectedProduct.weight}</p>
                  )}
                  {selectedProduct.category && (
                    <p><span className="font-medium">Categoría:</span> {
                      selectedProduct.category === 'PT' ? 'Producto Terminado' : 'Materia Prima'
                    }</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea
                id="notes"
                placeholder="Notas sobre esta producción..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-1">Al Iniciar la Producción</h4>
              <p className="text-sm text-blue-600">
                • Se registrará la hora de inicio<br/>
                • Podrás registrar unidades producidas<br/>
                • Se habilitará el control de materiales<br/>
                • La producción quedará activa hasta que la finalices
              </p>
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