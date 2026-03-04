'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEmployeeDirectory, EmployeeRecord } from '@/hooks/use-employee-directory'
import { EMPLOYEE_SEED_DATA } from '@/lib/employee-seed-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Loader2, Plus, Search, Upload, Users, Download, Trash2, Camera, X, ChevronDown, ChevronLeft, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { CameraCapture } from '@/components/hr/CameraCapture'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ─── Column definitions grouped by category ───────────────────────────────
interface ColDef {
  key: keyof EmployeeRecord
  label: string
  width?: number
  type?: 'text' | 'select' | 'photo'
  options?: string[]
}

interface ColGroup {
  id: string
  label: string
  icon: string
  columns: ColDef[]
}

const COLUMN_GROUPS: ColGroup[] = [
  {
    id: 'basico', label: 'Datos Básicos', icon: '📋',
    columns: [
      { key: 'company', label: 'Empresa', width: 130, type: 'select', options: ['PASTRY CHEF', 'PASTRYCOL'] },
      { key: 'document_type', label: 'T.I.', width: 70, type: 'select', options: ['CC', 'PPT', 'CE', 'TI', 'PA'] },
      { key: 'document_number', label: '# Identificación', width: 130 },
      { key: 'salary', label: 'Salario', width: 130 },
      { key: 'position', label: 'Cargo', width: 200 },
      { key: 'status', label: 'Estado', width: 100, type: 'select', options: ['Activo', 'Retirado'] },
    ],
  },
  {
    id: 'fechas', label: 'Fechas', icon: '📅',
    columns: [
      { key: 'hire_date', label: 'F. Ingreso', width: 120 },
      { key: 'probation_end_date', label: 'F. Fin Prueba', width: 120 },
      { key: 'birth_date', label: 'F. Nacimiento', width: 120 },
      { key: 'retirement_date', label: 'F. Retiro', width: 120 },
    ],
  },
  {
    id: 'personal', label: 'Datos Personales', icon: '👤',
    columns: [
      { key: 'birth_place', label: 'Lugar Nacimiento', width: 180 },
      { key: 'gender', label: 'Género', width: 100, type: 'select', options: ['Masculino', 'Femenino', 'Otro'] },
      { key: 'blood_type', label: 'Tipo Sangre', width: 90, type: 'select', options: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] },
      { key: 'phone', label: 'Celular', width: 130 },
      { key: 'email', label: 'Correo', width: 240 },
      { key: 'smokes', label: 'Fuma', width: 120, type: 'select', options: ['No', 'Si', 'Ocasionalmente'] },
      { key: 'marital_status', label: 'Estado Civil', width: 120, type: 'select', options: ['Solter@', 'Casad@', 'Unión Libre', 'Divorciado', 'Divorciad@', 'Viudo', 'Viud@'] },
    ],
  },
  {
    id: 'vivienda', label: 'Vivienda', icon: '🏠',
    columns: [
      { key: 'address', label: 'Dirección', width: 250 },
      { key: 'housing_type', label: 'Tipo Vivienda', width: 120, type: 'select', options: ['Propia', 'Arrendada', 'Familiar'] },
      { key: 'neighborhood', label: 'Barrio', width: 160 },
      { key: 'locality', label: 'Localidad', width: 150 },
      { key: 'estrato', label: 'Estrato', width: 80, type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
    ],
  },
  {
    id: 'formacion', label: 'Formación / Banco', icon: '🎓',
    columns: [
      { key: 'education_level', label: 'Escolaridad', width: 170, type: 'select', options: ['Primaria completa', 'Primaria Completa', 'Primaria incompleta', 'Bachiller completo', 'Bachiller Completo', 'Bachiller incompleto', 'Bachiller Incompleto', 'Técnico', 'Tecnólogo', 'Tecnologo', 'Profesional'] },
      { key: 'bank', label: 'Banco', width: 150 },
      { key: 'bank_account', label: '# Cuenta', width: 180 },
    ],
  },
  {
    id: 'seguridad', label: 'Seguridad Social', icon: '🏥',
    columns: [
      { key: 'eps', label: 'EPS', width: 140 },
      { key: 'pension_fund', label: 'Fondo Pensión', width: 140 },
      { key: 'severance_fund', label: 'Fondo Cesantías', width: 160 },
    ],
  },
  {
    id: 'salud', label: 'Salud', icon: '❤️',
    columns: [
      { key: 'is_allergic', label: 'Alérgico', width: 90, type: 'select', options: ['No', 'Si', 'SI'] },
      { key: 'allergy_details', label: 'Detalle Alergia', width: 180 },
      { key: 'has_disease', label: 'Enfermedad', width: 100, type: 'select', options: ['No', 'Si'] },
      { key: 'disease_details', label: 'Detalle Enfermedad', width: 200 },
      { key: 'has_disability', label: 'Discapacidad', width: 110, type: 'select', options: ['No', 'Si'] },
      { key: 'disability_details', label: 'Detalle Discapacidad', width: 160 },
    ],
  },
  {
    id: 'dependientes', label: 'Dependientes', icon: '👨‍👩‍👧',
    columns: [
      { key: 'has_dependents_company', label: 'Pers. Cargo Empresa', width: 150, type: 'select', options: ['No', 'Si'] },
      { key: 'is_head_household', label: 'Cabeza Hogar', width: 120, type: 'select', options: ['No', 'Si'] },
      { key: 'has_dependents_home', label: 'Pers. Cargo Hogar', width: 140, type: 'select', options: ['No', 'Si'] },
      { key: 'num_dependents', label: '# Dependientes', width: 120 },
    ],
  },
  {
    id: 'emergencia', label: 'Emergencia', icon: '🚨',
    columns: [
      { key: 'emergency_contact_name', label: 'Contacto Emergencia', width: 200 },
      { key: 'emergency_contact_relationship', label: 'Parentesco', width: 140 },
      { key: 'emergency_contact_phone', label: 'Tel. Emergencia', width: 140 },
    ],
  },
  {
    id: 'hijos', label: 'Hijos', icon: '👶',
    columns: [
      { key: 'has_children', label: 'Tiene Hijos', width: 100, type: 'select', options: ['No', 'Si', 'SI'] },
      { key: 'num_children', label: '# Hijos', width: 80 },
      { key: 'child1_name', label: 'Hijo 1 Nombre', width: 220 },
      { key: 'child1_birthdate', label: 'Hijo 1 F.Nac.', width: 120 },
      { key: 'child2_name', label: 'Hijo 2 Nombre', width: 220 },
      { key: 'child2_birthdate', label: 'Hijo 2 F.Nac.', width: 120 },
      { key: 'child3_name', label: 'Hijo 3 Nombre', width: 220 },
      { key: 'child3_birthdate', label: 'Hijo 3 F.Nac.', width: 120 },
      { key: 'child4_name', label: 'Hijo 4 Nombre', width: 220 },
      { key: 'child4_birthdate', label: 'Hijo 4 F.Nac.', width: 120 },
      { key: 'child5_name', label: 'Hijo 5 Nombre', width: 220 },
      { key: 'child5_birthdate', label: 'Hijo 5 F.Nac.', width: 120 },
    ],
  },
  {
    id: 'dotacion', label: 'Dotación', icon: '👕',
    columns: [
      { key: 'pants_size', label: 'Talla Pantalón', width: 120, type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'shirt_size', label: 'Talla Blusón', width: 120, type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'boots_size', label: 'Talla Botas', width: 110 },
    ],
  },
  {
    id: 'estado', label: 'Estado / Onboarding', icon: '✅',
    columns: [
      { key: 'resignation_reason', label: 'Motivo Renuncia', width: 180 },
      { key: 'received_onboarding', label: 'Recibió Onboarding', width: 150, type: 'select', options: ['', 'Si', 'SI', 'No'] },
    ],
  },
]

