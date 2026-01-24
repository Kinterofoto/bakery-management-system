"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RouteGuard } from "@/components/auth/RouteGuard"
import {
  TrendingUp,
  Plus,
  Search,
  ArrowLeft,
  Package
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMaterialTransfers } from "@/hooks/use-material-transfers"
import { useTransferNotifications } from "@/hooks/use-transfer-notifications"
import { CreateTransferDialog } from "@/components/compras/CreateTransferDialog"
import { PendingReturnsView } from "@/components/compras/PendingReturnsView"
import { PendingDeliveriesView } from "@/components/compras/PendingDeliveriesView"
import { TransferStatusBadge } from "@/components/compras/TransferStatusBadge"

type TabType = "send" | "history" | "returns" | "pending_deliveries"

export default function TransfersPage() {
  const router = useRouter()
  const { transfers, loading } = useMaterialTransfers()
  const { pendingReturnsCount, refreshCounts } = useTransferNotifications()

  const [activeTab, setActiveTab] = useState<TabType>("send")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const filteredTransfers = transfers.filter(t => {
    if (searchQuery.trim()) {
      return t.transfer_number.includes(searchQuery.toUpperCase()) ||
        t.work_center?.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const handleTransferCreated = () => {
    setShowCreateDialog(false)
    refreshCounts()
  }

  if (loading) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">Cargando traslados...</p>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="
                  p-2
                  hover:bg-white/50 dark:hover:bg-black/30
                  rounded-lg
                  transition-colors
                  backdrop-blur-md
                "
              >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                  Traslados de Materias Primas
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Gestiona traslados de materiales desde inventario central a centros de trabajo
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowCreateDialog(true)}
              className="
                bg-blue-600
                text-white
                font-semibold
                px-6
                py-3
                rounded-xl
                shadow-md shadow-blue-600/30
                hover:bg-blue-700
                hover:shadow-lg hover:shadow-blue-600/40
                active:scale-95
                transition-all duration-150
                flex items-center gap-2
              "
            >
              <Plus className="w-4 h-4" />
              Nuevo Traslado
            </Button>
          </div>

          {showCreateDialog && (
            <CreateTransferDialog
              onClose={() => {
                setShowCreateDialog(false)
                handleTransferCreated()
              }}
            />
          )}

          {/* Tabs */}
          <div className="
            bg-white/70 dark:bg-black/50
            backdrop-blur-xl
            border border-white/20 dark:border-white/10
            rounded-2xl
            p-2
            flex flex-wrap gap-2
          ">
            <button
              onClick={() => setActiveTab("send")}
              className={`
                px-4 py-2 rounded-lg font-semibold transition-all
                ${activeTab === "send"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-black/20"
                }
              `}
            >
              Enviar Traslado
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`
                px-4 py-2 rounded-lg font-semibold transition-all
                ${activeTab === "history"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-black/20"
                }
              `}
            >
              Historial
            </button>
            <button
              onClick={() => setActiveTab("returns")}
              className={`
                px-4 py-2 rounded-lg font-semibold transition-all
                flex items-center gap-2
                ${activeTab === "returns"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-black/20"
                }
              `}
            >
              Devoluciones Pendientes
              {pendingReturnsCount > 0 && (
                <span className="
                  inline-flex items-center justify-center
                  w-6 h-6 rounded-full
                  bg-red-500 text-white text-xs font-bold
                  animate-pulse
                ">
                  {pendingReturnsCount > 99 ? "99+" : pendingReturnsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pending_deliveries")}
              className={`
                px-4 py-2 rounded-lg font-semibold transition-all
                ${activeTab === "pending_deliveries"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-black/20"
                }
              `}
            >
              Entregas Pendientes
            </button>
          </div>

          {/* Content */}
          {activeTab === "send" && (
            <div className="
              bg-white/70 dark:bg-black/50
              backdrop-blur-xl
              border border-white/20 dark:border-white/10
              rounded-2xl
              p-6
              text-center
              space-y-4
            ">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Crear un nuevo traslado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Haz clic en el botón "Nuevo Traslado" arriba para crear un traslado de materias primas hacia un centro de trabajo.
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="
                  bg-blue-600
                  text-white
                  font-semibold
                  px-6
                  py-3
                  rounded-xl
                  shadow-md shadow-blue-600/30
                  hover:bg-blue-700
                  hover:shadow-lg hover:shadow-blue-600/40
                  active:scale-95
                  transition-all duration-150
                  mt-4
                "
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Traslado
              </Button>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="
                bg-white/70 dark:bg-black/50
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                rounded-2xl
                p-4
                flex items-center gap-3
              ">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Buscar por número de traslado o centro de trabajo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                    bg-transparent
                    border-0
                    focus:outline-none
                    placeholder:text-gray-400
                    dark:placeholder:text-gray-500
                    text-gray-900 dark:text-white
                  "
                />
              </div>

              {filteredTransfers.length === 0 ? (
                <div className="
                  bg-white/70 dark:bg-black/50
                  backdrop-blur-xl
                  border border-white/20 dark:border-white/10
                  rounded-2xl
                  p-8
                  text-center
                ">
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchQuery ? "No se encontraron traslados con esa búsqueda" : "No hay traslados aún"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="
                        bg-white/70 dark:bg-black/50
                        backdrop-blur-xl
                        border border-white/20 dark:border-white/10
                        rounded-2xl
                        p-4
                        hover:bg-white/80 dark:hover:bg-black/60
                        transition-all duration-200
                      "
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="font-semibold text-gray-900 dark:text-white text-lg">
                              {transfer.transfer_number}
                            </p>
                            <TransferStatusBadge status={transfer.status} />
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Centro: {transfer.work_center?.name || 'Desconocido'} ({transfer.work_center?.code})
                          </p>

                          {transfer.items && transfer.items.length > 0 && (
                            <div className="
                              bg-white/30 dark:bg-black/20
                              rounded-lg p-3 space-y-1 mb-3
                            ">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                {transfer.items.length} material(es):
                              </p>
                              <div className="space-y-1">
                                {transfer.items.map((item, idx) => (
                                  <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                                    • {item.material_name}: {item.quantity_requested} {item.unit_of_measure}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            Solicitado: {new Date(transfer.requested_at).toLocaleDateString('es-CO')}
                            {transfer.received_at && ` • Recibido: ${new Date(transfer.received_at).toLocaleDateString('es-CO')}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "returns" && (
            <PendingReturnsView />
          )}

          {activeTab === "pending_deliveries" && (
            <PendingDeliveriesView />
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
