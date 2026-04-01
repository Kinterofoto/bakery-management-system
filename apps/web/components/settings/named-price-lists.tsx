"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, Plus, Trash2, Edit3, List, DollarSign } from "lucide-react"
import { useNamedPriceLists } from "@/hooks/use-named-price-lists"
import { useProducts } from "@/hooks/use-products"
import { useToast } from "@/hooks/use-toast"

export function NamedPriceLists() {
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListPercentage, setNewListPercentage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState("")

  const {
    entries,
    loading,
    getPriceListNames,
    getEntriesForList,
    createBulkEntries,
    updateEntry,
    deleteEntry,
    deleteList,
  } = useNamedPriceLists()
  const { products, loading: productsLoading } = useProducts()
  const { toast } = useToast()

  const priceListNames = getPriceListNames()
  const ptProducts = products.filter(p => p.category === "PT")

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast({ title: "Error", description: "Ingrese un nombre para la lista", variant: "destructive" })
      return
    }

    const existing = priceListNames.find(p => p.name.toLowerCase() === newListName.trim().toLowerCase())
    if (existing) {
      toast({ title: "Error", description: "Ya existe una lista con ese nombre", variant: "destructive" })
      return
    }

    const percentage = parseFloat(newListPercentage)
    if (isNaN(percentage)) {
      toast({ title: "Error", description: "Ingrese un porcentaje válido", variant: "destructive" })
      return
    }

    setIsCreating(true)
    try {
      const items = ptProducts
        .filter(p => p.price && p.price > 0)
        .map(p => ({
          product_id: p.id,
          price: Math.round(p.price! * (1 + percentage / 100)),
        }))

      if (items.length === 0) {
        toast({ title: "Error", description: "No hay productos PT con precio para crear la lista", variant: "destructive" })
        return
      }

      await createBulkEntries(newListName.trim(), items)

      toast({ title: "Lista creada", description: `"${newListName.trim()}" con ${items.length} productos` })
      setIsCreateDialogOpen(false)
      setNewListName("")
      setNewListPercentage("")
      setSelectedList(newListName.trim())
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo crear la lista", variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteList = async (listName: string) => {
    if (!confirm(`¿Eliminar la lista "${listName}" y todos sus precios?`)) return

    try {
      await deleteList(listName)
      if (selectedList === listName) setSelectedList(null)
      toast({ title: "Lista eliminada", description: `"${listName}" ha sido eliminada` })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo eliminar", variant: "destructive" })
    }
  }

  const handleStartEditPrice = (entryId: string, currentPrice: number) => {
    setEditingEntry(entryId)
    setEditingPrice(currentPrice.toString())
  }

  const handleSavePrice = async (entryId: string) => {
    const price = parseFloat(editingPrice)
    if (isNaN(price) || price < 0) {
      toast({ title: "Error", description: "Ingrese un precio válido", variant: "destructive" })
      return
    }

    try {
      await updateEntry(entryId, { price })
      toast({ title: "Precio actualizado" })
      setEditingEntry(null)
      setEditingPrice("")
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo actualizar", variant: "destructive" })
    }
  }

  const handleDeletePrice = async (entryId: string) => {
    try {
      await deleteEntry(entryId)
      toast({ title: "Precio eliminado" })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo eliminar", variant: "destructive" })
    }
  }

  const selectedListEntries = selectedList ? getEntriesForList(selectedList) : []

  if (loading || productsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Listas de Precios por Nombre</h3>
          <p className="text-gray-600">Crea listas de precios para asignar a clientes (ej: Cooperama, Nacional, Hoteles)</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Lista
        </Button>
      </div>

      {/* Lists overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {priceListNames.map((pl) => (
          <Card
            key={pl.name}
            className={`cursor-pointer transition-all ${
              selectedList === pl.name ? "ring-2 ring-primary" : "hover:shadow-md"
            }`}
            onClick={() => setSelectedList(selectedList === pl.name ? null : pl.name)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{pl.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{pl.productCount} productos</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-red-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteList(pl.name)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {priceListNames.length === 0 && (
          <div className="col-span-full text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay listas de precios</h3>
            <p className="text-gray-600">Crea una nueva lista para comenzar.</p>
          </div>
        )}
      </div>

      {/* Selected list detail */}
      {selectedList && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Precios de "{selectedList}" ({selectedListEntries.length} productos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Precio Regular</TableHead>
                    <TableHead>Precio Lista</TableHead>
                    <TableHead>Diferencia</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedListEntries.map((entry) => {
                    const regularPrice = entry.product?.price || 0
                    const diff = entry.price - regularPrice
                    const diffPercent = regularPrice > 0 ? ((diff / regularPrice) * 100).toFixed(1) : "N/A"
                    const isEditing = editingEntry === entry.id

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {entry.product?.name} {entry.product?.weight}
                            </div>
                            {entry.product?.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {entry.product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            ${regularPrice.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(e.target.value)}
                                className="h-8 w-28 text-sm"
                                min="0"
                                step="1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSavePrice(entry.id)
                                  if (e.key === "Escape") { setEditingEntry(null); setEditingPrice("") }
                                }}
                              />
                              <Button size="sm" onClick={() => handleSavePrice(entry.id)} className="h-8 px-2">
                                ✓
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingEntry(null); setEditingPrice("") }} className="h-8 px-2">
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                              onClick={() => handleStartEditPrice(entry.id, entry.price)}
                            >
                              <Badge variant="secondary">
                                ${entry.price.toLocaleString()}
                              </Badge>
                              <Edit3 className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-gray-500"}>
                            {diff > 0 ? "+" : ""}{diff.toLocaleString()} ({diffPercent}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-red-100"
                            onClick={() => handleDeletePrice(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Lista de Precios</DialogTitle>
            <DialogDescription>
              Se generarán precios para todos los productos PT basándose en el precio regular + el porcentaje indicado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre de la Lista *</Label>
              <Input
                placeholder="Ej: Cooperama, Nacional, Hoteles"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div>
              <Label>Porcentaje sobre precio regular *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Ej: 1 para +1%, -5 para -5%"
                  value={newListPercentage}
                  onChange={(e) => setNewListPercentage(e.target.value)}
                  step="0.1"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usa valores positivos para recargo o negativos para descuento.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateList} disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Lista ({ptProducts.filter(p => p.price && p.price > 0).length} productos)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
