"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { Sidebar } from "@/components/layout/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Eye, Edit, Trash2, MapPin, Building2, Loader2, AlertCircle, Users, X, Settings, Clock } from "lucide-react"
import { ScheduleMatrix } from "@/components/receiving-schedules/schedule-matrix"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useClientConfig } from "@/hooks/use-client-config"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

interface BranchFormData {
  name: string
  address: string
  contact_person: string
  phone: string
  email: string
  is_main: boolean
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [isViewClientOpen, setIsViewClientOpen] = useState(false)
  const [isEditClientOpen, setIsEditClientOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [clientOrderByUnits, setClientOrderByUnits] = useState(true)
  
  // Client form data
  const [clientName, setClientName] = useState("")
  const [clientRazonSocial, setClientRazonSocial] = useState("")
  const [clientContactPerson, setClientContactPerson] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  
  // Branches form data
  const [branches, setBranches] = useState<BranchFormData[]>([
    { name: "Sucursal Principal", address: "", contact_person: "", phone: "", email: "", is_main: true }
  ])
  
  // Edit branches form data
  const [editBranches, setEditBranches] = useState<(BranchFormData & { id?: string })[]>([])
  const [originalBranches, setOriginalBranches] = useState<any[]>([]) // Store original branches for comparison

  const { clients, loading, createClient, updateClient, deleteClient, error } = useClients()
  const { createBranch, updateBranch: updateBranchInDB, deleteBranch, getBranchesByClient } = useBranches()
  const { fetchClientConfig, upsertClientConfig } = useClientConfig()
  const { toast } = useToast()

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const resetForm = () => {
    setClientName("")
    setClientRazonSocial("")
    setClientContactPerson("")
    setClientPhone("")
    setClientEmail("")
    setClientAddress("")
    setBranches([
      { name: "Sucursal Principal", address: "", contact_person: "", phone: "", email: "", is_main: true }
    ])
    setEditBranches([])
    setOriginalBranches([])
  }

  const addBranch = () => {
    setBranches([...branches, { name: "", address: "", contact_person: "", phone: "", email: "", is_main: false }])
  }

  const removeBranch = (index: number) => {
    if (branches.length > 1) {
      setBranches(branches.filter((_, i) => i !== index))
    }
  }

  const updateBranch = (index: number, field: keyof BranchFormData, value: string | boolean) => {
    const updated = [...branches]
    if (field === "is_main" && value === true) {
      // If setting as main, unset all other main branches
      updated.forEach((branch, i) => {
        if (i !== index) branch.is_main = false
      })
    }
    updated[index] = { ...updated[index], [field]: value }
    setBranches(updated)
  }

  const addEditBranch = () => {
    setEditBranches([...editBranches, { name: "", address: "", contact_person: "", phone: "", email: "", is_main: false }])
  }

  const removeEditBranch = (index: number) => {
    if (editBranches.length > 1) {
      setEditBranches(editBranches.filter((_, i) => i !== index))
    }
  }

  const updateEditBranch = (index: number, field: keyof BranchFormData, value: string | boolean) => {
    const updated = [...editBranches]
    if (field === "is_main" && value === true) {
      // If setting as main, unset all other main branches
      updated.forEach((branch, i) => {
        if (i !== index) branch.is_main = false
      })
    }
    updated[index] = { ...updated[index], [field]: value }
    setEditBranches(updated)
  }

  const handleCreateClient = async () => {
    // Validation
    if (!clientName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del cliente es requerido",
        variant: "destructive",
      })
      return
    }

