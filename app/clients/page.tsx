"use client"

import { useState } from "react"

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)

  const clients = [
    {
      id: "client-1",
      name: "Supermercado Central",
      contactPerson: "Juan Pérez",
      phone: "+57 300 123 4567",
      email: "compras@supercentral.com",
      address: "Calle 123 #45-67, Bogotá",
      type: "Supermercado",
      status: "active",
      registrationDate: "2024-01-15",
      totalOrders: 45,
      totalValue: 12500000,
      lastOrder: "2025-07-15",
      averageOrderValue: 278000,
      paymentTerms: "30 días",
      creditLimit: 5000000,
      notes: "Cliente preferencial, entregas matutinas",
    },
    {
      id: "client-2",
      name: "Panadería El Trigo",
      contactPerson: "Carmen Silva",
      phone: "+57 301 234 5678",
      email: "gerencia@eltrigo.com",
      address: "Carrera 78 #12-34, Medellín",
      type: "Panadería",
      status: "active",
      registrationDate: "2024-03-20",
      totalOrders: 32,
      totalValue: 8900000,
      lastOrder: "2025-07-14",
      averageOrderValue: 278125,
      paymentTerms: "15 días",
      creditLimit: 3000000,
      notes: "Requiere productos frescos, entregas diarias",
    },
    {
      id: "client-3",
      name: "Distribuidora Norte",
      contactPerson: "Roberto Gómez",
      phone: "+57 302 345 6789",
      email: "pedidos@distnorte.com",
      address: "Avenida 45 #23-56, Cali",
      type: "Distribuidor",
      status: "active",
      registrationDate: "2023-11-10",
      totalOrders: 78,
      totalValue: 25600000,
      lastOrder: "2025-07-16",
      averageOrderValue: 328205,
      paymentTerms: "45 días",
      creditLimit: 8000000,
      notes: "Pedidos grandes, flexible en horarios",
    },
    {
      id: "client-4",
      name: "Café & Pan",
      contactPerson: "Sofía Herrera",
      phone: "+57 303 456 7890",
      email: "sofia@cafepan.com",
      address: "Calle 67 #89-12, Barranquilla",
      type: "Cafetería",
      status: "inactive",
      registrationDate: "2024-06-05",
      totalOrders: 12,
      totalValue: 2100000,
      lastOrder: "2025-06-20",
      averageOrderValue: 175000,
      paymentTerms: "Contado",
      creditLimit: 1000000,
      notes: "Cliente estacional, temporalmente inactivo",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Activo", color: "bg-green-100 text-green-800" },
      inactive: { label: "Inactivo", color: "bg-red-100 text-red-800" },
      suspended: { label: "Suspendido", color: "bg-yellow-100 text-yellow-800" },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.active
  }

  const getClient = (clientId: string) => {
    return clients.find((client) => client.id === clientId) || null
  }

  // ** rest of code here **
}
