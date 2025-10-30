'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Package,
  Eye,
  Edit,
  Loader2,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
  Truck,
  PackageCheck,
  ShoppingBag,
  X,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Order = Database['public']['Tables']['orders']['Row'] & {
  client: Database['public']['Tables']['clients']['Row']
  branch?: Database['public']['Tables']['branches']['Row']
  order_items: (Database['public']['Tables']['order_items']['Row'] & {
    product: Database['public']['Tables']['products']['Row']
  })[]
}

type OrderItem = {
  product_id: string
  quantity_requested: number
  unit_price: number
}

export default function PedidosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Edit form state
  const [editBranch, setEditBranch] = useState('')
  const [editDeliveryDate, setEditDeliveryDate] = useState<Date>()
  const [editPurchaseOrderNumber, setEditPurchaseOrderNumber] = useState('')
  const [editObservations, setEditObservations] = useState('')
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [frequencies, setFrequencies] = useState<any[]>([])
  const [suggestedDates, setSuggestedDates] = useState<Date[]>([])
  const [showDateMismatchWarning, setShowDateMismatchWarning] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ecommerce/login')
      return
    }

    if (user?.company_id) {
      fetchOrders()
      loadBranches()
      loadProducts()
      loadFrequencies()
    }
  }, [user?.company_id, authLoading])

  const loadBranches = async () => {
    if (!user?.company_id) {
      console.log('No company_id found for user:', user)
      return
    }

    console.log('Loading branches for company_id:', user.company_id)

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('client_id', user.company_id)
        .order('is_main', { ascending: false })

      if (error) {
        console.error('Error loading branches:', error)
        throw error
      }

      console.log('Branches loaded:', data)
      setBranches(data || [])
    } catch (err) {
      console.error('Error loading branches:', err)
      toast.error('Error al cargar las sucursales')
    }
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'PT')
        .eq('visible_in_ecommerce', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error loading products:', err)
    }
  }

  const loadFrequencies = async () => {
    try {
      const { data, error } = await supabase
        .from('client_frequencies')
        .select('*')
        .eq('is_active', true)

      if (error) throw error
      setFrequencies(data || [])
    } catch (err) {
      console.error('Error loading frequencies:', err)
    }
  }

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      if (!user?.company_id) return

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          branch:branches(*),
          order_items(
            *,
            product:products(*)
          )
        `)
        .eq('client_id', user.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      toast.error('Error al cargar las órdenes')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate suggested dates based on branch
  useEffect(() => {
    if (!editBranch || frequencies.length === 0) {
      setSuggestedDates([])
      return
    }

    const branchFrequencies = frequencies.filter(f => f.branch_id === editBranch)

    if (branchFrequencies.length === 0) {
      // Suggest next 3 business days
      const dates: Date[] = []
      const today = new Date()
      let daysAdded = 0
      let dayOffset = 1

      while (daysAdded < 3 && dayOffset < 15) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + dayOffset)
        const dayOfWeek = checkDate.getDay()

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(checkDate)
          daysAdded++
        }
        dayOffset++
      }

      setSuggestedDates(dates)
      return
    }

    // Calculate based on frequencies
    const frequencyDays = branchFrequencies.map(freq => freq.day_of_week)
    const dates: Date[] = []
    const today = new Date()

    for (let i = 1; i <= 30 && dates.length < 3; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      const checkDay = checkDate.getDay()

      if (frequencyDays.includes(checkDay)) {
        dates.push(checkDate)
      }
    }

    setSuggestedDates(dates)
  }, [editBranch, frequencies])

  // Check date mismatch
  useEffect(() => {
    if (!editDeliveryDate || !editBranch || frequencies.length === 0) {
      setShowDateMismatchWarning(false)
      return
    }

    const branchFrequencies = frequencies.filter(f => f.branch_id === editBranch)

    if (branchFrequencies.length === 0) {
      setShowDateMismatchWarning(false)
      return
    }

    const selectedDayOfWeek = editDeliveryDate.getDay()
    const frequencyDays = branchFrequencies.map(freq => freq.day_of_week)
    const isValidDay = frequencyDays.includes(selectedDayOfWeek)

    setShowDateMismatchWarning(!isValidDay)
  }, [editDeliveryDate, editBranch, frequencies])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      received: { label: 'Recibido', color: 'bg-blue-100 text-blue-800', icon: ShoppingBag },
      review_area1: { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      review_area2: { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      ready_dispatch: { label: 'Listo para Envío', color: 'bg-purple-100 text-purple-800', icon: Package },
      dispatched: { label: 'Despachado', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      in_delivery: { label: 'En Entrega', color: 'bg-orange-100 text-orange-800', icon: Truck },
      delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800', icon: PackageCheck },
      partially_delivered: { label: 'Entrega Parcial', color: 'bg-orange-100 text-orange-800', icon: Package },
      returned: { label: 'Devuelto', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Package }
    const Icon = config.icon

    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getStatusDescription = (status: string) => {
    const descriptions: Record<string, string> = {
      received: 'Tu pedido ha sido recibido y está siendo procesado.',
      review_area1: 'Tu pedido está en revisión por nuestro equipo.',
      review_area2: 'Tu pedido está en revisión final.',
      ready_dispatch: 'Tu pedido está listo y será despachado pronto.',
      dispatched: 'Tu pedido ha sido despachado.',
      in_delivery: 'Tu pedido está en camino.',
      delivered: 'Tu pedido ha sido entregado exitosamente.',
      partially_delivered: 'Tu pedido fue entregado parcialmente.',
      returned: 'Tu pedido fue devuelto.',
    }
    return descriptions[status] || 'Estado del pedido'
  }

  const canEditOrder = (order: Order) => {
    return !order.is_invoiced && order.status === 'received'
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const handleEditOrder = (order: Order) => {
    if (!canEditOrder(order)) {
      if (order.is_invoiced) {
        toast.error('No se puede editar. La orden ya ha sido facturada.')
      } else {
        toast.error('No se puede editar. La orden ya está en proceso.')
      }
      return
    }

    setSelectedOrder(order)
    setEditBranch(order.branch_id || '')
    setEditDeliveryDate(order.expected_delivery_date ? new Date(order.expected_delivery_date) : undefined)
    setEditPurchaseOrderNumber(order.purchase_order_number || '')
    setEditObservations(order.observations || '')
    setEditOrderItems(
      order.order_items.map(item => ({
        product_id: item.product.id,
        quantity_requested: item.quantity_requested,
        unit_price: item.unit_price,
      }))
    )
    setIsEditDialogOpen(true)
  }

  const updateEditOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...editOrderItems]
    if (field === 'product_id') {
      updated[index][field] = value as string
      const product = products.find(p => p.id === value)
      if (product && product.price) {
        updated[index].unit_price = product.price
      }
    } else {
      updated[index][field] = Number(value) || 0
    }
    setEditOrderItems(updated)
  }

  const addEditOrderItem = () => {
    setEditOrderItems([...editOrderItems, { product_id: '', quantity_requested: 1, unit_price: 0 }])
  }

  const removeEditOrderItem = (index: number) => {
    if (editOrderItems.length > 1) {
      setEditOrderItems(editOrderItems.filter((_, i) => i !== index))
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedOrder) return

    if (!editBranch || !editDeliveryDate) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    const validItems = editOrderItems.filter(
      item => item.product_id && item.quantity_requested > 0 && item.unit_price > 0
    )

    if (validItems.length === 0) {
      toast.error('Debes tener al menos un producto válido')
      return
    }

    setIsSubmitting(true)

    try {
      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          branch_id: editBranch,
          expected_delivery_date: format(editDeliveryDate, 'yyyy-MM-dd'),
          purchase_order_number: editPurchaseOrderNumber || null,
          observations: editObservations || null,
        })
        .eq('id', selectedOrder.id)

      if (orderError) throw orderError

      // Delete all existing items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', selectedOrder.id)

      if (deleteError) throw deleteError

      // Insert new items
      const newItems = validItems.map(item => ({
        order_id: selectedOrder.id,
        product_id: item.product_id,
        quantity_requested: item.quantity_requested,
        unit_price: item.unit_price,
        availability_status: 'pending' as const,
        quantity_available: 0,
        quantity_missing: item.quantity_requested,
        quantity_completed: 0,
        quantity_dispatched: 0,
        quantity_delivered: 0,
        quantity_returned: 0,
      }))

      const { error: insertError } = await supabase.from('order_items').insert(newItems)

      if (insertError) throw insertError

      // Recalculate total
      try {
        await supabase.rpc('calculate_order_total', { order_uuid: selectedOrder.id })
      } catch (rpcErr) {
        // Fallback manual calculation
        const total = validItems.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0)
        await supabase.from('orders').update({ total_value: total }).eq('id', selectedOrder.id)
      }

      toast.success('Orden actualizada exitosamente')
      setIsEditDialogOpen(false)
      fetchOrders()
    } catch (error: any) {
      console.error('Error updating order:', error)
      toast.error(error?.message || 'Error al actualizar la orden')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#27282E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#27282E] mb-2">Mis Órdenes</h1>
          <p className="text-gray-600">Historial y seguimiento de tus pedidos</p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Link href="/ecommerce">
            <Button variant="outline" className="font-semibold">
              ← Volver al inicio
            </Button>
          </Link>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#27282E] mx-auto mb-4" />
            <p className="text-gray-500">Cargando órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No tienes órdenes aún</p>
              <Link href="/ecommerce/catalogo">
                <Button className="bg-[#27282E] text-white hover:bg-gray-800 font-semibold">
                  Ir al catálogo
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg text-[#27282E]">
                          Orden #{order.order_number}
                        </h3>
                        {getStatusBadge(order.status || 'received')}
                        {order.is_invoiced && (
                          <Badge className="bg-gray-100 text-gray-800">Facturada</Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>{getStatusDescription(order.status || 'received')}</p>
                        <p>
                          <span className="font-medium">Fecha de pedido:</span>{' '}
                          {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                        <p>
                          <span className="font-medium">Fecha de entrega:</span>{' '}
                          {format(new Date(order.expected_delivery_date), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                        {order.branch && (
                          <p>
                            <span className="font-medium">Sucursal:</span> {order.branch.name}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Total:</span>{' '}
                          <span className="text-lg font-bold text-[#27282E]">
                            ${((order.total_value || 0) / 1000).toFixed(3)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                        className="font-semibold"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                      {canEditOrder(order) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                          className="font-semibold"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de la Orden #{selectedOrder?.order_number}</DialogTitle>
              <DialogDescription>
                Información completa de tu pedido
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <Label className="text-sm text-gray-600">Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status || 'received')}</div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Fecha de Pedido</Label>
                    <p className="font-medium">
                      {format(new Date(selectedOrder.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Fecha de Entrega</Label>
                    <p className="font-medium">
                      {format(new Date(selectedOrder.expected_delivery_date), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                {/* Branch */}
                {selectedOrder.branch && (
                  <div>
                    <Label className="text-sm text-gray-600">Sucursal</Label>
                    <p className="font-medium">{selectedOrder.branch.name}</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Productos</Label>
                  <div className="border rounded-lg divide-y">
                    {selectedOrder.order_items.map((item, index) => (
                      <div key={index} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-gray-600">
                            Cantidad: {item.quantity_requested}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${((item.unit_price / 1000) * item.quantity_requested).toFixed(3)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t-2">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-[#27282E]">
                    ${((selectedOrder.total_value || 0) / 1000).toFixed(3)}
                  </span>
                </div>

                {/* Observations */}
                {selectedOrder.observations && (
                  <div>
                    <Label className="text-sm text-gray-600">Observaciones</Label>
                    <p className="mt-1">{selectedOrder.observations}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Orden #{selectedOrder?.order_number}</DialogTitle>
              <DialogDescription>
                Modifica los detalles de tu pedido
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Branch */}
              <div>
                <Label>Sucursal</Label>
                <Select value={editBranch} onValueChange={setEditBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} {branch.is_main && '(Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Date */}
              <div>
                <Label>Fecha de Entrega</Label>
                {suggestedDates.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-600">Fechas sugeridas:</p>
                    <div className="grid gap-2">
                      {suggestedDates.map((date, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={editDeliveryDate?.toDateString() === date.toDateString() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditDeliveryDate(date)}
                          className="justify-start"
                        >
                          {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-2">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDeliveryDate ? format(editDeliveryDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDeliveryDate}
                      onSelect={setEditDeliveryDate}
                      disabled={(date) => date < new Date()}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                {showDateMismatchWarning && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Esta fecha no coincide con tu frecuencia habitual
                  </p>
                )}
              </div>

              {/* Items */}
              <div>
                <Label>Productos</Label>
                <div className="space-y-3 mt-2">
                  {editOrderItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Select
                          value={item.product_id}
                          onValueChange={(value) => updateEditOrderItem(index, 'product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Cantidad"
                            value={item.quantity_requested}
                            onChange={(e) => updateEditOrderItem(index, 'quantity_requested', e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md"
                            min="1"
                          />
                          <input
                            type="number"
                            placeholder="Precio"
                            value={item.unit_price}
                            onChange={(e) => updateEditOrderItem(index, 'unit_price', e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md"
                            min="0"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEditOrderItem(index)}
                        disabled={editOrderItems.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addEditOrderItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              </div>

              {/* PO Number */}
              <div>
                <Label>Número de Orden de Compra (Opcional)</Label>
                <input
                  type="text"
                  value={editPurchaseOrderNumber}
                  onChange={(e) => setEditPurchaseOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  placeholder="Ej: PO-2024-001"
                />
              </div>

              {/* Observations */}
              <div>
                <Label>Observaciones (Opcional)</Label>
                <Textarea
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  className="mt-1"
                  placeholder="Comentarios adicionales..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#27282E] text-white hover:bg-gray-800"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
