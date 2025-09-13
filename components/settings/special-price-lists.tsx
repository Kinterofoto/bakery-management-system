"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, X, Edit3, DollarSign } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { useClients } from "@/hooks/use-clients"
import { useClientPriceLists } from "@/hooks/use-client-price-lists"
import { useToast } from "@/hooks/use-toast"

interface SpecialPriceMatrix {
  productId: string
  productName: string
  productDescription: string | null
  regularPrice: number | null
  clientPrices: Record<string, number | null>
}

export function SpecialPriceLists() {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [isAddingClient, setIsAddingClient] = useState(false)
  const [clientToAdd, setClientToAdd] = useState("")
  const [editingCell, setEditingCell] = useState<{ productId: string; clientId: string } | null>(null)
  const [editingPrice, setEditingPrice] = useState("")

  const { products, loading: productsLoading } = useProducts()
  const { clients, loading: clientsLoading } = useClients()
  const { priceLists, loading: priceListsLoading, createPriceList, updatePriceList, getClientPrice } = useClientPriceLists()
  const { toast } = useToast()

  // Get clients that already have special pricing
  const clientsWithPricing = [...new Set(priceLists.map(p => p.client_id).filter(Boolean))]

  // Include clients that have pricing and any additionally selected clients
  const displayClients = clients.filter(client =>
    clientsWithPricing.includes(client.id) || selectedClients.includes(client.id)
  )

  // Available clients to add (exclude already displayed ones)
  const availableClients = clients.filter(client =>
    !clientsWithPricing.includes(client.id) && !selectedClients.includes(client.id)
  )

  // Build the price matrix - only PT (Producto Terminado) products
  const priceMatrix: SpecialPriceMatrix[] = products
    .filter(product => product.category === "PT")
    .map(product => {
      const clientPrices: Record<string, number | null> = {}

      displayClients.forEach(client => {
        clientPrices[client.id] = getClientPrice(product.id, client.id)
      })

      return {
        productId: product.id,
        productName: product.name,
        productDescription: product.description,
        regularPrice: product.price,
        clientPrices
      }
    })

  const handleAddClient = () => {
    if (clientToAdd) {
      setSelectedClients(prev => [...prev, clientToAdd])
      setClientToAdd("")
      setIsAddingClient(false)
    }
  }

  const handleRemoveClient = (clientId: string) => {
    // Only allow removing if client has no pricing data
    const hasData = priceLists.some(p => p.client_id === clientId)
    if (hasData) {
      toast({
        title: "No se puede eliminar",
        description: "Este cliente tiene precios configurados. Elimine los precios primero.",
        variant: "destructive",
      })
      return
    }

    setSelectedClients(prev => prev.filter(id => id !== clientId))
  }

  const handleStartEdit = (productId: string, clientId: string) => {
    const currentPrice = getClientPrice(productId, clientId)
    setEditingCell({ productId, clientId })
    setEditingPrice(currentPrice?.toString() || "")
  }

  const handleSavePrice = async () => {
    if (!editingCell) return

    const { productId, clientId } = editingCell
    const price = parseFloat(editingPrice)

    if (isNaN(price) || price < 0) {
      toast({
        title: "Error",
        description: "Ingrese un precio válido",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if price list entry already exists
      const existingPriceList = priceLists.find(
        p => p.product_id === productId && p.client_id === clientId
      )

      if (existingPriceList) {
        await updatePriceList(existingPriceList.id, { unit_price: price })
      } else {
        await createPriceList({
          product_id: productId,
          client_id: clientId,
          unit_price: price,
          is_active: true
        })
      }

      toast({
        title: "Éxito",
        description: "Precio actualizado correctamente",
      })

      setEditingCell(null)
      setEditingPrice("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el precio",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditingPrice("")
  }

  const loading = productsLoading || clientsLoading || priceListsLoading

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando listas de precios...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Listas de Precios Especiales</h3>
          <p className="text-gray-600">Configura precios específicos por cliente y producto</p>
        </div>

        {!isAddingClient ? (
          <Button onClick={() => setIsAddingClient(true)} disabled={availableClients.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Cliente
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={clientToAdd} onValueChange={setClientToAdd}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddClient} size="sm" disabled={!clientToAdd}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsAddingClient(false)} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Price Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Matriz de Precios ({priceMatrix.length} productos PT, {displayClients.length} clientes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priceMatrix.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos terminados</h3>
              <p className="text-gray-600">Solo se muestran productos con categoría PT (Producto Terminado).</p>
            </div>
          ) : displayClients.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes seleccionados</h3>
              <p className="text-gray-600">Agrega clientes para comenzar a configurar precios especiales.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Producto</TableHead>
                    <TableHead className="min-w-24">Precio Regular</TableHead>
                    {displayClients.map(client => (
                      <TableHead key={client.id} className="min-w-32">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{client.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveClient(client.id)}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceMatrix.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{row.productName}</div>
                          {row.productDescription && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {row.productDescription}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.regularPrice ? (
                          <Badge variant="outline">
                            ${row.regularPrice.toLocaleString()}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Sin precio</span>
                        )}
                      </TableCell>
                      {displayClients.map(client => {
                        const price = row.clientPrices[client.id]
                        const isEditing = editingCell?.productId === row.productId && editingCell?.clientId === client.id

                        return (
                          <TableCell key={client.id}>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={editingPrice}
                                  onChange={(e) => setEditingPrice(e.target.value)}
                                  className="h-8 text-sm"
                                  min="0"
                                  step="0.01"
                                  autoFocus
                                />
                                <Button size="sm" onClick={handleSavePrice} className="h-8 px-2">
                                  ✓
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 px-2">
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                                onClick={() => handleStartEdit(row.productId, client.id)}
                              >
                                {price !== null ? (
                                  <Badge variant="secondary">
                                    ${price.toLocaleString()}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                                <Edit3 className="h-3 w-3 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {displayClients.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">
              <p><strong>Instrucciones:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Haz clic en cualquier celda de precio para editarla</li>
                <li>Los precios en blanco usarán el precio regular del producto</li>
                <li>Usa el botón X para remover clientes sin precios configurados</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}