'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { useOrders } from '@/hooks/use-orders'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Trash2, Plus, Minus, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { cart, clearCart, updateQuantity, removeFromCart } = useEcommerceCart()
  const { createOrder } = useOrders()

  const [selectedBranch, setSelectedBranch] = useState('')
  const [deliveryDate, setDeliveryDate] = useState<Date>()
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')
  const [observations, setObservations] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<any[]>([])
  const [frequencies, setFrequencies] = useState<any[]>([])
  const [suggestedDates, setSuggestedDates] = useState<Date[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ecommerce/login')
    }
  }, [user, authLoading, router])

  // Load branches when user is available
  useEffect(() => {
    if (user?.company_id) {
      loadBranches()
      loadFrequencies()
    }
  }, [user?.company_id])

  const loadBranches = async () => {
    if (!user?.company_id) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('client_id', user.company_id)
        .order('is_main', { ascending: false })

      if (error) throw error

      setBranches(data || [])

      // Auto-select main branch
      const mainBranch = data?.find(b => b.is_main)
      if (mainBranch) {
        setSelectedBranch(mainBranch.id)
      }
    } catch (err) {
      console.error('Error loading branches:', err)
      toast.error('Error al cargar las sucursales')
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

  // Calculate suggested delivery dates
  useEffect(() => {
    if (!selectedBranch || frequencies.length === 0) {
      setSuggestedDates([])
      return
    }

    const branchFrequencies = frequencies.filter(f => f.branch_id === selectedBranch)

    if (branchFrequencies.length === 0) {
      const dates: Date[] = []
      const today = new Date()
      let daysAdded = 0
      let dayOffset = 1

      while (daysAdded < 7 && dayOffset < 30) {
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

    const frequencyDays = branchFrequencies.map(freq => freq.day_of_week)
    const dates: Date[] = []
    const today = new Date()

    for (let i = 1; i <= 60 && dates.length < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      const checkDay = checkDate.getDay()

      if (frequencyDays.includes(checkDay)) {
        dates.push(checkDate)
      }
    }

    setSuggestedDates(dates)
  }, [selectedBranch, frequencies])

  const cartItems = (cart.items || []).map(item => ({
    id: item.productId,
    name: item.product?.name || 'Producto',
    price: item.product?.price || 0,
    quantity: item.quantity,
    tax_rate: item.product?.tax_rate || 0,
  }))

  // Calculate totals with VAT
  const calculations = cartItems.reduce((acc, item) => {
    const basePrice = (item.price / 1000) * item.quantity
    const taxRate = (item.tax_rate || 0) / 100
    const itemVAT = basePrice * taxRate

    return {
      subtotal: acc.subtotal + basePrice,
      vat: acc.vat + itemVAT,
    }
  }, { subtotal: 0, vat: 0 })

  const total = calculations.subtotal + calculations.vat
  const MIN_ORDER = 120 // 120.000 pesos (ya dividido por 1000)

  const handleButtonClick = () => {
    // Check what's missing and show subtle toast
    if (!selectedBranch) {
      toast.error('Selecciona una sucursal de entrega', { duration: 2000 })
      return
    }
    if (!deliveryDate) {
      toast.error('Selecciona una fecha de entrega', { duration: 2000 })
      return
    }
    if (total < MIN_ORDER) {
      toast.error(`El pedido mínimo es $120.000`, { duration: 2000 })
      return
    }
    // If everything is ok, proceed with checkout
    handleCheckout()
  }

  const handleCheckout = async () => {
    if (!selectedBranch) {
      toast.error('Por favor selecciona una sucursal')
      return
    }

    if (!deliveryDate) {
      toast.error('Por favor selecciona una fecha de entrega')
      return
    }

    if (cartItems.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    if (total < MIN_ORDER) {
      toast.error(`El pedido mínimo es de $120.000. Te faltan $${(MIN_ORDER - total).toFixed(3)}`)
      return
    }

    setIsSubmitting(true)

    try {
      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        quantity_requested: item.quantity,
        unit_price: item.price,
      }))

      await createOrder({
        client_id: user!.company_id!,
        branch_id: selectedBranch,
        expected_delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
        purchase_order_number: purchaseOrderNumber || undefined,
        observations: observations || undefined,
        subtotal: calculations.subtotal,
        vat_amount: calculations.vat,
        items: orderItems,
      })

      toast.success('¡Pedido creado exitosamente!')
      clearCart()
      router.push('/ecommerce/pedidos')
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error(error?.message || 'Error al crear el pedido. Por favor intenta de nuevo.')
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

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShoppingCart className="h-24 w-24 text-gray-400 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-[#27282E] mb-4">Tu carrito está vacío</h1>
        <p className="text-gray-600 mb-8">Agrega productos desde nuestro catálogo</p>
        <Link href="/ecommerce/catalogo">
          <Button className="bg-[#27282E] text-white hover:bg-gray-800 font-semibold px-8 py-6 text-lg">
            Ir al Catálogo
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-[#27282E]">Finalizar Pedido</h1>
      </div>

      {/* Main Content - Fixed Height */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full grid lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="flex flex-col h-full">
            <Card className="shadow-lg flex flex-col h-full rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 bg-gray-50 border-b flex-shrink-0 p-6">
                <CardTitle className="text-lg">Información del Pedido</CardTitle>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Branch Selection */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Sucursal de Entrega</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="h-10">
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
                  <Label className="text-sm font-semibold mb-2 block">Fecha de Entrega</Label>
                  {suggestedDates.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {suggestedDates.slice(0, 6).map((date, index) => (
                        <Button
                          key={index}
                          type="button"
                          size="sm"
                          variant={deliveryDate?.toDateString() === date.toDateString() ? 'default' : 'outline'}
                          className={`text-xs justify-start ${
                            deliveryDate?.toDateString() === date.toDateString() ? 'bg-[#27282E] text-white' : ''
                          }`}
                          onClick={() => setDeliveryDate(date)}
                        >
                          {format(date, "dd MMM", { locale: es })}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div>
                  <Label htmlFor="po-number" className="text-sm">N° Orden de Compra (Opcional)</Label>
                  <input
                    id="po-number"
                    type="text"
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27282E]"
                    placeholder="PO-2024-001"
                    value={purchaseOrderNumber}
                    onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="observations" className="text-sm">Observaciones (Opcional)</Label>
                  <Textarea
                    id="observations"
                    className="mt-1 min-h-[60px] text-sm resize-none"
                    placeholder="Comentarios..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Cart */}
          <div className="flex flex-col h-full">
            <Card className="shadow-lg flex flex-col h-full rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 bg-gray-50 border-b flex-shrink-0 p-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Tu Pedido ({cart.itemCount})
                </CardTitle>
              </CardHeader>

              {/* Scrollable Cart Items */}
              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {cartItems.map(item => (
                    <div key={item.id} className="p-2 border rounded-xl bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            ${((item.price / 1000)).toFixed(3)} c/u
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600 transition flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-1 hover:bg-gray-200 rounded border text-xs"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded border"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="font-semibold text-sm text-gray-900">
                          ${((item.price / 1000) * item.quantity).toFixed(3)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Footer - Fixed at bottom */}
              <div className="border-t bg-white p-6 flex-shrink-0 space-y-2">
                {/* Continue Shopping */}
                <Link href="/ecommerce/catalogo">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-[#27282E] text-[#27282E] hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Seguir Comprando
                  </Button>
                </Link>

                {/* Totals Breakdown */}
                <div className="bg-gray-50 -mx-3 px-3 py-3 rounded-lg space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      ${calculations.subtotal.toFixed(3)}
                    </span>
                  </div>

                  {/* VAT */}
                  {calculations.vat > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">IVA (19%):</span>
                      <span className="font-semibold text-gray-900">
                        ${calculations.vat.toFixed(3)}
                      </span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-base font-bold text-[#27282E]">Total:</span>
                    <span className="text-2xl font-bold text-[#27282E]">
                      ${total.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Confirm Button */}
                <Button
                  onClick={handleButtonClick}
                  disabled={isSubmitting}
                  className="w-full bg-[#27282E] text-white hover:bg-gray-800 font-bold py-5 shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : total < MIN_ORDER ? (
                    <>
                      Pedido mínimo $120.000
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirmar Pedido
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
