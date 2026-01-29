"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { Plus, Search, Eye, Edit, Trash2, MapPin, Building2, Loader2, AlertCircle, Users, X, Settings, Clock, CreditCard, FileText, UserCircle, Power, Map } from "lucide-react"
import { ScheduleMatrix } from "@/components/receiving-schedules/schedule-matrix"
import { SalespersonAssignmentMatrix } from "@/components/settings/salesperson-assignment-matrix"
import { ClientsMapView } from "@/components/settings/clients-map-view"
import { FREQUENCY_DAYS } from "@/lib/constants/frequency-days"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useClientConfig } from "@/hooks/use-client-config"
import { useClientCreditTerms } from "@/hooks/use-client-credit-terms"
import { useClientFrequencies } from "@/hooks/use-client-frequencies"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { FrequencyIndicator } from "@/components/settings/frequency-indicator"
import { supabase } from "@/lib/supabase"

interface BranchFormData {
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  contact_person: string
  phone: string
  email: string
  is_main: boolean
  observations: string
}

export function AdvancedClientsModule() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [isViewClientOpen, setIsViewClientOpen] = useState(false)
  const [isEditClientOpen, setIsEditClientOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [clientOrderByUnits, setClientOrderByUnits] = useState(true)
  const [clientDeliversToMainBranch, setClientDeliversToMainBranch] = useState(false)
  const [updatingBillingType, setUpdatingBillingType] = useState<Set<string>>(new Set())
  const [clientBillingTypes, setClientBillingTypes] = useState<Record<string, 'facturable' | 'remision'>>({})
  const [activeTab, setActiveTab] = useState("management")
  
  // Client form data
  const [clientName, setClientName] = useState("")
  const [clientRazonSocial, setClientRazonSocial] = useState("")
  const [clientNit, setClientNit] = useState("")
  const [clientContactPerson, setClientContactPerson] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientFacturador, setClientFacturador] = useState<"LA FABRIKA CO" | "PASTRY CHEF" | "none">("none")
  const [clientCategory, setClientCategory] = useState<"CAFE" | "UNIVERSIDAD" | "CONVENIENCIA" | "HOTEL" | "COLEGIO" | "CATERING" | "SUPERMERCADO" | "CLUB" | "RESTAURANTE" | "OTRO" | "none">("none")
  
  // Branches form data
  const [branches, setBranches] = useState<BranchFormData[]>([
    { name: "Sucursal Principal", address: "", latitude: null, longitude: null, contact_person: "", phone: "", email: "", is_main: true, observations: "" }
  ])
  
  // Edit branches form data
  const [editBranches, setEditBranches] = useState<(BranchFormData & { id?: string })[]>([])
  const [originalBranches, setOriginalBranches] = useState<any[]>([]) // Store original branches for comparison

  const { clients, loading, createClient, updateClient, toggleClientActive, error } = useClients()
  const { branches: allBranches, createBranch, updateBranch: updateBranchInDB, deleteBranch, getBranchesByClient } = useBranches()
  const { fetchClientConfig, upsertClientConfig } = useClientConfig()
  const {
    updateCreditTermInstantly,
    getCreditDaysByClient,
    isSaving,
    getAvailableCreditDays,
    loading: creditTermsLoading
  } = useClientCreditTerms()
  const { frequencies, toggleFrequency, loading: frequenciesLoading } = useClientFrequencies()
  const { toast } = useToast()

  // Memoized lookup object for O(1) branch lookup by client_id
  const branchesByClientMap = useMemo(() => {
    const map: Record<string, typeof allBranches> = {}
    allBranches.forEach(branch => {
      if (!map[branch.client_id]) {
        map[branch.client_id] = []
      }
      map[branch.client_id].push(branch)
    })
    return map
  }, [allBranches])

  // Fast O(1) lookup instead of O(n) filter
  const getBranchesByClientFast = useCallback((clientId: string) => {
    return branchesByClientMap[clientId] || []
  }, [branchesByClientMap])

  // Sincronizar billing types con los datos de clientes
  useEffect(() => {
    if (clients.length > 0) {
      const billingTypes: Record<string, 'facturable' | 'remision'> = {}
      clients.forEach(client => {
        billingTypes[client.id] = client.billing_type || 'facturable'
      })
      setClientBillingTypes(billingTypes)
    }
  }, [clients])

  // Memoized filtered clients to avoid recalculating on every render
  const filteredClients = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchLower) ||
      (client.contact_person && client.contact_person.toLowerCase().includes(searchLower)) ||
      (client.email && client.email.toLowerCase().includes(searchLower))
    )
  }, [clients, searchTerm])

  // Memoized map locations to avoid expensive recalculation
  const mapLocations = useMemo(() => {
    // Create a Set of active client IDs for O(1) lookup
    const activeClientIds = new Set(
      clients.filter(c => c.is_active !== false).map(c => c.id)
    )

    return allBranches
      .filter(branch =>
        branch.latitude &&
        branch.longitude &&
        activeClientIds.has(branch.client_id)
      )
      .map(branch => {
        const clientName = clients.find(c => c.id === branch.client_id)?.name || "Sin cliente"
        return {
          id: branch.id,
          name: branch.name,
          address: branch.address || "",
          latitude: branch.latitude!,
          longitude: branch.longitude!,
          clientName,
          clientId: branch.client_id,
          isMain: branch.is_main,
        }
      })
  }, [allBranches, clients])

  const resetForm = () => {
    setClientName("")
    setClientRazonSocial("")
    setClientNit("")
    setClientContactPerson("")
    setClientPhone("")
    setClientEmail("")
    setClientAddress("")
    setClientFacturador("none")
    setClientCategory("none")
    setBranches([
      { name: "Sucursal Principal", address: "", latitude: null, longitude: null, contact_person: "", phone: "", email: "", is_main: true, observations: "" }
    ])
    setEditBranches([])
    setOriginalBranches([])
  }

  const addBranch = () => {
    setBranches([...branches, { name: "", address: "", latitude: null, longitude: null, contact_person: "", phone: "", email: "", is_main: false, observations: "" }])
  }

  const removeBranch = (index: number) => {
    if (branches.length > 1) {
      setBranches(branches.filter((_, i) => i !== index))
    }
  }

  const updateBranch = (index: number, field: keyof BranchFormData, value: string | boolean | number | null) => {
    setBranches(prev => {
      const updated = [...prev]
      if (field === "is_main" && value === true) {
        // If setting as main, unset all other main branches
        updated.forEach((branch, i) => {
          if (i !== index) branch.is_main = false
        })
      }
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Update multiple branch fields at once (avoids race conditions)
  const updateBranchMultiple = (index: number, updates: Partial<BranchFormData>) => {
    setBranches(prev => {
      const updated = [...prev]
      if (updates.is_main === true) {
        updated.forEach((branch, i) => {
          if (i !== index) branch.is_main = false
        })
      }
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
  }

  const addEditBranch = () => {
    setEditBranches([...editBranches, { name: "", address: "", latitude: null, longitude: null, contact_person: "", phone: "", email: "", is_main: false, observations: "" }])
  }

  const removeEditBranch = (index: number) => {
    if (editBranches.length > 1) {
      setEditBranches(editBranches.filter((_, i) => i !== index))
    }
  }

  const updateEditBranch = (index: number, field: keyof BranchFormData, value: string | boolean | number | null) => {
    setEditBranches(prev => {
      const updated = [...prev]
      if (field === "is_main" && value === true) {
        updated.forEach((branch, i) => {
          if (i !== index) branch.is_main = false
        })
      }
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Update multiple edit branch fields at once (avoids race conditions)
  const updateEditBranchMultiple = (index: number, updates: Partial<BranchFormData>) => {
    setEditBranches(prev => {
      const updated = [...prev]
      if (updates.is_main === true) {
        updated.forEach((branch, i) => {
          if (i !== index) branch.is_main = false
        })
      }
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
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

    // Validate branch addresses have coordinates
    for (const branch of validBranches) {
      if (branch.address && !branch.latitude) {
        toast({
          title: "Dirección inválida",
          description: `La dirección de "${branch.name}" debe ser seleccionada del autocompletado de Google Maps`,
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Create client
      const newClient = await createClient({
        name: clientName.trim(),
        razon_social: clientRazonSocial.trim() || undefined,
        nit: clientNit.trim() || undefined,
        contact_person: clientContactPerson.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        email: clientEmail.trim() || undefined,
        address: clientAddress.trim() || undefined,
        facturador: clientFacturador === "none" ? null : clientFacturador,
        category: clientCategory === "none" ? null : clientCategory,
      })

      // Create branches
      for (const branch of validBranches) {
        await createBranch({
          client_id: newClient.id,
          name: branch.name.trim(),
          address: branch.address.trim() || undefined,
          latitude: branch.latitude ?? undefined,
          longitude: branch.longitude ?? undefined,
          contact_person: branch.contact_person.trim() || undefined,
          phone: branch.phone.trim() || undefined,
          email: branch.email.trim() || undefined,
          is_main: branch.is_main,
          observations: branch.observations.trim() || undefined,
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
    setClientNit(client.nit || "")
    setClientContactPerson(client.contact_person || "")
    setClientPhone(client.phone || "")
    setClientEmail(client.email || "")
    setClientAddress(client.address || "")
    setClientFacturador(client.facturador || "none")
    setClientCategory(client.category || "none")
    
    // Load client branches
    const clientBranches = getBranchesByClientFast(client.id)
    setOriginalBranches(clientBranches)
    
    const editableBranches = clientBranches.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address || "",
      latitude: branch.latitude ?? null,
      longitude: branch.longitude ?? null,
      contact_person: branch.contact_person || "",
      phone: branch.phone || "",
      email: branch.email || "",
      is_main: branch.is_main,
      observations: branch.observations || ""
    }))

    // Ensure at least one branch exists
    if (editableBranches.length === 0) {
      editableBranches.push({ name: "Sucursal Principal", address: "", latitude: null, longitude: null, contact_person: "", phone: "", email: "", is_main: true, observations: "" })
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

    // Validate branch addresses have coordinates
    for (const branch of validEditBranches) {
      if (branch.address && !branch.latitude) {
        toast({
          title: "Dirección inválida",
          description: `La dirección de "${branch.name}" debe ser seleccionada del autocompletado de Google Maps`,
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Update client
      await updateClient(selectedClient.id, {
        name: clientName.trim(),
        razon_social: clientRazonSocial.trim() || undefined,
        nit: clientNit.trim() || undefined,
        contact_person: clientContactPerson.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        email: clientEmail.trim() || undefined,
        address: clientAddress.trim() || undefined,
        facturador: clientFacturador === "none" ? null : clientFacturador,
        category: clientCategory === "none" ? null : clientCategory,
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
          latitude: branch.latitude ?? undefined,
          longitude: branch.longitude ?? undefined,
          contact_person: branch.contact_person.trim() || undefined,
          phone: branch.phone.trim() || undefined,
          email: branch.email.trim() || undefined,
          is_main: branch.is_main,
          observations: branch.observations.trim() || undefined,
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

      // Clear selected client and close dialog together to prevent re-render issues
      setSelectedClient(null)
      setIsEditClientOpen(false)
      setTimeout(() => resetForm(), 150)
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

  const handleToggleClientActive = async (clientId: string, clientName: string, isActive: boolean) => {
    const action = isActive ? "desactivar" : "reactivar"
    const actionPast = isActive ? "desactivado" : "reactivado"

    if (confirm(`¿Estás seguro de que quieres ${action} el cliente "${clientName}"?`)) {
      try {
        await toggleClientActive(clientId, !isActive)
        toast({
          title: "Éxito",
          description: `Cliente ${actionPast} correctamente`,
        })
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || `No se pudo ${action} el cliente`,
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
      setClientDeliversToMainBranch(config?.delivers_to_main_branch ?? false)
    } catch (error) {
      // Si no existe configuración, usar default (false = por paquetes según esquema)
      setClientOrderByUnits(false)
      setClientDeliversToMainBranch(false)
    }
    setIsConfigOpen(true)
  }

  const handleSaveClientConfig = async () => {
    if (!selectedClient) return

    setIsSubmitting(true)
    try {
      await upsertClientConfig(selectedClient.id, clientOrderByUnits, clientDeliversToMainBranch)
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

  const handleUpdateBillingType = async (clientId: string, billingType: 'facturable' | 'remision') => {
    setUpdatingBillingType(prev => new Set(prev).add(clientId))

    try {
      // Update local state immediately for instant feedback
      setClientBillingTypes(prev => ({
        ...prev,
        [clientId]: billingType
      }))

      // Update in database
      const { error } = await supabase
        .from("clients")
        .update({ billing_type: billingType })
        .eq("id", clientId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: `Tipo de facturación actualizado a ${billingType === 'facturable' ? 'Factura' : 'Remisión'}`,
      })
    } catch (error: any) {
      // Revert local state on error
      const originalBillingType = clients.find(c => c.id === clientId)?.billing_type || 'facturable'
      setClientBillingTypes(prev => ({
        ...prev,
        [clientId]: originalBillingType
      }))

      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el tipo de facturación",
        variant: "destructive",
      })
    } finally {
      setUpdatingBillingType(prev => {
        const newSet = new Set(prev)
        newSet.delete(clientId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando clientes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestión
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="credit-terms" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Crédito
          </TabsTrigger>
          <TabsTrigger value="billing-type" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="salesperson" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Vendedor
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Mapa
          </TabsTrigger>
        </TabsList>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">Clientes y Sucursales</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gray-600 text-sm mr-2">Crea y gestiona clientes con sus sucursales</p>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border shadow-sm">
                  {FREQUENCY_DAYS.map(day => (
                    <div key={day.id} className="flex items-center gap-1" title={day.fullLabel}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: day.color }}></div>
                      <span className="text-[10px] font-medium text-gray-500">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
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
                <h4 className="text-lg font-semibold">Información del Cliente</h4>
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
                    <Label htmlFor="client-nit">NIT</Label>
                    <Input
                      id="client-nit"
                      value={clientNit}
                      onChange={(e) => setClientNit(e.target.value)}
                      placeholder="Número de Identificación Tributaria"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-contact">Persona de Contacto</Label>
                    <Input
                      id="client-contact"
                      value={clientContactPerson}
                      onChange={(e) => setClientContactPerson(e.target.value)}
                      placeholder="Nombre del contacto principal"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-phone">Teléfono</Label>
                    <Input
                      id="client-phone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-facturador">Facturador</Label>
                    <Select value={clientFacturador} onValueChange={setClientFacturador}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar facturador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        <SelectItem value="LA FABRIKA CO">LA FABRIKA CO</SelectItem>
                        <SelectItem value="PASTRY CHEF">PASTRY CHEF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="client-category">Categoría</Label>
                    <Select value={clientCategory} onValueChange={setClientCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        <SelectItem value="CAFE">CAFE</SelectItem>
                        <SelectItem value="UNIVERSIDAD">UNIVERSIDAD</SelectItem>
                        <SelectItem value="CONVENIENCIA">CONVENIENCIA</SelectItem>
                        <SelectItem value="HOTEL">HOTEL</SelectItem>
                        <SelectItem value="COLEGIO">COLEGIO</SelectItem>
                        <SelectItem value="CATERING">CATERING</SelectItem>
                        <SelectItem value="SUPERMERCADO">SUPERMERCADO</SelectItem>
                        <SelectItem value="CLUB">CLUB</SelectItem>
                        <SelectItem value="RESTAURANTE">RESTAURANTE</SelectItem>
                        <SelectItem value="OTRO">OTRO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Branches Information */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold">Sucursales</h4>
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
                        <AddressAutocomplete
                          value={branch.address}
                          coordinates={branch.latitude && branch.longitude ? { lat: branch.latitude, lng: branch.longitude } : null}
                          onChange={(address, coordinates) => {
                            updateBranchMultiple(index, {
                              address,
                              latitude: coordinates?.lat ?? null,
                              longitude: coordinates?.lng ?? null
                            })
                          }}
                          placeholder="Buscar dirección en Google Maps"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`branch-observations-${index}`}>Observaciones</Label>
                        <Textarea
                          id={`branch-observations-${index}`}
                          value={branch.observations}
                          onChange={(e) => updateBranch(index, "observations", e.target.value)}
                          placeholder="Observaciones adicionales sobre la sucursal"
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
                  placeholder="Buscar por nombre, contacto o email..."
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
                  <TableHead>Facturador</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Sucursales</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className={!client.is_active ? "bg-gray-50 opacity-60" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {client.name}
                        {!client.is_active && (
                          <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client.contact_person || "-"}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell>
                      {client.facturador ? (
                        <Badge variant="outline">{client.facturador}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {client.category ? (
                        <Badge variant="secondary">{client.category}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const branches = getBranchesByClientFast(client.id)
                        const mainBranch = branches.find(b => b.is_main) || branches[0]
                        
                        if (!mainBranch) return <span className="text-gray-300">-</span>
                        
                        return (
                          <div className="flex items-center">
                            <FrequencyIndicator
                              branchId={mainBranch.id}
                              frequencies={frequencies}
                              onToggle={toggleFrequency}
                              isLoading={frequenciesLoading}
                            />
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{getBranchesByClientFast(client.id).length}</span>
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
                          onClick={() => handleToggleClientActive(client.id, client.name, client.is_active)}
                          className={!client.is_active ? "border-green-500 text-green-600 hover:bg-green-50" : "border-red-500 text-red-600 hover:bg-red-50"}
                        >
                          <Power className="h-4 w-4" />
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

        {/* Schedules Tab - Lazy loaded */}
        <TabsContent value="schedules" className="space-y-6">
          {activeTab === "schedules" && <ScheduleMatrix />}
        </TabsContent>

        {/* Credit Terms Tab */}
        <TabsContent value="credit-terms" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Días de Crédito por Cliente</h3>
              <p className="text-gray-600">Configura los días de crédito para cada cliente y sucursal</p>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Credit Terms Table */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Días de Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || creditTermsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Cargando información...</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
                  <p className="text-gray-600">Crea clientes primero para configurar sus días de crédito.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Cliente</TableHead>
                      <TableHead>Días de Crédito</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const clientBranches = getBranchesByClientFast(client.id)
                      const currentCreditDays = getCreditDaysByClient(client.id)
                      const isUpdating = isSaving(client.id)

                      return (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              <div className="text-xs text-gray-500">
                                {clientBranches.length} sucursal{clientBranches.length !== 1 ? 'es' : ''}
                                {client.category && <span> • {client.category}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getAvailableCreditDays().map((days) => (
                                <Button
                                  key={days}
                                  variant={currentCreditDays === days ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateCreditTermInstantly(client.id, days)}
                                  disabled={isUpdating}
                                  className={`
                                    min-w-[60px] h-8 text-xs transition-all duration-200
                                    ${currentCreditDays === days
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-gray-100'
                                    }
                                  `}
                                >
                                  {days === 0 ? 'Contado' : `${days}d`}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isUpdating ? (
                              <div className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs text-gray-500">...</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {currentCreditDays === 0 ? 'Contado' : `${currentCreditDays}d`}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Type Tab */}
        <TabsContent value="billing-type" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Tipo de Facturación</h3>
              <p className="text-gray-600">Configura si el cliente recibe remisión o factura directa</p>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing Type Table */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tipo de Facturación</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Cargando información...</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
                  <p className="text-gray-600">Crea clientes primero para configurar su tipo de facturación.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Cliente</TableHead>
                      <TableHead>Tipo de Facturación</TableHead>
                      <TableHead className="w-[150px]">Estado Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => {
                      const clientBranches = getBranchesByClientFast(client.id)
                      const currentBillingType = clientBillingTypes[client.id] || client.billing_type || 'facturable'
                      const isUpdating = updatingBillingType.has(client.id)

                      return (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              <div className="text-xs text-gray-500">
                                {clientBranches.length} sucursal{clientBranches.length !== 1 ? 'es' : ''}
                                {client.category && <span> • {client.category}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant={currentBillingType === 'facturable' ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleUpdateBillingType(client.id, 'facturable')}
                                disabled={isUpdating}
                                className={`
                                  min-w-[80px] h-8 text-xs transition-all duration-200
                                  ${currentBillingType === 'facturable'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-gray-100'
                                  }
                                `}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Factura
                              </Button>
                              <Button
                                variant={currentBillingType === 'remision' ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleUpdateBillingType(client.id, 'remision')}
                                disabled={isUpdating}
                                className={`
                                  min-w-[80px] h-8 text-xs transition-all duration-200
                                  ${currentBillingType === 'remision'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-gray-100'
                                  }
                                `}
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                Remisión
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isUpdating ? (
                              <div className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs text-gray-500">...</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {currentBillingType === 'facturable' ? 'Factura' : 'Remisión'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salesperson Assignment Tab - Lazy loaded */}
        <TabsContent value="salesperson" className="space-y-6">
          {activeTab === "salesperson" && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">Asignación de Vendedores</h3>
                  <p className="text-gray-600">Asigna un vendedor (comercial) a cada cliente</p>
                </div>
              </div>

              {/* Search */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <SalespersonAssignmentMatrix clients={filteredClients} loading={loading} />
            </>
          )}
        </TabsContent>

        {/* Map Tab - Lazy loaded */}
        <TabsContent value="map" className="space-y-6">
          {activeTab === "map" && (
            <ClientsMapView
              locations={mapLocations}
              loading={loading}
              frequencies={frequencies}
              onToggleFrequency={toggleFrequency}
            />
          )}
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
                  <Label>NIT</Label>
                  <Input value={selectedClient.nit || ""} disabled readOnly />
                </div>
                <div>
                  <Label>Contacto</Label>
                  <Input value={selectedClient.contact_person || ""} disabled readOnly />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facturador</Label>
                  <Input value={selectedClient.facturador || "Sin especificar"} disabled readOnly />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input value={selectedClient.category || "Sin especificar"} disabled readOnly />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Textarea value={selectedClient.address || ""} disabled readOnly />
              </div>
              <div>
                <Label>Sucursales ({getBranchesByClientFast(selectedClient.id).length})</Label>
                <div className="space-y-2 mt-2">
                  {getBranchesByClientFast(selectedClient.id).map((branch) => (
                    <div key={branch.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{branch.name}</span>
                          {branch.is_main && <Badge className="ml-2 bg-blue-100 text-blue-800">Principal</Badge>}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Dirección:</strong> {branch.address || "Sin dirección"}</div>
                        {branch.observations && (
                          <div><strong>Observaciones:</strong> {branch.observations}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditClientOpen} onOpenChange={(open) => {
        if (!open) setSelectedClient(null)
        setIsEditClientOpen(open)
      }}>
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
              <h4 className="text-lg font-semibold">Información del Cliente</h4>
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
                  <Label htmlFor="edit-nit">NIT</Label>
                  <Input
                    id="edit-nit"
                    value={clientNit}
                    onChange={(e) => setClientNit(e.target.value)}
                    placeholder="Número de Identificación Tributaria"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Persona de Contacto</Label>
                  <Input
                    id="edit-contact"
                    value={clientContactPerson}
                    onChange={(e) => setClientContactPerson(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input
                    id="edit-phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-facturador">Facturador</Label>
                  <Select value={clientFacturador} onValueChange={setClientFacturador}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar facturador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      <SelectItem value="LA FABRIKA CO">LA FABRIKA CO</SelectItem>
                      <SelectItem value="PASTRY CHEF">PASTRY CHEF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select value={clientCategory} onValueChange={setClientCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      <SelectItem value="CAFE">CAFE</SelectItem>
                      <SelectItem value="UNIVERSIDAD">UNIVERSIDAD</SelectItem>
                      <SelectItem value="CONVENIENCIA">CONVENIENCIA</SelectItem>
                      <SelectItem value="HOTEL">HOTEL</SelectItem>
                      <SelectItem value="COLEGIO">COLEGIO</SelectItem>
                      <SelectItem value="CATERING">CATERING</SelectItem>
                      <SelectItem value="SUPERMERCADO">SUPERMERCADO</SelectItem>
                      <SelectItem value="CLUB">CLUB</SelectItem>
                      <SelectItem value="RESTAURANTE">RESTAURANTE</SelectItem>
                      <SelectItem value="OTRO">OTRO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Branches Information */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">Sucursales</h4>
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
                      <AddressAutocomplete
                        value={branch.address}
                        coordinates={branch.latitude && branch.longitude ? { lat: branch.latitude, lng: branch.longitude } : null}
                        onChange={(address, coordinates) => {
                          updateEditBranchMultiple(index, {
                            address,
                            latitude: coordinates?.lat ?? null,
                            longitude: coordinates?.lng ?? null
                          })
                        }}
                        placeholder="Buscar dirección en Google Maps"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-branch-observations-${index}`}>Observaciones</Label>
                      <Textarea
                        id={`edit-branch-observations-${index}`}
                        value={branch.observations}
                        onChange={(e) => updateEditBranch(index, "observations", e.target.value)}
                        placeholder="Observaciones adicionales sobre la sucursal"
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
                  setSelectedClient(null)
                  setIsEditClientOpen(false)
                  setTimeout(() => resetForm(), 150)
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

            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-medium">Entrega en CEDI</Label>
                <p className="text-sm text-muted-foreground">
                  ¿Las entregas al cliente se realizan en su CEDI principal?
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">
                    {clientDeliversToMainBranch ? "Entrega en CEDI" : "Entrega en Sucursales"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {clientDeliversToMainBranch
                      ? "Todas las entregas se realizan en el CEDI principal"
                      : "Las entregas se realizan en cada sucursal"
                    }
                  </div>
                </div>
                <Switch
                  checked={clientDeliversToMainBranch}
                  onCheckedChange={setClientDeliversToMainBranch}
                />
              </div>

              {clientDeliversToMainBranch && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-blue-800">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Módulo de Visitas</p>
                      <p className="text-xs mt-1">
                        Al registrar visitas a sucursales, se mostrarán los productos vendidos al CEDI principal
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  )
}