// ─── EditableCell ──────────────────────────────────────────────────────────
function EditableCell({
  value,
  onChange,
  type = 'text',
  options,
  width,
}: {
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'select' | 'photo'
  options?: string[]
  width?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }, [draft, value, onChange])

  if (type === 'select' && editing) {
    return (
      <select
        autoFocus
        className="w-full h-full bg-blue-50 dark:bg-blue-950 border-2 border-blue-400 rounded px-1 text-xs outline-none"
        value={draft}
        onChange={e => { setDraft(e.target.value); }}
        onBlur={() => { commit() }}
        style={{ minWidth: width || 80 }}
      >
        <option value="">—</option>
        {options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        className="w-full h-full bg-blue-50 dark:bg-blue-950 border-2 border-blue-400 rounded px-2 text-xs outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        style={{ minWidth: width || 80 }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="w-full h-full px-2 py-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded truncate text-xs leading-6 min-h-[28px]"
      style={{ minWidth: width || 80 }}
      title={value || '(vacío)'}
    >
      {value || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
    </div>
  )
}

// ─── PhotoCell with face enrollment ───────────────────────────────────────
function PhotoCell({ employee, onEnrolled, onUpdateField }: { employee: EmployeeRecord; onEnrolled: () => void; onUpdateField: (id: string, field: string, value: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const initials = employee.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const hasPhoto = !!employee.photo_url

  const handleEnroll = async () => {
    if (!capturedImage) return
    setUploading(true)
    try {
      const nameParts = employee.full_name?.split(' ') || ['', '']
      const formData = new FormData()
      formData.append('image', capturedImage, 'capture.jpg')
      formData.append('first_name', nameParts[0] || '')
      formData.append('last_name', nameParts.slice(1).join(' ') || '')

      const res = await fetch(`${API_URL}/api/hr/enroll`, { method: 'POST', body: formData })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData?.detail?.message || resData?.detail?.error || 'Error al registrar')

      // Save the photo_url from the enroll response into employee_directory
      if (resData.photo_url) {
        await onUpdateField(employee.id, 'photo_url', resData.photo_url)
      }

      toast.success(`Rostro registrado (embedding ${resData.embedding_dim}D)`)
      setCapturedImage(null)
      setOpen(false)
      onEnrolled()
    } catch (e: any) {
      toast.error('Error: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Avatar
          className={`h-7 w-7 border cursor-pointer ${hasPhoto ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setOpen(true)}
          title={hasPhoto ? 'Rostro registrado - Click para cambiar' : 'Click para registrar rostro'}
        >
          <AvatarImage src={employee.photo_url || undefined} className="object-cover" />
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-700 dark:text-blue-300">{initials}</AvatarFallback>
        </Avatar>
        {!hasPhoto && (
          <button
            onClick={() => setOpen(true)}
            className="text-gray-300 hover:text-blue-500 transition-colors"
            title="Registrar rostro"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setCapturedImage(null); setOpen(v) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar Rostro - {employee.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {capturedImage ? (
              <div className="space-y-3">
                <img
                  src={URL.createObjectURL(capturedImage)}
                  className="rounded-lg w-full aspect-video object-cover ring-2 ring-green-500"
                />
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                  <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-xs">✓</div>
                  Rostro capturado
                  <button onClick={() => setCapturedImage(null)} className="ml-auto text-xs underline">Repetir</button>
                </div>
              </div>
            ) : (
              <CameraCapture onCapture={(blob) => setCapturedImage(blob)} />
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleEnroll} disabled={!capturedImage || uploading}>
                {uploading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Guardar Rostro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function HRConfigPage() {
  const router = useRouter()
  const { data, loading, updateField, createEmployee, deleteEmployee, bulkInsert, uploadPhoto, fetchData } = useEmployeeDirectory()
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<'all' | 'PASTRY CHEF' | 'PASTRYCOL'>('all')
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set(['basico', 'fechas', 'personal']))
  const [seeding, setSeeding] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('PASTRY CHEF')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Filter data
  const filtered = useMemo(() => {
    let rows = data
    if (companyFilter !== 'all') rows = rows.filter(r => r.company === companyFilter)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(r =>
        r.full_name?.toLowerCase().includes(s) ||
        r.document_number?.includes(s) ||
        r.position?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s)
      )
    }
    return rows
  }, [data, companyFilter, search])

  // Active columns
  const activeColumns = useMemo(() => {
    const cols: ColDef[] = []
    COLUMN_GROUPS.forEach(g => {
      if (activeGroups.has(g.id)) cols.push(...g.columns)
    })
    return cols
  }, [activeGroups])

  const toggleGroup = (id: string) => {
    setActiveGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSeed = async () => {
    if (data.length > 0) {
      const confirm = window.confirm(`Ya hay ${data.length} empleados. ¿Desea agregar los datos de ejemplo? Se pueden duplicar registros.`)
      if (!confirm) return
    }
    setSeeding(true)
    // Insert in batches of 20
    const batchSize = 20
    let success = true
    for (let i = 0; i < EMPLOYEE_SEED_DATA.length; i += batchSize) {
      const batch = EMPLOYEE_SEED_DATA.slice(i, i + batchSize)
      const result = await bulkInsert(batch)
      if (!result) { success = false; break }
    }
    if (success) {
      toast.success(`${EMPLOYEE_SEED_DATA.length} empleados cargados exitosamente`)
      fetchData()
    }
    setSeeding(false)
  }

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Ingrese el nombre'); return }
    await createEmployee({ full_name: newName.trim(), company: newCompany, status: 'Activo' })
    toast.success('Empleado agregado')
    setNewName('')
    setAddDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deleteEmployee(id)
    toast.success('Empleado eliminado')
    setConfirmDelete(null)
  }

  const countByCompany = useMemo(() => {
    const pc = data.filter(r => r.company === 'PASTRY CHEF').length
    const pcol = data.filter(r => r.company === 'PASTRYCOL').length
    return { pc, pcol, total: data.length }
  }, [data])

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b bg-white dark:bg-zinc-950 px-4 py-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/hr')}
              className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              title="Volver a HR"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Directorio de Empleados</h1>
              <p className="text-xs text-gray-500">
                {countByCompany.total} empleados · Pastry Chef: {countByCompany.pc} · Pastrycol: {countByCompany.pcol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar nombre, doc, cargo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 w-56 text-xs"
              />
            </div>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Nuevo Empleado</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input placeholder="Nombre completo" value={newName} onChange={e => setNewName(e.target.value)} />
                  <Select value={newCompany} onValueChange={setNewCompany}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASTRY CHEF">Pastry Chef</SelectItem>
                      <SelectItem value="PASTRYCOL">Pastrycol</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAdd} className="w-full">Agregar</Button>
                </div>
              </DialogContent>
            </Dialog>

            {data.length === 0 && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                Cargar datos iniciales
              </Button>
            )}
          </div>
        </div>

        {/* ── Company filter tabs ──────────────────────────────── */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {([
              { key: 'all' as const, label: 'Todos', count: countByCompany.total },
              { key: 'PASTRY CHEF' as const, label: 'Pastry Chef', count: countByCompany.pc },
              { key: 'PASTRYCOL' as const, label: 'Pastrycol', count: countByCompany.pcol },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setCompanyFilter(tab.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  companyFilter === tab.key
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

          {/* Column group toggles */}
          <div className="flex gap-1 flex-wrap">
            {COLUMN_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                  activeGroups.has(g.id)
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-gray-600'
                }`}
              >
                {g.icon} {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
          <Users className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">No hay empleados registrados</p>
          <p className="text-sm">Carga los datos iniciales para comenzar</p>
          <Button onClick={handleSeed} disabled={seeding} className="bg-blue-600 hover:bg-blue-700">
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Cargar {EMPLOYEE_SEED_DATA.length} empleados
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-xs w-max min-w-full">
            <thead className="sticky top-0 z-20">
              {/* Group header row */}
              <tr className="bg-gray-50 dark:bg-zinc-900 border-b">
                <th className="sticky left-0 z-30 bg-gray-50 dark:bg-zinc-900 w-10 px-1" />
                <th className="sticky left-10 z-30 bg-gray-50 dark:bg-zinc-900 px-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[200px]" colSpan={1}>
                  Foto / Nombre
                </th>
                {COLUMN_GROUPS.filter(g => activeGroups.has(g.id)).map(g => (
                  <th
                    key={g.id}
                    colSpan={g.columns.length}
                    className="px-2 py-1 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-zinc-700"
                  >
                    {g.icon} {g.label}
                  </th>
                ))}
                <th className="w-10 px-1" />
              </tr>
              {/* Column header row */}
              <tr className="bg-white dark:bg-zinc-950 border-b-2 border-gray-200 dark:border-zinc-700">
                <th className="sticky left-0 z-30 bg-white dark:bg-zinc-950 w-10 px-1 text-center text-[10px] text-gray-400">#</th>
                <th className="sticky left-10 z-30 bg-white dark:bg-zinc-950 px-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 min-w-[200px]">
                  Nombre Completo
                </th>
                {activeColumns.map(col => (
                  <th
                    key={col.key}
                    className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap border-l border-gray-100 dark:border-zinc-800"
                    style={{ minWidth: col.width || 100 }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-10 px-1" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => (
                <tr
                  key={emp.id}
                  className={`border-b border-gray-100 dark:border-zinc-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors ${
                    emp.status === 'Retirado' ? 'opacity-50 bg-red-50/30 dark:bg-red-950/10' : ''
                  }`}
                >
                  {/* Row number */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-950 w-10 px-1 text-center text-[10px] text-gray-400 border-r border-gray-100 dark:border-zinc-800">
                    {idx + 1}
                  </td>

                  {/* Photo + Name (sticky) */}
                  <td className="sticky left-10 z-10 bg-white dark:bg-zinc-950 px-2 border-r border-gray-200 dark:border-zinc-700 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <PhotoCell employee={emp} onEnrolled={fetchData} onUpdateField={updateField} />
                      <EditableCell
                        value={emp.full_name || ''}
                        onChange={v => updateField(emp.id, 'full_name', v)}
                        width={160}
                      />
                      {emp.company === 'PASTRYCOL' && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">
                          COL
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Dynamic columns */}
                  {activeColumns.map(col => (
                    <td
                      key={col.key}
                      className="px-0 border-l border-gray-50 dark:border-zinc-800/50"
                      style={{ minWidth: col.width || 100 }}
                    >
                      <EditableCell
                        value={(emp[col.key] as string) || ''}
                        onChange={v => updateField(emp.id, col.key, v)}
                        type={col.type || 'text'}
                        options={col.options}
                        width={col.width}
                      />
                    </td>
                  ))}

                  {/* Actions */}
                  <td className="w-10 px-1">
                    {confirmDelete === emp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                        >
                          Si
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-gray-400 hover:text-gray-600 text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(emp.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && data.length > 0 && (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
              No se encontraron resultados para &quot;{search}&quot;
            </div>
          )}
        </div>
      )}

      {/* ── Footer stats ────────────────────────────────────────── */}
      {data.length > 0 && (
        <div className="flex-shrink-0 border-t bg-gray-50 dark:bg-zinc-900 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-500">
          <span>
            Mostrando {filtered.length} de {data.length} empleados
            {search && ` · Filtro: "${search}"`}
          </span>
          <span>
            {activeColumns.length} columnas visibles · Click en cualquier celda para editar
          </span>
        </div>
      )}
    </div>
  )
}
