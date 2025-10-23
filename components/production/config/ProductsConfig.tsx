"use client"

import { useState, useEffect } from "react"
import { useProducts } from "@/hooks/use-products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Package, Box } from "lucide-react"
import { toast } from "sonner"

const UNIT_OPTIONS = [
  { value: "kg", label: "Kilogramos" },
  { value: "gramos", label: "Gramos" },
  { value: "unidades", label: "Unidades" },
  { value: "litros", label: "Litros" },
  { value: "ml", label: "Mililitros" },
]

export function ProductsConfig() {
  const { getAllProducts, createProduct, updateProduct, deleteProduct } = useProducts()
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<"PT" | "PP">("PT")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "unidades",
    weight: "",
    category: "PT" as "PT" | "PP",
    price: ""
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const products = await getAllProducts()
    setAllProducts(products)
  }

  const ptProducts = allProducts.filter(p => p.category === "PT")
  const ppProducts = allProducts.filter(p => p.category === "PP")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    try {
      setLoading(true)

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        unit: formData.unit,
        weight: formData.weight.trim() || null,
        category: formData.category,
        price: formData.price ? parseFloat(formData.price) : null
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData)
        toast.success("Producto actualizado")
      } else {
        await createProduct(productData)
        toast.success("Producto creado")
      }

      await loadProducts()
      resetForm()
      setShowDialog(false)
    } catch (error) {
      toast.error("Error al guardar el producto")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      unit: product.unit,
      weight: product.weight || "",
      category: product.category,
      price: product.price ? product.price.toString() : ""
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      return
    }

    try {
      await deleteProduct(id)
      await loadProducts()
      toast.success("Producto eliminado")
    } catch (error) {
      toast.error("Error al eliminar el producto")
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      unit: "unidades",
      weight: "",
      category: selectedCategory,
      price: ""
    })
    setEditingProduct(null)
  }

  const handleOpenDialog = (category: "PT" | "PP") => {
    setSelectedCategory(category)
    resetForm()
    setFormData(prev => ({ ...prev, category }))
    setShowDialog(true)
  }

  const renderProductsTable = (products: any[], category: "PT" | "PP") => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {category === "PT" ? "Productos Terminados (PT)" : "Productos en Proceso (PP)"}
          </h3>
          <p className="text-sm text-gray-600">
            {category === "PT"
              ? "Productos finales listos para venta o entrega"
              : "Productos intermedios en proceso de elaboración"
            }
          </p>
        </div>
        <Button onClick={() => handleOpenDialog(category)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-gray-500">{product.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {product.weight ? (
                    <Badge variant="outline">{product.weight}</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{product.unit}</Badge>
                </TableCell>
                <TableCell>
                  {product.price ? (
                    `$${product.price.toLocaleString()}`
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay productos {category === "PT" ? "terminados" : "en proceso"} configurados
        </div>
      )}
    </div>
  )

  return (
    <>
      <Tabs defaultValue="pt" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pt" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Productos Terminados
          </TabsTrigger>
          <TabsTrigger value="pp" className="flex items-center gap-2">
            <Box className="w-4 h-4" />
            Productos en Proceso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pt">
          {renderProductsTable(ptProducts, "PT")}
        </TabsContent>

        <TabsContent value="pp">
          {renderProductsTable(ppProducts, "PP")}
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
              <DialogDescription>
                Configura el producto {formData.category === "PT" ? "terminado" : "en proceso"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Pan integral"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Peso</Label>
                  <Input
                    id="weight"
                    placeholder="Ej: 500g"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción opcional del producto"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidad *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : (editingProduct ? "Actualizar" : "Crear")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
