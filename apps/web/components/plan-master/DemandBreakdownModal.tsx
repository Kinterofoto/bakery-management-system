"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export interface DemandItem {
  orderNumber: string
  clientName: string
  deliveryDate: string
  quantity: number
}

interface DemandBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
}

export function DemandBreakdownModal({
  isOpen,
  onClose,
  productId,
  productName
}: DemandBreakdownModalProps) {
  const [demands, setDemands] = useState<DemandItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && productId) {
      fetchDemands()
    }
  }, [isOpen, productId])

  const fetchDemands = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get all order items for this product
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select("id, quantity_requested, quantity_delivered, order_id")
        .eq("product_id", productId)
        .not("order_id", "is", null)

      if (orderError) throw orderError

      // Get order details separately
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, client_id, created_at")
        .not("client_id", "is", null)

      if (ordersError) throw ordersError

      // Get client details
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")

      if (clientsError) throw clientsError

      // Create lookup maps for fast access
      const orderMap = new Map(orders?.map(o => [o.id, o]) || [])
      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || [])

      // Filter and map the data
      const demandList: DemandItem[] = []
      let totalQuantity = 0

      if (orderItems) {
        orderItems.forEach((item: any) => {
          const pending = (item.quantity_requested || 0) - (item.quantity_delivered || 0)

          // Only include items with pending quantity
          if (pending > 0) {
            const order = orderMap.get(item.order_id)
            if (order) {
              const clientName = clientMap.get(order.client_id) || "Sin nombre"
              demandList.push({
                orderNumber: order.order_number || "N/A",
                clientName: clientName,
                deliveryDate: order.created_at
                  ? format(new Date(order.created_at), "dd/MM/yyyy", { locale: es })
                  : "Sin fecha",
                quantity: pending
              })
              totalQuantity += pending
            }
          }
        })
      }

      // Sort by delivery date
      demandList.sort((a, b) => {
        const dateA = a.deliveryDate.split("/").reverse().join("-")
        const dateB = b.deliveryDate.split("/").reverse().join("-")
        return dateA.localeCompare(dateB)
      })

      // Add total row at the end
      if (demandList.length > 0) {
        demandList.push({
          orderNumber: "TOTAL",
          clientName: "",
          deliveryDate: "",
          quantity: totalQuantity
        })
      }

      setDemands(demandList)
    } catch (err) {
      console.error("Error fetching demand breakdown:", err)
      setError(err instanceof Error ? err.message : "Error fetching data")
    } finally {
      setLoading(false)
    }
  }

  const getTotalQuantity = () => {
    return demands.reduce((sum, item) => sum + item.quantity, 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-black border border-[#1C1C1E] [&>button]:text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Desglose de Demanda - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <p className="text-[#8E8E93]">Cargando...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center py-8">
              <p className="text-[#FF453A]">{error}</p>
            </div>
          ) : demands.length === 0 ? (
            <div className="flex justify-center py-8">
              <p className="text-[#8E8E93]">Sin demanda pendiente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    <th className="text-left px-4 py-3 text-[#8E8E93] font-medium">Pedido</th>
                    <th className="text-left px-4 py-3 text-[#8E8E93] font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 text-[#8E8E93] font-medium">Fecha Entrega</th>
                    <th className="text-right px-4 py-3 text-[#8E8E93] font-medium">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map((item, index) => (
                    <tr
                      key={index}
                      className={`border-b border-[#1C1C1E] ${
                        item.orderNumber === "TOTAL"
                          ? "bg-[#1C1C1E] font-semibold"
                          : "hover:bg-[#1C1C1E]/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-white">
                        {item.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-[#8E8E93]">
                        {item.clientName}
                      </td>
                      <td className="px-4 py-3 text-[#8E8E93]">
                        {item.deliveryDate}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        item.orderNumber === "TOTAL"
                          ? "text-[#30D158]"
                          : "text-white"
                      }`}>
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