    const validBranches = branches.filter(branch => branch.name.trim())
    if (validBranches.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos una sucursal",
        variant: "destructive",
      })
      return
    }

    // Ensure at least one branch is marked as main
    const hasMainBranch = validBranches.some(branch => branch.is_main)
    if (!hasMainBranch && validBranches.length > 0) {
      validBranches[0].is_main = true
    }

    setIsSubmitting(true)
    try {
      // Create client
      const newClient = await createClient({
        name: clientName.trim(),
        razon_social: clientRazonSocial.trim() || undefined,
        contact_person: clientContactPerson.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        email: clientEmail.trim() || undefined,
        address: clientAddress.trim() || undefined,
      })

      // Create branches
      for (const branch of validBranches) {
        await createBranch({
          client_id: newClient.id,
          name: branch.name.trim(),
          address: branch.address.trim() || undefined,
          contact_person: branch.contact_person.trim() || undefined,
          phone: branch.phone.trim() || undefined,
          email: branch.email.trim() || undefined,
          is_main: branch.is_main,
        })
      }

      toast({
        title: "Éxito",
        description: `Cliente "${clientName}" creado con ${validBranches.length} sucursal(es)`,
      })

      resetForm()
      setIsNewClientOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear el cliente",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewClient = (client: any) => {
    setSelectedClient(client)
    setIsViewClientOpen(true)
  }

  const handleEditClient = (client: any) => {
    setSelectedClient(client)
    setClientName(client.name)
    setClientRazonSocial(client.razon_social || "")
    setClientContactPerson(client.contact_person || "")
    setClientPhone(client.phone || "")
    setClientEmail(client.email || "")
    setClientAddress(client.address || "")
    
    // Load client branches
    const clientBranches = getBranchesByClient(client.id)
    setOriginalBranches(clientBranches)
    
    const editableBranches = clientBranches.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address || "",
      contact_person: branch.contact_person || "",
      phone: branch.phone || "",
      email: branch.email || "",
      is_main: branch.is_main
    }))
    
    // Ensure at least one branch exists
    if (editableBranches.length === 0) {
      editableBranches.push({ name: "Sucursal Principal", address: "", contact_person: "", phone: "", email: "", is_main: true })
    }
    
    setEditBranches(editableBranches)
    setIsEditClientOpen(true)
  }

  const handleUpdateClient = async () => {
    if (!selectedClient || !clientName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del cliente es requerido",
        variant: "destructive",
      })
      return
    }

    const validEditBranches = editBranches.filter(branch => branch.name.trim())
    if (validEditBranches.length === 0) {
      toast({
        title: "Error",
        description: "Debe tener al menos una sucursal",
        variant: "destructive",
      })
      return
    }

    // Ensure at least one branch is marked as main
    const hasMainBranch = validEditBranches.some(branch => branch.is_main)
    if (!hasMainBranch && validEditBranches.length > 0) {
      validEditBranches[0].is_main = true
    }

    setIsSubmitting(true)
    try {
      // Update client
      await updateClient(selectedClient.id, {
        name: clientName.trim(),
        razon_social: clientRazonSocial.trim() || undefined,
        contact_person: clientContactPerson.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        email: clientEmail.trim() || undefined,
        address: clientAddress.trim() || undefined,
      })

      // Handle branch updates
      const originalBranchIds = originalBranches.map(b => b.id)
      const currentBranchIds = validEditBranches.filter(b => b.id).map(b => b.id)
      
      // Delete branches that were removed
      const branchesToDelete = originalBranchIds.filter(id => !currentBranchIds.includes(id))
      for (const branchId of branchesToDelete) {
        await deleteBranch(branchId)
      }

      // Update or create branches
      for (const branch of validEditBranches) {
        const branchData = {
          name: branch.name.trim(),
          address: branch.address.trim() || undefined,
          contact_person: branch.contact_person.trim() || undefined,
          phone: branch.phone.trim() || undefined,
          email: branch.email.trim() || undefined,
          is_main: branch.is_main,
        }

        if (branch.id) {
          // Update existing branch
          await updateBranchInDB(branch.id, branchData)
        } else {
          // Create new branch
          await createBranch({
            client_id: selectedClient.id,
            ...branchData
          })
        }
      }

      toast({
        title: "Éxito",
        description: "Cliente y sucursales actualizados correctamente",
      })

      setIsEditClientOpen(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el cliente",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el cliente "${clientName}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteClient(clientId)
        toast({
          title: "Éxito",
          description: "Cliente eliminado correctamente",
        })
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "No se pudo eliminar el cliente",
          variant: "destructive",
        })
      }
    }
  }

  const handleConfigureClient = async (client: any) => {
    setSelectedClient(client)
    try {
      const config = await fetchClientConfig(client.id)
      setClientOrderByUnits(config?.orders_by_units ?? false)
    } catch (error) {
      // Si no existe configuración, usar default (false = por paquetes según esquema)
      setClientOrderByUnits(false)
    }
    setIsConfigOpen(true)
  }

  const handleSaveClientConfig = async () => {
    if (!selectedClient) return
    
    setIsSubmitting(true)
    try {
      await upsertClientConfig(selectedClient.id, clientOrderByUnits)
      toast({
        title: "Éxito",
        description: "Configuración del cliente actualizada correctamente",
      })
      setIsConfigOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando clientes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Recargar Página
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
                <p className="text-gray-600">Administra tus clientes, sucursales y horarios de recibo</p>
              </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs defaultValue="management" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="management" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gestión de Clientes
                </TabsTrigger>
                <TabsTrigger value="schedules" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horarios de Recibo
                </TabsTrigger>
              </TabsList>

              {/* Management Tab */}
              <TabsContent value="management" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">Clientes y Sucursales</h2>
                    <p className="text-gray-600">Crea y gestiona clientes con sus sucursales</p>
                  </div>
                  <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
                    <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nuevo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                      Completa la información del cliente y sus sucursales.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* Client Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Información del Cliente</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client-name">Nombre del Cliente *</Label>
                          <Input
                            id="client-name"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ej: Supermercado Central"
                          />
                        </div>
                        <div>
                          <Label htmlFor="client-razon-social">Razón Social</Label>
                          <Input
                            id="client-razon-social"
                            value={clientRazonSocial}
                            onChange={(e) => setClientRazonSocial(e.target.value)}
                            placeholder="Razón social del cliente"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client-contact">Persona de Contacto</Label>
                          <Input
                            id="client-contact"
                            value={clientContactPerson}
                            onChange={(e) => setClientContactPerson(e.target.value)}
                            placeholder="Nombre del contacto principal"
                          />
                        </div>
                        <div>
                          <Label htmlFor="client-phone">Teléfono</Label>
                          <Input
                            id="client-phone"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            placeholder="+57 300 123 4567"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client-email">Email</Label>
                          <Input
                            id="client-email"
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="email@ejemplo.com"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="client-address">Dirección</Label>
                        <Textarea
                          id="client-address"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder="Dirección principal del cliente"
                        />
                      </div>
                    </div>

                    {/* Branches Information */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Sucursales</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addBranch}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Sucursal
                        </Button>
                      </div>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {branches.map((branch, index) => (
                          <div key={index} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`is-main-${index}`}
                                  checked={branch.is_main}
                                  onCheckedChange={(checked) => updateBranch(index, "is_main", checked)}
                                />
                                <Label htmlFor={`is-main-${index}`} className="text-sm font-medium">
                                  Sucursal Principal
                                </Label>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeBranch(index)}
                                disabled={branches.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`branch-name-${index}`}>Nombre Sucursal *</Label>
                                <Input
                                  id={`branch-name-${index}`}
                                  value={branch.name}
                                  onChange={(e) => updateBranch(index, "name", e.target.value)}
                                  placeholder="Ej: Sucursal Centro"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`branch-contact-${index}`}>Contacto</Label>
                                <Input
                                  id={`branch-contact-${index}`}
                                  value={branch.contact_person}
                                  onChange={(e) => updateBranch(index, "contact_person", e.target.value)}
                                  placeholder="Nombre del contacto"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`branch-phone-${index}`}>Teléfono</Label>
                                <Input
                                  id={`branch-phone-${index}`}
                                  value={branch.phone}
                                  onChange={(e) => updateBranch(index, "phone", e.target.value)}
                                  placeholder="+57 300 123 4567"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`branch-email-${index}`}>Email</Label>
                                <Input
                                  id={`branch-email-${index}`}
                                  type="email"
                                  value={branch.email}
                                  onChange={(e) => updateBranch(index, "email", e.target.value)}
                                  placeholder="email@ejemplo.com"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`branch-address-${index}`}>Dirección</Label>
                              <Textarea
                                id={`branch-address-${index}`}
                                value={branch.address}
                                onChange={(e) => updateBranch(index, "address", e.target.value)}
                                placeholder="Dirección de la sucursal"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetForm()
                          setIsNewClientOpen(false)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateClient} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Crear Cliente
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                  </Dialog>
                </div>

                {/* Search */}
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por nombre, contacto or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Clients Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Clientes ({filteredClients.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
                    <p className="text-gray-600">Crea tu primer cliente para comenzar.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Sucursales</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.contact_person || "-"}</TableCell>
                          <TableCell>{client.phone || "-"}</TableCell>
                          <TableCell>{client.email || "-"}</TableCell>
                          <TableCell>
                            {client.address ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="truncate max-w-xs">{client.address}</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span>{getBranchesByClient(client.id).length}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewClient(client)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditClient(client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleConfigureClient(client)}>
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClient(client.id, client.name)}
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

              {/* Schedules Tab */}
              <TabsContent value="schedules" className="space-y-6">
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Módulo de Horarios</h3>
                  <p className="text-gray-600 mb-4">
                    Configura los horarios de recibo para clientes y sucursales
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-blue-800">
                      🚧 En desarrollo - Vista matriz con drag & drop próximamente
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* View Client Dialog */}
            <Dialog open={isViewClientOpen} onOpenChange={setIsViewClientOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Detalles del Cliente</DialogTitle>
                </DialogHeader>
                {selectedClient && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre</Label>
                        <Input value={selectedClient.name} disabled readOnly />
                      </div>
                      <div>
                        <Label>Razón Social</Label>
                        <Input value={selectedClient.razon_social || ""} disabled readOnly />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contacto</Label>
                        <Input value={selectedClient.contact_person || ""} disabled readOnly />
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input value={selectedClient.phone || ""} disabled readOnly />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input value={selectedClient.email || ""} disabled readOnly />
                      </div>
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <Textarea value={selectedClient.address || ""} disabled readOnly />
                    </div>
                    <div>
                      <Label>Sucursales ({getBranchesByClient(selectedClient.id).length})</Label>
                      <div className="space-y-2 mt-2">
                        {getBranchesByClient(selectedClient.id).map((branch) => (
                          <div key={branch.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{branch.name}</span>
                              {branch.is_main && <Badge className="ml-2 bg-blue-100 text-blue-800">Principal</Badge>}
                            </div>
                            <span className="text-sm text-gray-500">{branch.address || "Sin dirección"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Client Dialog */}
            <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Cliente</DialogTitle>
                  <DialogDescription>
                    Modifica la información del cliente y gestiona sus sucursales.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Client Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Información del Cliente</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-name">Nombre del Cliente *</Label>
                        <Input
                          id="edit-name"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-razon-social">Razón Social</Label>
                        <Input
                          id="edit-razon-social"
                          value={clientRazonSocial}
                          onChange={(e) => setClientRazonSocial(e.target.value)}
                          placeholder="Razón social del cliente"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-contact">Persona de Contacto</Label>
                        <Input
                          id="edit-contact"
                          value={clientContactPerson}
                          onChange={(e) => setClientContactPerson(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">Teléfono</Label>
                        <Input
                          id="edit-phone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-address">Dirección</Label>
                      <Textarea
                        id="edit-address"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Branches Information */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Sucursales</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addEditBranch}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Sucursal
                      </Button>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {editBranches.map((branch, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-is-main-${index}`}
                                checked={branch.is_main}
                                onCheckedChange={(checked) => updateEditBranch(index, "is_main", checked)}
                              />
                              <Label htmlFor={`edit-is-main-${index}`} className="text-sm font-medium">
                                Sucursal Principal
                              </Label>
                              {branch.id && (
                                <Badge variant="secondary" className="ml-2">
                                  Existente
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeEditBranch(index)}
                              disabled={editBranches.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit-branch-name-${index}`}>Nombre Sucursal *</Label>
                              <Input
                                id={`edit-branch-name-${index}`}
                                value={branch.name}
                                onChange={(e) => updateEditBranch(index, "name", e.target.value)}
                                placeholder="Ej: Sucursal Centro"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-branch-contact-${index}`}>Contacto</Label>
                              <Input
                                id={`edit-branch-contact-${index}`}
                                value={branch.contact_person}
                                onChange={(e) => updateEditBranch(index, "contact_person", e.target.value)}
                                placeholder="Nombre del contacto"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit-branch-phone-${index}`}>Teléfono</Label>
                              <Input
                                id={`edit-branch-phone-${index}`}
                                value={branch.phone}
                                onChange={(e) => updateEditBranch(index, "phone", e.target.value)}
                                placeholder="+57 300 123 4567"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-branch-email-${index}`}>Email</Label>
                              <Input
                                id={`edit-branch-email-${index}`}
                                type="email"
                                value={branch.email}
                                onChange={(e) => updateEditBranch(index, "email", e.target.value)}
                                placeholder="email@ejemplo.com"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`edit-branch-address-${index}`}>Dirección</Label>
                            <Textarea
                              id={`edit-branch-address-${index}`}
                              value={branch.address}
                              onChange={(e) => updateEditBranch(index, "address", e.target.value)}
                              placeholder="Dirección de la sucursal"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditClientOpen(false)
                        resetForm()
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleUpdateClient} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Client Configuration Dialog */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configuración del Cliente</DialogTitle>
                  <DialogDescription>
                    Configura las preferencias de pedidos para {selectedClient?.name}
                  </DialogDescription>
                </DialogHeader>
                {selectedClient && (
                  <div className="space-y-6 py-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Tipo de Pedido</Label>
                        <p className="text-sm text-muted-foreground">
                          ¿Cómo prefiere el cliente realizar sus pedidos?
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {clientOrderByUnits ? "Por Unidades" : "Por Paquetes"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {clientOrderByUnits 
                              ? "Los pedidos se manejan por unidades individuales"
                              : "Los pedidos se manejan por paquetes/cajas"
                            }
                          </div>
                        </div>
                        <Switch
                          checked={clientOrderByUnits}
                          onCheckedChange={setClientOrderByUnits}
                        />
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="font-medium">
                            {clientOrderByUnits ? "Unidades" : "Paquetes"}
                          </span>
                          <span>- Configuración actual</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsConfigOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveClientConfig} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
              </TabsContent>

              {/* Schedules Tab */}
              <TabsContent value="schedules" className="space-y-6">
                <ScheduleMatrix />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}