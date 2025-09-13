"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle, Package, Tag, FileSpreadsheet, DollarSign } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { useClients } from "@/hooks/use-clients"
import { useProductConfigs, useProductAliases } from "@/hooks/use-product-configs"
import { useToast } from "@/hooks/use-toast"
import { SpecialPriceLists } from "./special-price-lists"

export function ProductsModule() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isAliasDialogOpen, setIsAliasDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<any | null>(null)
  const [selectedAlias, setSelectedAlias] = useState<any | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states for product config
  const [unitsPerPackage, setUnitsPerPackage] = useState(1)

  // Form states for product alias
  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedClient, setSelectedClient] = useState("")
  const [clientAlias, setClientAlias] = useState("")

  // Form states for World Office config
  const [isWODialogOpen, setIsWODialogOpen] = useState(false)
  const [selectedWOProduct, setSelectedWOProduct] = useState<any | null>(null)
  const [nombreWO, setNombreWO] = useState("")
  const [codigoWO, setCodigoWO] = useState("")

  const { products, loading: productsLoading, updateWorldOfficeFields } = useProducts()
  const { clients, loading: clientsLoading } = useClients()
  const { productConfigs, loading: configsLoading, updateProductConfig, createProductConfig } = useProductConfigs()
  const { productAliases, loading: aliasesLoading, createProductAlias, updateProductAlias, deleteProductAlias } = useProductAliases()
  const { toast } = useToast()

  const filteredConfigs = productConfigs.filter((config) => {
    const searchText = searchTerm.toLowerCase()
    return (
      config.product?.name?.toLowerCase().includes(searchText) ||
      config.product?.description?.toLowerCase().includes(searchText)
    )
  })

  const filteredAliases = productAliases.filter((alias) => {
    const searchText = searchTerm.toLowerCase()
    return (
      alias.product?.name?.toLowerCase().includes(searchText) ||
      alias.client?.name?.toLowerCase().includes(searchText) ||
      alias.client_alias?.toLowerCase().includes(searchText)
    )
  })

  // Filter products for World Office - only PT (Producto Terminado)
  const worldOfficeProducts = products.filter(product => {
    if (product.category !== "PT") return false
    
    if (!searchTerm.trim()) return true
    
    const searchText = searchTerm.toLowerCase()
    return (
      product.name.toLowerCase().includes(searchText) ||
      product.description?.toLowerCase().includes(searchText) ||
      product.nombre_wo?.toLowerCase().includes(searchText) ||
      product.codigo_wo?.toLowerCase().includes(searchText)
    )
  })

  const handleEditConfig = (config: any) => {
    setSelectedConfig(config)
    setUnitsPerPackage(config.units_per_package || 1)
    setIsConfigDialogOpen(true)
  }

  const handleUpdateConfig = async () => {
    if (!selectedConfig) return

    setIsSubmitting(true)
    try {
      await updateProductConfig(selectedConfig.id, unitsPerPackage)
      
      toast({
        title: "Éxito",
        description: "Configuración actualizada correctamente",
      })

      setIsConfigDialogOpen(false)
      setSelectedConfig(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateAlias = async () => {
    if (!selectedProduct || !selectedClient || !clientAlias.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createProductAlias(
        selectedProduct,
        selectedClient,
        clientAlias.trim()
      )
      
      toast({
        title: "Éxito",
        description: "Alias de producto creado correctamente",
      })

      // Reset form
      setSelectedProduct("")
      setSelectedClient("")
      setClientAlias("")
      setIsAliasDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear el alias",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAlias = (alias: any) => {
    setSelectedAlias(alias)
    setClientAlias(alias.client_alias || "")
    setIsAliasDialogOpen(true)
  }

  const handleUpdateAlias = async () => {
    if (!selectedAlias || !clientAlias.trim()) {
      toast({
        title: "Error",
        description: "El alias del cliente es requerido",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await updateProductAlias(selectedAlias.id, {
        client_alias: clientAlias.trim()
      })
      
      toast({
        title: "Éxito",
        description: "Alias actualizado correctamente",
      })

      setIsAliasDialogOpen(false)
      setSelectedAlias(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el alias",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAlias = async (aliasId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este alias?")) {
      return
    }

    try {
      await deleteProductAlias(aliasId)
      toast({
        title: "Éxito",
        description: "Alias eliminado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar el alias",
        variant: "destructive",
      })
    }
  }

  const resetAliasForm = () => {
    setSelectedProduct("")
    setSelectedClient("")
    setClientAlias("")
    setSelectedAlias(null)
  }

  const handleEditWOProduct = (product: any) => {
    setSelectedWOProduct(product)
    setNombreWO(product.nombre_wo || "")
    setCodigoWO(product.codigo_wo || "")
    setIsWODialogOpen(true)
  }

  const handleUpdateWOProduct = async () => {
    if (!selectedWOProduct) return

    setIsSubmitting(true)
    try {
      await updateWorldOfficeFields(selectedWOProduct.id, nombreWO, codigoWO)
      
      toast({
        title: "Éxito",
        description: "Configuración de World Office actualizada correctamente",
      })

      setIsWODialogOpen(false)
      setSelectedWOProduct(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetWOForm = () => {
    setSelectedWOProduct(null)
    setNombreWO("")
    setCodigoWO("")
  }

  if (productsLoading || configsLoading || aliasesLoading || clientsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando configuración de productos...</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Configuración de Productos</h2>
          <p className="text-gray-600">Administra la configuración y aliases de productos</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="configs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-fit">
          <TabsTrigger value="configs" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Configuración de Empaque
          </TabsTrigger>
          <TabsTrigger value="world-office" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            World Office
          </TabsTrigger>
          <TabsTrigger value="special-prices" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Listas de Precios Especiales
          </TabsTrigger>
          <TabsTrigger value="aliases" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Aliases de Productos
          </TabsTrigger>
        </TabsList>

        {/* Product Configs Tab */}
        <TabsContent value="configs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Empaque ({filteredConfigs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredConfigs.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones</h3>
                  <p className="text-gray-600">Las configuraciones aparecerán aquí cuando estén disponibles.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción del Producto</TableHead>
                      <TableHead>Nombre del Producto</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Unidades por Paquete</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.product?.description || "-"}
                        </TableCell>
                        <TableCell>{config.product?.name || "-"}</TableCell>
                        <TableCell>{config.product?.weight || "-"}</TableCell>
                        <TableCell>
                          {config.product?.price ? `$${config.product.price.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">{config.units_per_package}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditConfig(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Special Prices Tab */}
        <TabsContent value="special-prices" className="space-y-6">
          <SpecialPriceLists />
        </TabsContent>

        {/* World Office Tab */}
        <TabsContent value="world-office" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equivalencias World Office ({worldOfficeProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {worldOfficeProducts.length === 0 ? (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos terminados</h3>
                  <p className="text-gray-600">Solo se muestran productos con categoría PT (Producto Terminado).</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto Sistema</TableHead>
                      <TableHead>Nombre World Office</TableHead>
                      <TableHead>Código World Office</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worldOfficeProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500">{product.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.nombre_wo ? (
                            <span className="font-medium text-blue-600">{product.nombre_wo}</span>
                          ) : (
                            <span className="text-gray-400">Sin configurar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.codigo_wo ? (
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                              {product.codigo_wo}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin configurar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.nombre_wo && product.codigo_wo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Configurado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pendiente
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWOProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Aliases Tab */}
        <TabsContent value="aliases" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isAliasDialogOpen} onOpenChange={setIsAliasDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAliasForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Alias
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedAlias ? "Editar Alias" : "Crear Nuevo Alias"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedAlias 
                      ? "Modifica la información del alias."
                      : "Crea un alias personalizado de producto para un cliente específico."
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {!selectedAlias && (
                    <>
                      <div>
                        <Label>Producto *</Label>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} {product.weight && `(${product.weight})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Cliente *</Label>
                        <Select value={selectedClient} onValueChange={setSelectedClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Alias del Cliente *</Label>
                    <Input
                      placeholder="Cómo llama el cliente a este producto"
                      value={clientAlias}
                      onChange={(e) => setClientAlias(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetAliasForm()
                        setIsAliasDialogOpen(false)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={selectedAlias ? handleUpdateAlias : handleCreateAlias} 
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {selectedAlias ? "Actualizar" : "Crear"} Alias
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aliases de Productos ({filteredAliases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAliases.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay aliases</h3>
                  <p className="text-gray-600">Crea aliases personalizados para productos de clientes específicos.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Alias del Cliente</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAliases.map((alias) => (
                      <TableRow key={alias.id}>
                        <TableCell className="font-medium">
                          {alias.product?.name || "-"}
                        </TableCell>
                        <TableCell>{alias.client?.name || alias.client_name || "-"}</TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {alias.client_alias || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAlias(alias)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAlias(alias.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit World Office Dialog */}
      <Dialog open={isWODialogOpen} onOpenChange={setIsWODialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar World Office</DialogTitle>
            <DialogDescription>
              Configure los nombres y códigos de World Office para este producto.
            </DialogDescription>
          </DialogHeader>
          {selectedWOProduct && (
            <div className="grid gap-4 py-4">
              <div>
                <Label>Producto</Label>
                <Input 
                  value={selectedWOProduct.name || ""} 
                  disabled 
                  readOnly 
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input 
                  value={selectedWOProduct.description || ""} 
                  disabled 
                  readOnly 
                />
              </div>
              <div>
                <Label>Nombre en World Office</Label>
                <Input
                  value={nombreWO}
                  onChange={(e) => setNombreWO(e.target.value)}
                  placeholder="Nombre del producto en World Office"
                />
              </div>
              <div>
                <Label>Código en World Office *</Label>
                <Input
                  value={codigoWO}
                  onChange={(e) => setCodigoWO(e.target.value)}
                  placeholder="Ej: PT0022"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetWOForm()
                    setIsWODialogOpen(false)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpdateWOProduct} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Actualizar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Config Dialog */}
      <Dialog open={isConfigDialogOpen && !isAliasDialogOpen && !isWODialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuración de Empaque</DialogTitle>
            <DialogDescription>
              Modifica las unidades por paquete para este producto.
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="grid gap-4 py-4">
              <div>
                <Label>Producto</Label>
                <Input 
                  value={selectedConfig.product?.name || ""} 
                  disabled 
                  readOnly 
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input 
                  value={selectedConfig.product?.description || ""} 
                  disabled 
                  readOnly 
                />
              </div>
              <div>
                <Label>Unidades por Paquete *</Label>
                <Input
                  type="number"
                  min="1"
                  value={unitsPerPackage}
                  onChange={(e) => setUnitsPerPackage(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConfigDialogOpen(false)
                    setSelectedConfig(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpdateConfig} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Actualizar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}