"use client"

import { useState } from "react"
import { Package, CheckCircle, Clock, TrendingUp, Calendar, ArrowRight, AlertTriangle, ArrowLeft } from "lucide-react"
import { VideoTutorialButton } from "@/components/shared/VideoTutorialButton"
import { useFinishedGoodsReception, type PendingProduction } from "@/hooks/use-finished-goods-reception"
import { ReceptionModal } from "@/components/recepcion-pt/ReceptionModal"
import { BatchReceptionModal } from "@/components/recepcion-pt/BatchReceptionModal"
import { toast } from "sonner"
import Link from "next/link"

export default function RecepcionPTPage() {
  const {
    pendingProductions,
    receptionHistory,
    stats,
    loading,
    approveReception,
    approveBatchReceptions,
    rejectReception,
    refetch
  } = useFinishedGoodsReception()

  const [selectedProduction, setSelectedProduction] = useState<PendingProduction | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")

  const handleOpenModal = (production: PendingProduction) => {
    setSelectedProduction(production)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setSelectedProduction(null)
    setShowModal(false)
  }

  const handleToggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleToggleAll = () => {
    if (selectedIds.size === pendingProductions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingProductions.map(p => p.id)))
    }
  }

  const handleBatchReceive = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos una producción")
      return
    }

    setShowBatchModal(true)
  }

  const handleBatchSuccess = () => {
    setSelectedIds(new Set())
    setShowBatchModal(false)
    refetch()
  }

  const selectedProductionsForBatch = pendingProductions.filter(p => selectedIds.has(p.id))

  if (loading && pendingProductions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header - Not Sticky */}
      <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Back Arrow */}
            <Link
              href="/dashboard"
              className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-white" />
            </Link>
            <div>
              <h1 className="text-xl md:text-3xl font-semibold text-gray-900 dark:text-white">
                Recepción de Producto Terminado
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Recibe productos finalizados de producción al inventario
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <VideoTutorialButton modulePath="/recepcion-pt" />
            <div className="bg-teal-500/15 backdrop-blur-sm rounded-xl p-2 md:p-3">
              <Package className="w-5 h-5 md:w-8 md:h-8 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={`
              flex-1 md:flex-none
              px-6 py-3
              rounded-xl
              font-semibold
              transition-all duration-200
              ${activeTab === "pending"
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/30"
                : "bg-white/50 dark:bg-black/30 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-black/40"
              }
            `}
          >
            <Clock className="w-4 h-4 inline-block mr-2" />
            Por Recibir
            {stats.pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {stats.pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`
              flex-1 md:flex-none
              px-6 py-3
              rounded-xl
              font-semibold
              transition-all duration-200
              ${activeTab === "history"
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/30"
                : "bg-white/50 dark:bg-black/30 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-black/40"
              }
            `}
          >
            <CheckCircle className="w-4 h-4 inline-block mr-2" />
            Historial
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Pending Receptions Count */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-black/5">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/15 rounded-xl p-2">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Pendientes Recepción
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingCount}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Units */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-black/5">
            <div className="flex items-center gap-3">
              <div className="bg-teal-500/15 rounded-xl p-2">
                <Package className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Unidades Pendientes
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingValue.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Receptions */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-black/5">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/15 rounded-xl p-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Recibidos Hoy
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.todayReceived}
                </p>
              </div>
            </div>
          </div>

          {/* Week Receptions */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-black/5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/15 rounded-xl p-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Recibidos Semana
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.weekReceived}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Tab Content */}
        {activeTab === "pending" && (
          <>
            {/* Pending Productions Table */}
            <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-white/10">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Producciones Pendientes de Recepción
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Productos terminados listos para recibir en inventario
            </p>
          </div>

          {/* Batch Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 bg-teal-500/15 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedIds.size} producción{selectedIds.size > 1 ? "es" : ""} seleccionada{selectedIds.size > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/30 rounded-xl hover:bg-white/70 dark:hover:bg-black/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBatchReceive}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-xl hover:bg-teal-600 shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40 transition-all"
                >
                  Recibir Seleccionadas
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {pendingProductions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-4 mb-4">
                  <CheckCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  No hay producciones pendientes de recepción
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 text-center mt-2">
                  Todas las producciones completadas han sido recibidas
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-white/5">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === pendingProductions.length && pendingProductions.length > 0}
                        onChange={handleToggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Peso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Centro
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {pendingProductions.map((production) => (
                    <tr
                      key={production.id}
                      className={`hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150 ${
                        selectedIds.has(production.id) ? "bg-teal-50/50 dark:bg-teal-900/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(production.id)}
                          onChange={() => handleToggleSelection(production.id)}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(production.ended_at || production.started_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {production.product_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {production.product_code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {production.product_weight || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="bg-teal-500/15 backdrop-blur-sm rounded-lg px-2 py-1 inline-block">
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                            {production.work_center_code}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {production.unit_type === "good" ? (
                          <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Buena
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Defectuosa
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                        production.unit_type === "good"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {production.quantity.toFixed(0)} {production.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenModal(production)}
                          className="
                            inline-flex items-center gap-2
                            bg-teal-500
                            text-white
                            font-semibold
                            px-3 py-1.5
                            rounded-xl
                            shadow-md shadow-teal-500/30
                            hover:bg-teal-600
                            hover:shadow-lg hover:shadow-teal-500/40
                            active:scale-95
                            transition-all duration-150
                            text-sm
                          "
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden md:inline">Recibir</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
          </>
        )}

        {/* History Tab Content */}
        {activeTab === "history" && (
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-white/10">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Historial de Recepciones
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Registro de productos terminados recibidos en inventario
            </p>
          </div>

          <div className="overflow-x-auto">
            {receptionHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-4 mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  No hay recepciones registradas
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-white/5">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Fecha Recepción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Centro de Trabajo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Recibido Por
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {receptionHistory.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-white/30 dark:hover:bg-white/5 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(record.received_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {record.product_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {record.product_code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {record.work_center_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-green-600 dark:text-green-400">
                        {record.quantity_received.toFixed(0)} {record.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {record.received_by_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="max-w-xs truncate" title={record.notes || ""}>
                          {record.notes || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Reception Modal (Single Item) */}
      {selectedProduction && (
        <ReceptionModal
          open={showModal}
          onOpenChange={setShowModal}
          production={selectedProduction}
          onApprove={approveReception}
          onReject={rejectReception}
          onSuccess={() => {
            handleCloseModal()
            refetch()
            toast.success("Recepción procesada exitosamente")
          }}
        />
      )}

      {/* Batch Reception Modal (Multiple Items) */}
      <BatchReceptionModal
        open={showBatchModal}
        onOpenChange={setShowBatchModal}
        selectedProductions={selectedProductionsForBatch}
        onApprove={approveBatchReceptions}
        onSuccess={handleBatchSuccess}
      />
    </div>
  )
}
