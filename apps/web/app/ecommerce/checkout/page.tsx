'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEcommerceCart } from '@/hooks/use-ecommerce-cart'
import { useOrders } from '@/hooks/use-orders'

const formatPrice = (price: number) => {
  // Redondear para eliminar los .000 decimales
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(price))
}
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Trash2, Plus, Minus, ShoppingCart, CheckCircle2, ArrowLeft } from 'lucide-react'
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

  const cartItems = (cart.items || []).map(item => {
    const product = item.product
    const primaryPhoto = product?.product_media?.find((media: any) => media.is_primary)?.file_url ||
                        product?.product_media?.[0]?.file_url || null

    return {
      id: item.productId,
      name: product?.name || 'Producto',
      price: product?.price || 0,
      quantity: item.quantity,
      tax_rate: product?.tax_rate || 0,
      photo: primaryPhoto,
    }
  })

  // Calculate totals with VAT
  const calculations = cartItems.reduce((acc, item) => {
    const basePrice = item.price * item.quantity
    const taxRate = (item.tax_rate || 0) / 100
    const itemVAT = basePrice * taxRate

    return {
      subtotal: acc.subtotal + basePrice,
      vat: acc.vat + itemVAT,
    }
  }, { subtotal: 0, vat: 0 })

  const total = calculations.subtotal + calculations.vat
  const MIN_ORDER = 120000 // 120.000 pesos

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
      toast.error(`El pedido mínimo es de $120.000. Te faltan $${formatPrice(MIN_ORDER - total)}`)
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
        <ShoppingCart className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-gray-400 mx-auto mb-4 sm:mb-6" />
        <h1 className="text-2xl sm:text-3xl font-bold text-[#27282E] mb-3 sm:mb-4">Tu carrito está vacío</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Agrega productos desde nuestro catálogo</p>
        <Link href="/ecommerce/catalogo">
          <Button className="bg-[#27282E] text-white hover:bg-gray-800 font-semibold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg">
            Ir al Catálogo
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4 sm:py-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/ecommerce/catalogo">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="h-5 w-5 text-[#27282E]" />
            </button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#27282E]">Finalizar Pedido</h1>
        </div>
      </div>

      {/* Main Content - Responsive */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6 max-w-7xl mx-auto">
          {/* Left Side - Scrollable Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Form Card */}
            <Card className="shadow-lg rounded-xl lg:rounded-2xl">
              <CardHeader className="pb-3 sm:pb-4 bg-gray-50 border-b p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Información del Pedido</CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Branch Selection */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Sucursal de Entrega</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="h-9">
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

                  {/* Purchase Order Number */}
                  <div>
                    <Label htmlFor="po-number" className="text-sm font-semibold mb-2 block">N° Orden de Compra (Opcional)</Label>
                    <input
                      id="po-number"
                      type="text"
                      className="w-full px-3 py-2 h-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27282E]"
                      placeholder="PO-2024-001"
                      value={purchaseOrderNumber}
                      onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                    />
                  </div>

                  {/* Delivery Date - Full Width */}
                  <div className="lg:col-span-2">
                    <Label className="text-sm font-semibold mb-2 block">Fecha de Entrega</Label>
                    {suggestedDates.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {suggestedDates.slice(0, 6).map((date, index) => (
                          <Button
                            key={index}
                            type="button"
                            size="sm"
                            variant={deliveryDate?.toDateString() === date.toDateString() ? 'default' : 'outline'}
                            className={`text-xs justify-center h-9 ${
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

                  {/* Observations - Full Width */}
                  <div className="lg:col-span-2">
                    <Label htmlFor="observations" className="text-sm font-semibold mb-2 block">Observaciones (Opcional)</Label>
                    <Textarea
                      id="observations"
                      className="min-h-[50px] text-sm resize-none"
                      placeholder="Comentarios adicionales sobre el pedido..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products List Card - Desktop Only */}
            <Card className="shadow-lg rounded-xl lg:rounded-2xl hidden lg:block">
              <CardHeader className="pb-3 sm:pb-4 bg-gray-50 border-b p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  Tu Pedido ({cart.itemCount})
                </CardTitle>
              </CardHeader>

              {/* Cart Items */}
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-1">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg transition border-b last:border-b-0">
                      {/* Product Image - Smaller */}
                      {item.photo ? (
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0" />
                      )}

                      {/* Product Name - Truncated */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                      </div>

                      {/* Quantity Controls - Compact */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="p-1 hover:bg-gray-200 rounded border"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded border"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <p className="font-semibold text-sm text-gray-900 w-20 text-right flex-shrink-0">
                        ${formatPrice(item.price * item.quantity)}
                      </p>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600 transition flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cart Card - Mobile Only */}
            <Card className="shadow-lg rounded-xl lg:hidden">
              <CardHeader className="pb-3 bg-gray-50 border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Tu Pedido ({cart.itemCount})
                </CardTitle>
              </CardHeader>

              {/* Cart Items */}
              <CardContent className="p-4">
                <div className="space-y-3">
                  {cartItems.map(item => (
                    <div key={item.id} className="py-2 px-2 hover:bg-gray-50 rounded-lg transition border-b last:border-b-0">
                      {/* Row 1: Image + Name */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* Product Image */}
                        {item.photo ? (
                          <img
                            src={item.photo}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0" />
                        )}

                        {/* Product Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 line-clamp-2">{item.name}</p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Row 2: Quantity Controls + Price */}
                      <div className="flex items-center justify-between pl-14">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-1.5 hover:bg-gray-200 rounded border"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-gray-200 rounded border"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price */}
                        <p className="font-semibold text-base text-gray-900">
                          ${formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Mobile Footer with Totals */}
              <div className="border-t bg-white p-4">
                <div className="space-y-3">
                  {/* Continue Shopping */}
                  <Link href="/ecommerce/catalogo">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#27282E] text-[#27282E] hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Seguir Comprando
                    </Button>
                  </Link>

                  {/* Totals */}
                  <div className="bg-gray-50 -mx-2 px-3 py-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-gray-900">
                        ${formatPrice(calculations.subtotal)}
                      </span>
                    </div>
                    {calculations.vat > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">IVA (19%):</span>
                        <span className="font-semibold text-gray-900">
                          ${formatPrice(calculations.vat)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-base font-bold text-[#27282E]">Total:</span>
                      <span className="text-xl font-bold text-[#27282E]">
                        ${formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Side - Fixed Summary (Desktop Only) */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <Card className="shadow-lg rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  {/* Continue Shopping */}
                  <Link href="/ecommerce/catalogo">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#27282E] text-[#27282E] hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Seguir Comprando
                    </Button>
                  </Link>

                  {/* Totals Breakdown */}
                  <div className="bg-gray-50 -mx-3 px-4 py-4 rounded-lg space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-gray-900">
                        ${formatPrice(calculations.subtotal)}
                      </span>
                    </div>

                    {/* VAT */}
                    {calculations.vat > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">IVA (19%):</span>
                        <span className="font-semibold text-gray-900">
                          ${formatPrice(calculations.vat)}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-base font-bold text-[#27282E]">Total:</span>
                      <span className="text-2xl font-bold text-[#27282E]">
                        ${formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <Button
                    onClick={handleButtonClick}
                    disabled={isSubmitting}
                    className="w-full bg-[#27282E] text-white hover:bg-gray-800 font-bold py-5 text-base shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Procesando...
                      </>
                    ) : total < MIN_ORDER ? (
                      <>
                        Pedido mínimo $120.000
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Confirmar Pedido
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 lg:hidden z-50">
        <Button
          onClick={handleButtonClick}
          disabled={isSubmitting}
          className="w-full bg-[#27282E] text-white hover:bg-gray-800 font-bold py-4 text-base shadow-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : total < MIN_ORDER ? (
            <>
              Pedido mínimo $120.000
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Confirmar Pedido - ${formatPrice(total)}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
