"use client"

import { useState } from "react"
import { RouteGuard } from "@/components/auth/RouteGuard"
import { useUsers, AVAILABLE_PERMISSIONS, UserRole, type UserWithDetails } from "@/hooks/use-users"
import { Users, Plus, Edit2, Trash2, Search, UserCheck, UserX, X, Save, Shield } from "lucide-react"

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Admin (Legacy)',
  administrator: 'Administrador',
  coordinador_logistico: 'Coord. Logístico',
  commercial: 'Comercial',
  reviewer: 'Revisor',
  reviewer_area1: 'Revisor Área 1',
  reviewer_area2: 'Revisor Área 2',
  dispatcher: 'Despachador',
  driver: 'Conductor',
  client: 'Cliente'
}

export default function UsersManagementPage() {
  const { users, loading, error: hookError, createUser, updateUser, deleteUser, toggleUserStatus, updateUserPermissions } = useUsers()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'commercial' as UserRole,
    cedula: ''
  })

  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.cedula?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await createUser(formData)
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError(null)
    setIsSubmitting(true)

    try {
      await updateUser(selectedUser.id, formData)
      setShowEditModal(false)
      setSelectedUser(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      await updateUserPermissions(selectedUser.id, permissions)
      setShowPermissionsModal(false)
      setSelectedUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar permisos')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${userName}?`)) return

    try {
      await deleteUser(userId)
    } catch (err) {
      alert('Error al eliminar usuario')
    }
  }

  const handleToggleStatus = async (user: UserWithDetails) => {
    try {
      await toggleUserStatus(user.id, (user as any).status || 'active')
    } catch (err) {
      alert('Error al cambiar estado del usuario')
    }
  }

  const openEditModal = (user: UserWithDetails) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      cedula: user.cedula || ''
    })
    setShowEditModal(true)
  }

  const openPermissionsModal = (user: UserWithDetails) => {
    setSelectedUser(user)
    const userPermissions = user.permissions as Record<string, boolean> || {}
    setPermissions(userPermissions)
    setShowPermissionsModal(true)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: 'commercial',
      cedula: ''
    })
    setError(null)
  }

  if (loading) {
    return (
      <RouteGuard requiredRoles={['super_admin']}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRoles={['super_admin']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 p-4 md:p-6 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 rounded-xl p-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
                  Gestión de Usuarios
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Administra usuarios, roles y permisos del sistema
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 active:scale-95 transition-all duration-150"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Error Alert */}
          {hookError && (
            <div className="bg-red-500/10 dark:bg-red-500/5 backdrop-blur-xl border border-red-500/30 dark:border-red-500/40 rounded-lg p-4 flex items-start gap-3">
              <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Error al cargar usuarios</p>
                <p className="text-sm text-red-600 dark:text-red-400">{hookError}</p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-2">Revisa la consola del navegador (F12) para más detalles.</p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, email o cédula..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500/20 rounded-full p-2">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                            {user.cedula && (
                              <p className="text-xs text-gray-500">CC: {user.cedula}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {ROLE_LABELS[user.role as UserRole] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(user as any).status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-xs font-semibold text-green-700 dark:text-green-300">
                            <UserCheck className="w-3 h-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-700 dark:text-red-300">
                            <UserX className="w-3 h-3" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openPermissionsModal(user)}
                            className="p-1.5 hover:bg-purple-500/30 rounded-lg transition-all text-purple-600 dark:text-purple-400 hover:scale-110 active:scale-95"
                            title="Permisos"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 hover:bg-blue-500/30 rounded-lg transition-all text-blue-600 dark:text-blue-400 hover:scale-110 active:scale-95"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="p-1.5 hover:bg-yellow-500/30 rounded-lg transition-all text-yellow-600 dark:text-yellow-400 hover:scale-110 active:scale-95"
                            title={(user as any).status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {(user as any).status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-1.5 hover:bg-red-500/30 rounded-lg transition-all text-red-600 dark:text-red-400 hover:scale-110 active:scale-95"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false)
                resetForm()
              }
            }}
          >
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl w-full max-w-2xl rounded-3xl animate-slide-up border border-white/20 dark:border-white/10">
              <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Crear Nuevo Usuario</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 active:scale-95 transition-all disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedUser && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false)
                setSelectedUser(null)
                resetForm()
              }
            }}
          >
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl w-full max-w-2xl rounded-3xl animate-slide-up border border-white/20 dark:border-white/10">
              <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Usuario</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    resetForm()
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cédula
                  </label>
                  <input
                    type="text"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setSelectedUser(null)
                      resetForm()
                    }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 active:scale-95 transition-all disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permissions Modal */}
        {showPermissionsModal && selectedUser && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPermissionsModal(false)
                setSelectedUser(null)
              }
            }}
          >
            <div className="bg-white dark:bg-black/90 backdrop-blur-xl w-full max-w-4xl rounded-3xl animate-slide-up border border-white/20 dark:border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Permisos de Usuario</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedUser.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPermissionsModal(false)
                    setSelectedUser(null)
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(AVAILABLE_PERMISSIONS).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-white/20 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer bg-white/50 dark:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[key] || false}
                        onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 p-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionsModal(false)
                    setSelectedUser(null)
                  }}
                  className="px-6 py-2.5 border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdatePermissions}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 active:scale-95 transition-all disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : 'Guardar Permisos'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
