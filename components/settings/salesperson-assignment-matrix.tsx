"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, UserCircle, Edit } from "lucide-react"
import { useSalespeople } from "@/hooks/use-salespeople"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface SalespersonAssignmentMatrixProps {
  clients: any[]
  loading: boolean
}

export function SalespersonAssignmentMatrix({ clients, loading }: SalespersonAssignmentMatrixProps) {
  const { salespeople, loading: loadingSalespeople, refetch } = useSalespeople()
  const { toast } = useToast()
  const [updatingClients, setUpdatingClients] = useState<Set<string>>(new Set())
  const [clientAssignments, setClientAssignments] = useState<Record<string, string | null>>({})
  const [editingCedulaFor, setEditingCedulaFor] = useState<string | null>(null)
  const [cedulaValue, setCedulaValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sincronizar asignaciones con los datos de clientes
  useEffect(() => {
    if (clients.length > 0) {
      const assignments: Record<string, string | null> = {}
      clients.forEach(client => {
        assignments[client.id] = client.assigned_user_id || null
      })
      setClientAssignments(assignments)
    }
  }, [clients])

  const handleAssignmentChange = async (clientId: string, salespersonId: string | null) => {
    setUpdatingClients(prev => new Set(prev).add(clientId))

    try {
      // Optimistic update
      setClientAssignments(prev => ({
        ...prev,
        [clientId]: salespersonId
      }))

      // Update in database
      const { error } = await supabase
        .from("clients")
        .update({ assigned_user_id: salespersonId })
        .eq("id", clientId)

      if (error) throw error

      const salespersonName = salespersonId
        ? salespeople.find(s => s.id === salespersonId)?.name || "vendedor"
        : "ninguno"

      toast({
        title: "Éxito",
        description: `Vendedor asignado: ${salespersonName}`,
      })
    } catch (error: any) {
      // Revert on error
      const originalAssignment = clients.find(c => c.id === clientId)?.assigned_user_id || null
      setClientAssignments(prev => ({
        ...prev,
        [clientId]: originalAssignment
      }))

      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la asignación",
        variant: "destructive",
      })
    } finally {
      setUpdatingClients(prev => {
        const newSet = new Set(prev)
        newSet.delete(clientId)
        return newSet
      })
    }
  }

  const handleCheckboxChange = (clientId: string, salespersonId: string, isChecked: boolean) => {
    if (isChecked) {
      // Asignar vendedor
      handleAssignmentChange(clientId, salespersonId)
    } else {
      // Desasignar vendedor
      handleAssignmentChange(clientId, null)
    }
  }

  const handleEditCedula = (salesperson: any) => {
    setEditingCedulaFor(salesperson.id)
    setCedulaValue(salesperson.cedula || "")
  }

  const handleSaveCedula = async () => {
    if (!editingCedulaFor) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({ cedula: cedulaValue.trim() || null })
        .eq("id", editingCedulaFor)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Cédula actualizada correctamente",
      })

      // Refrescar lista de vendedores
      await refetch()
      setEditingCedulaFor(null)
      setCedulaValue("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la cédula",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || loadingSalespeople) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando información...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (salespeople.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay vendedores</h3>
            <p className="text-gray-600">Crea usuarios con rol "comercial" para asignarlos a clientes.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <UserCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
            <p className="text-gray-600">Crea clientes primero para asignar vendedores.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asignación de Vendedores a Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-white z-10">Cliente</TableHead>
                {salespeople.map((salesperson) => {
                  // Remover dominios de email del nombre si existen
                  const displayName = salesperson.name
                    .replace(/@pastrychef\.com\.co/i, '')
                    .replace(/@pastry\.com/i, '')
                    .trim()
                  return (
                    <TableHead key={salesperson.id} className="text-center min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <UserCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">{displayName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCedula(salesperson)}
                          className="h-6 px-2 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {salesperson.cedula ? `CC: ${salesperson.cedula}` : "Agregar CC"}
                        </Button>
                      </div>
                    </TableHead>
                  )
                })}
                <TableHead className="text-center min-w-[100px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const currentAssignment = clientAssignments[client.id]
                const isUpdating = updatingClients.has(client.id)

                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium sticky left-0 bg-white z-10">
                      {client.name}
                    </TableCell>
                    {salespeople.map((salesperson) => (
                      <TableCell key={salesperson.id} className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={currentAssignment === salesperson.id}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(client.id, salesperson.id, checked as boolean)
                            }
                            disabled={isUpdating}
                            className="h-5 w-5"
                          />
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : currentAssignment ? (
                        <div className="text-xs text-green-600 font-medium">
                          ✓ Asignado
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          Sin asignar
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog para editar cédula */}
      <Dialog open={editingCedulaFor !== null} onOpenChange={(open) => !open && setEditingCedulaFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cédula del Vendedor</DialogTitle>
            <DialogDescription>
              {editingCedulaFor && (
                <>
                  Vendedor: {salespeople.find(s => s.id === editingCedulaFor)?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cedula">Número de Cédula</Label>
              <Input
                id="cedula"
                placeholder="Ej: 1234567890"
                value={cedulaValue}
                onChange={(e) => setCedulaValue(e.target.value)}
                maxLength={20}
              />
              <p className="text-xs text-gray-500">
                Este número se usará en las exportaciones de World Office
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCedulaFor(null)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCedula} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
