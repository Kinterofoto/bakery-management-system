"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit3, Trash2, Package, AlertCircle, Search } from "lucide-react"
import { useBillOfMaterials } from "@/hooks/use-bill-of-materials"
import { useProducts } from "@/hooks/use-products"
import { toast } from "sonner"

interface BOMItem {
  id: string
  product_id: string
  material_id: string
  quantity_needed: number
  unit_name: string
  unit_equivalence_grams: number
  product_name: string
  product_category: string
  material_name: string
  material_unit: string
}

interface BOMFormData {
  productId: string
  materialId: string
  quantity: string
  unitName: string
  unitEquivalence: string
}

export function BillOfMaterialsConfig() {
  const { 
    getAllBOMs, 
    createBOMItem, 
    updateBOMItem, 
    deleteBOMItem, 
    loading, 
    error 
  } = useBillOfMaterials()
  const { getAllProducts } = useProducts()
  
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<BOMItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<BOMFormData>({
    productId: "",
    materialId: "",
    quantity: "",
    unitName: "gramos",
    unitEquivalence: "1"
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [boms, products] = await Promise.all([
        getAllBOMs(),
        getAllProducts()
      ])
      setBomItems(boms)
      setAllProducts(products)
    } catch (error) {
      console.error("Error loading BOM data:", error)
      toast.error("Error al cargar los datos")
    }
  }

  const finishedProducts = allProducts.filter(p => p.category === 'PT')
  const materialProducts = allProducts.filter(p => p.category === 'MP')

  const filteredBomItems = bomItems.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar BOMs por producto
  const bomsByProduct = filteredBomItems.reduce((acc, item) => {
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        productName: item.product_name,
        productCategory: item.product_category,
        items: []
      }
    }
    acc[item.product_id].items.push(item)
    return acc
  }, {} as Record<string, { productName: string, productCategory: string, items: BOMItem[] }>)

  const handleOpenDialog = (item?: BOMItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        productId: item.product_id,
        materialId: item.material_id,
        quantity: item.quantity_needed.toString(),
        unitName: item.unit_name,
        unitEquivalence: item.unit_equivalence_grams.toString()
      })
    } else {
      setEditingItem(null)
      setFormData({
        productId: "",
        materialId: "",
        quantity: "",
        unitName: "gramos",
        unitEquivalence: "1"
      })
    }
    setShowDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const quantity = parseFloat(formData.quantity)
    const equivalence = parseFloat(formData.unitEquivalence)
    
    if (!formData.productId || !formData.materialId || !quantity || !equivalence) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    try {
      const bomData = {
        product_id: formData.productId,
        material_id: formData.materialId,
        quantity_needed: quantity,
        unit_name: formData.unitName,
        unit_equivalence_grams: equivalence,
        is_active: true
      }

      if (editingItem) {
        await updateBOMItem(editingItem.id, bomData)
        toast.success("BOM actualizado exitosamente")
      } else {
        await createBOMItem(bomData)
        toast.success("BOM creado exitosamente")
      }
      
      setShowDialog(false)
      await loadData()
    } catch (error) {
      toast.error(editingItem ? "Error al actualizar BOM" : "Error al crear BOM")
      console.error(error)
    }
  }

  const handleDelete = async (item: BOMItem) => {
    if (!confirm(`¿Estás seguro de eliminar ${item.material_name} del BOM de ${item.product_name}?`)) {
      return
    }

    try {
      await deleteBOMItem(item.id)
      toast.success("BOM eliminado exitosamente")
      await loadData()
    } catch (error) {
      toast.error("Error al eliminar BOM")
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Bill of Materials</h3>
          <p className="text-sm text-gray-600">
            Configura los materiales necesarios para cada producto
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo BOM
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar por producto o material..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Object.keys(bomsByProduct).length}</div>
            <p className="text-xs text-muted-foreground">Productos con BOM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{bomItems.length}</div>
            <p className="text-xs text-muted-foreground">Total items BOM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{finishedProducts.length}</div>
            <p className="text-xs text-muted-foreground">Productos disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* BOM List */}
      {Object.keys(bomsByProduct).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(bomsByProduct).map(([productId, productBom]) => (
            <Card key={productId}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{productBom.productName}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="text-xs">
                        {productBom.productCategory === 'PT' ? 'Producto Terminado' : 'Materia Prima'}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {productBom.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.material_name}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity_needed} {item.unit_name} 
                          {item.unit_equivalence_grams !== 1 && (
                            <span> (eq: {item.unit_equivalence_grams}g)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No hay BOMs configurados
            </h3>
            <p className="text-gray-500 text-center mb-4 max-w-md">
              Comienza creando tu primer Bill of Materials para definir qué materiales necesita cada producto.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer BOM
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar BOM" : "Nuevo BOM"}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? "Modifica los datos del BOM" : "Configura los materiales necesarios para un producto"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product">Producto Final *</Label>
                <Select 
                  value={formData.productId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material Requerido *</Label>
                <Select 
                  value={formData.materialId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, materialId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {materialProducts.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad Requerida *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidad</Label>
                  <Select 
                    value={formData.unitName} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unitName: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gramos">Gramos</SelectItem>
                      <SelectItem value="kilogramos">Kilogramos</SelectItem>
                      <SelectItem value="litros">Litros</SelectItem>
                      <SelectItem value="mililitros">Mililitros</SelectItem>
                      <SelectItem value="unidades">Unidades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equivalence">Equivalencia en Gramos</Label>
                <Input
                  id="equivalence"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitEquivalence}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitEquivalence: e.target.value }))}
                  placeholder="1.00"
                />
                <p className="text-xs text-gray-500">
                  Cuántos gramos equivale 1 unidad de la medida anterior
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : editingItem ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}