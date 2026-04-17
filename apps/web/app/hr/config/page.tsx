'use client'

import { Suspense, useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
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
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  Loader2, Plus, Search, Users, Download, Trash2, Camera, ChevronDown, ChevronLeft, Link2, Check, FileText, ArrowUpAZ, ArrowDownAZ, CalendarRange, FilterX,
} from 'lucide-react'
import { toast } from 'sonner'
import { CameraCapture } from '@/components/hr/CameraCapture'
import { generateContract } from '@/lib/contract-generator'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ─── Column definitions grouped by category ───────────────────────────────
interface ColDef {
  key: keyof EmployeeRecord
  label: string
  width?: number
  type?: 'text' | 'select' | 'photo' | 'date' | 'number'
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
      { key: 'document_expedition_date', label: 'F. Exp. Cédula', width: 120, type: 'date' },
      { key: 'document_expedition_city', label: 'Ciudad Exp.', width: 130 },
      { key: 'nationality', label: 'Nacionalidad', width: 120 },
      { key: 'salary', label: 'Salario', width: 130, type: 'number' },
      { key: 'position', label: 'Cargo', width: 200 },
      { key: 'employee_category', label: 'Categoría', width: 180, type: 'select', options: ['Operario', 'Dirección, Manejo y Confianza'] },
      { key: 'status', label: 'Estado', width: 100, type: 'select', options: ['Activo', 'Retirado'] },
    ],
  },
  {
    id: 'fechas', label: 'Fechas', icon: '📅',
    columns: [
      { key: 'hire_date', label: 'F. Ingreso', width: 120, type: 'date' },
      { key: 'probation_end_date', label: 'F. Fin Prueba', width: 120, type: 'date' },
      { key: 'birth_date', label: 'F. Nacimiento', width: 120, type: 'date' },
      { key: 'retirement_date', label: 'F. Retiro', width: 120, type: 'date' },
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
      { key: 'num_dependents', label: '# Dependientes', width: 120, type: 'number' },
    ],
  },
  {
    id: 'emergencia', label: 'Emergencia', icon: '🚨',
    columns: [
      { key: 'emergency_contact_name', label: 'Contacto Emergencia', width: 200 },
      { key: 'emergency_contact_relationship', label: 'Parentesco', width: 140 },
      { key: 'emergency_contact_phone', label: 'Tel. Emergencia', width: 140 },
      { key: 'beneficiaries', label: 'Beneficiarios', width: 250 },
    ],
  },
  {
    id: 'hijos', label: 'Hijos', icon: '👶',
    columns: [
      { key: 'has_children', label: 'Tiene Hijos', width: 100, type: 'select', options: ['No', 'Si', 'SI'] },
      { key: 'num_children', label: '# Hijos', width: 80, type: 'number' },
      { key: 'child1_name', label: 'Hijo 1 Nombre', width: 220 },
      { key: 'child1_birthdate', label: 'Hijo 1 F.Nac.', width: 120, type: 'date' },
      { key: 'child2_name', label: 'Hijo 2 Nombre', width: 220 },
      { key: 'child2_birthdate', label: 'Hijo 2 F.Nac.', width: 120, type: 'date' },
      { key: 'child3_name', label: 'Hijo 3 Nombre', width: 220 },
      { key: 'child3_birthdate', label: 'Hijo 3 F.Nac.', width: 120, type: 'date' },
      { key: 'child4_name', label: 'Hijo 4 Nombre', width: 220 },
      { key: 'child4_birthdate', label: 'Hijo 4 F.Nac.', width: 120, type: 'date' },
      { key: 'child5_name', label: 'Hijo 5 Nombre', width: 220 },
      { key: 'child5_birthdate', label: 'Hijo 5 F.Nac.', width: 120, type: 'date' },
    ],
  },
  {
    id: 'dotacion', label: 'Dotación', icon: '👕',
    columns: [
      { key: 'pants_size', label: 'Talla Pantalón', width: 120, type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'shirt_size', label: 'Talla Blusón', width: 120, type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'boots_size', label: 'Talla Botas', width: 110, type: 'number' },
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

const DEFAULT_GROUP_IDS = ['basico', 'fechas', 'personal']

const REQUIRED_FIELD_LABELS: Partial<Record<keyof EmployeeRecord, string>> = {
  company: 'Empresa',
  document_type: 'Tipo de documento',
  document_number: 'Identificación',
  nationality: 'Nacionalidad',
  salary: 'Salario',
  position: 'Cargo',
  employee_category: 'Categoría',
  status: 'Estado',
  hire_date: 'Fecha de ingreso',
  birth_date: 'Fecha de nacimiento',
  birth_place: 'Lugar de nacimiento',
  gender: 'Género',
  blood_type: 'Tipo de sangre',
  phone: 'Celular',
  email: 'Correo',
  marital_status: 'Estado civil',
  address: 'Dirección',
  education_level: 'Escolaridad',
  bank: 'Banco',
  bank_account: 'Número de cuenta',
  eps: 'EPS',
  pension_fund: 'Fondo de pensión',
  severance_fund: 'Fondo de cesantías',
}

const REQUIRED_FIELDS = Object.keys(REQUIRED_FIELD_LABELS) as (keyof EmployeeRecord)[]

function isBlankValue(value: unknown) {
  return value == null || String(value).trim() === ''
}

function parseDateValue(value: string | null | undefined) {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const parsed = new Date(Number(y), Number(m) - 1, Number(d))
    return isValid(parsed) ? parsed : null
  }
  const parsed = parseISO(trimmed)
  return isValid(parsed) ? parsed : null
}

function formatDateCell(value: string) {
  const parsed = parseDateValue(value)
  return parsed ? format(parsed, 'dd/MM/yyyy', { locale: es }) : value
}

function parseNumberValue(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.replace(/[^\d-]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

function compareValues(a: string, b: string, type: ColDef['type'] = 'text') {
  if (type === 'date') {
    const aDate = parseDateValue(a)
    const bDate = parseDateValue(b)
    if (!aDate || !bDate) return 0
    return aDate.getTime() - bDate.getTime()
  }

  if (type === 'number') {
    const aNumber = parseNumberValue(a)
    const bNumber = parseNumberValue(b)
    if (aNumber == null || bNumber == null) return 0
    return aNumber - bNumber
  }

  return a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true })
}

function getMissingRequiredFields(employee: EmployeeRecord) {
  return REQUIRED_FIELDS.filter(field => isBlankValue(employee[field]))
}

function getPresenceParamKey(key: keyof EmployeeRecord) {
  return `presence_${String(key)}`
}

function getDateFromParamKey(key: keyof EmployeeRecord) {
  return `from_${String(key)}`
}

function getDateToParamKey(key: keyof EmployeeRecord) {
  return `to_${String(key)}`
}

function getValuesParamKey(key: keyof EmployeeRecord) {
  return `values_${String(key)}`
}

const VALUES_SEPARATOR = '||'

function parseValuesParam(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(VALUES_SEPARATOR).map(v => v.trim()).filter(Boolean)
}

function serializeValues(values: string[]): string | null {
  const cleaned = values.map(v => v.trim()).filter(Boolean)
  if (cleaned.length === 0) return null
  return cleaned.join(VALUES_SEPARATOR)
}

function getSortLabels(type: ColDef['type']) {
  if (type === 'date') return { asc: 'Más antigua', desc: 'Más reciente' }
  if (type === 'number') return { asc: 'Menor a mayor', desc: 'Mayor a menor' }
  return { asc: 'A a Z', desc: 'Z a A' }
}

function ColumnHeaderFilter({
  label,
  columnKey,
  type = 'text',
  sortKey,
  sortDir,
  presenceFilter,
  dateRange,
  uniqueValues,
  selectedValues,
  onSortChange,
  onPresenceChange,
  onDateRangeChange,
  onValuesChange,
  onClear,
}: {
  label: string
  columnKey: keyof EmployeeRecord
  type?: ColDef['type']
  sortKey: string | null
  sortDir: 'asc' | 'desc'
  presenceFilter: string | null
  dateRange: DateRange | undefined
  uniqueValues: string[]
  selectedValues: string[]
  onSortChange: (dir: 'asc' | 'desc') => void
  onPresenceChange: (value: 'filled' | 'missing' | null) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onValuesChange: (values: string[]) => void
  onClear: () => void
}) {
  const sortLabels = getSortLabels(type)
  const isSorted = sortKey === columnKey
  const hasDateFilter = Boolean(dateRange?.from || dateRange?.to)
  const hasValuesFilter = selectedValues.length > 0
  const hasFilter = Boolean(presenceFilter || hasDateFilter || hasValuesFilter)
  const [valueSearch, setValueSearch] = useState('')
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])
  const filteredValues = useMemo(() => {
    const q = valueSearch.trim().toLowerCase()
    if (!q) return uniqueValues
    return uniqueValues.filter(v => v.toLowerCase().includes(q))
  }, [uniqueValues, valueSearch])
  const toggleValue = (val: string) => {
    if (selectedSet.has(val)) {
      onValuesChange(selectedValues.filter(v => v !== val))
    } else {
      onValuesChange([...selectedValues, val])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800',
            (isSorted || hasFilter) && 'text-blue-600 dark:text-blue-400'
          )}
        >
          <span>{label}</span>
          {hasDateFilter ? (
            <CalendarRange className="h-3 w-3" />
          ) : isSorted ? (
            sortDir === 'asc' ? <ArrowUpAZ className="h-3 w-3" /> : <ArrowDownAZ className="h-3 w-3" />
          ) : hasFilter ? (
            <FilterX className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
            <p className="text-[11px] text-gray-500">
              Ordenar y filtrar como en Excel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={isSorted && sortDir === 'asc' ? 'default' : 'outline'}
              size="sm"
              className="justify-start text-xs"
              onClick={() => onSortChange('asc')}
            >
              <ArrowUpAZ className="h-3.5 w-3.5 mr-1.5" />
              {sortLabels.asc}
            </Button>
            <Button
              type="button"
              variant={isSorted && sortDir === 'desc' ? 'default' : 'outline'}
              size="sm"
              className="justify-start text-xs"
              onClick={() => onSortChange('desc')}
            >
              <ArrowDownAZ className="h-3.5 w-3.5 mr-1.5" />
              {sortLabels.desc}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={presenceFilter === 'filled' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => onPresenceChange(presenceFilter === 'filled' ? null : 'filled')}
            >
              Solo con dato
            </Button>
            <Button
              type="button"
              variant={presenceFilter === 'missing' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => onPresenceChange(presenceFilter === 'missing' ? null : 'missing')}
            >
              Solo faltantes
            </Button>
          </div>

          {type === 'date' && (
            <div className="space-y-2 rounded-lg border border-gray-200 dark:border-zinc-800 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Rango de fecha</span>
                <span className="text-[11px] text-gray-500">
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                      : format(dateRange.from, 'dd/MM/yyyy')
                    : 'Sin rango'}
                </span>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={onDateRangeChange}
                locale={es}
                numberOfMonths={1}
              />
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-gray-200 dark:border-zinc-800 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                Filtrar por valor
              </span>
              {hasValuesFilter && (
                <button
                  type="button"
                  className="text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => onValuesChange([])}
                >
                  Limpiar ({selectedValues.length})
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
              <Input
                value={valueSearch}
                onChange={e => setValueSearch(e.target.value)}
                placeholder="Buscar valor..."
                className="h-7 pl-7 text-xs"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <button
                type="button"
                className="hover:underline disabled:opacity-40"
                disabled={filteredValues.length === 0}
                onClick={() => {
                  const next = Array.from(new Set([...selectedValues, ...filteredValues]))
                  onValuesChange(next)
                }}
              >
                Seleccionar todo
              </button>
              <span>{uniqueValues.length} valores</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded border border-gray-100 dark:border-zinc-800">
              {filteredValues.length === 0 ? (
                <div className="px-2 py-3 text-center text-[11px] text-gray-400">
                  {uniqueValues.length === 0 ? 'Sin valores disponibles' : 'Sin coincidencias'}
                </div>
              ) : (
                filteredValues.map(val => {
                  const checked = selectedSet.has(val)
                  return (
                    <label
                      key={val}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleValue(val)}
                      />
                      <span className="truncate" title={val}>{val}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={onClear}>
            Limpiar filtros de esta columna
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── EditableCell ──────────────────────────────────────────────────────────
function EditableCell({
  value,
  onChange,
  type = 'text',
  options,
  width,
  missing = false,
}: {
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'select' | 'photo' | 'date' | 'number'
  options?: string[]
  width?: number
  missing?: boolean
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
        className={cn(
          'w-full h-full rounded px-1 text-xs outline-none',
          missing
            ? 'bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
            : 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-400'
        )}
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
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
        className={cn(
          'w-full h-full rounded px-2 text-xs outline-none',
          missing
            ? 'bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
            : 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-400'
        )}
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
      className={cn(
        'w-full h-full px-2 py-1 cursor-pointer rounded truncate text-xs leading-6 min-h-[28px]',
        missing
          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40'
          : 'hover:bg-blue-50 dark:hover:bg-blue-950/50'
      )}
      style={{ minWidth: width || 80 }}
      title={missing ? 'Campo obligatorio faltante' : value || '(vacío)'}
    >
      {value
        ? (type === 'date' ? formatDateCell(value) : value)
        : <span className={cn('italic', missing ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-600')}>—</span>}
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
function HRConfigPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, loading, updateField, createEmployee, deleteEmployee, bulkInsert, fetchData } = useEmployeeDirectory()
  const [seeding, setSeeding] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('PASTRY CHEF')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const search = searchParams.get('q') || ''
  const companyFilter = (searchParams.get('company') as 'all' | 'PASTRY CHEF' | 'PASTRYCOL' | null) || 'all'
  const statusFilter = (searchParams.get('status') as 'Activo' | 'Retirado' | 'all' | null) || 'Activo'
  const sortKey = searchParams.get('sortKey') as keyof EmployeeRecord | null
  const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
  const groupsParam = searchParams.get('groups')
  const activeGroups = useMemo(() => {
    const validGroupIds = new Set(COLUMN_GROUPS.map(group => group.id))
    const requestedGroups = (groupsParam ? groupsParam.split(',') : DEFAULT_GROUP_IDS).filter(group => validGroupIds.has(group))
    return new Set(requestedGroups.length > 0 ? requestedGroups : DEFAULT_GROUP_IDS)
  }, [groupsParam])

  const allColumns = useMemo(() => COLUMN_GROUPS.flatMap(group => group.columns), [])
  const columnMap = useMemo(() => new Map(allColumns.map(column => [column.key, column])), [allColumns])

  const uniqueValuesByColumn = useMemo(() => {
    const map = new Map<string, string[]>()
    const keys: (keyof EmployeeRecord)[] = ['full_name', ...allColumns.map(c => c.key)]
    keys.forEach(key => {
      const set = new Set<string>()
      data.forEach(row => {
        const v = row[key]
        if (!isBlankValue(v)) set.add(String(v).trim())
      })
      const type = key === 'full_name' ? 'text' : columnMap.get(key)?.type || 'text'
      const arr = Array.from(set).sort((a, b) => compareValues(a, b, type))
      map.set(String(key), arr)
    })
    return map
  }, [allColumns, columnMap, data])

  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key)
      else params.set(key, value)
    })

    const query = params.toString()
    router.replace(query ? `/hr/config?${query}` : '/hr/config', { scroll: false })
  }, [router, searchParams])

  // Filter data
  const filtered = useMemo(() => {
    let rows = [...data]
    if (statusFilter !== 'all') rows = rows.filter(r => (r.status || 'Activo') === statusFilter)
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

    const fullNamePresenceFilter = searchParams.get(getPresenceParamKey('full_name'))
    if (fullNamePresenceFilter === 'filled') {
      rows = rows.filter(row => !isBlankValue(row.full_name))
    } else if (fullNamePresenceFilter === 'missing') {
      rows = rows.filter(row => isBlankValue(row.full_name))
    }

    const fullNameSelected = parseValuesParam(searchParams.get(getValuesParamKey('full_name')))
    if (fullNameSelected.length > 0) {
      const set = new Set(fullNameSelected)
      rows = rows.filter(row => set.has(String(row.full_name ?? '').trim()))
    }

    allColumns.forEach(col => {
      const presenceFilter = searchParams.get(getPresenceParamKey(col.key))
      if (presenceFilter === 'filled') {
        rows = rows.filter(row => !isBlankValue(row[col.key]))
      } else if (presenceFilter === 'missing') {
        rows = rows.filter(row => isBlankValue(row[col.key]))
      }

      const selectedValues = parseValuesParam(searchParams.get(getValuesParamKey(col.key)))
      if (selectedValues.length > 0) {
        const set = new Set(selectedValues)
        rows = rows.filter(row => set.has(String(row[col.key] ?? '').trim()))
      }

      if (col.type === 'date') {
        const from = parseDateValue(searchParams.get(getDateFromParamKey(col.key)))
        const to = parseDateValue(searchParams.get(getDateToParamKey(col.key)))
        if (from || to) {
          rows = rows.filter(row => {
            const valueDate = parseDateValue(row[col.key] as string | null)
            if (!valueDate) return false
            if (from && valueDate < from) return false
            if (to && valueDate > to) return false
            return true
          })
        }
      }
    })

    if (sortKey && (sortKey === 'full_name' || columnMap.has(sortKey))) {
      const sortType = sortKey === 'full_name' ? 'text' : columnMap.get(sortKey)?.type || 'text'
      rows.sort((a, b) => {
        const aValue = String(a[sortKey] || '')
        const bValue = String(b[sortKey] || '')
        const aBlank = isBlankValue(aValue)
        const bBlank = isBlankValue(bValue)

        if (aBlank && bBlank) return 0
        if (aBlank) return 1
        if (bBlank) return -1

        const result = compareValues(aValue, bValue, sortType)
        return sortDir === 'asc' ? result : -result
      })
    }

    return rows
  }, [allColumns, columnMap, companyFilter, data, search, searchParams, sortDir, sortKey, statusFilter])

  // Active columns
  const activeColumns = useMemo(() => {
    const cols: ColDef[] = []
    COLUMN_GROUPS.forEach(g => {
      if (activeGroups.has(g.id)) cols.push(...g.columns)
    })
    return cols
  }, [activeGroups])

  const toggleGroup = (id: string) => {
    const next = new Set(activeGroups)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const nextGroups = Array.from(next)
    updateUrlParams({ groups: nextGroups.length > 0 ? nextGroups.join(',') : DEFAULT_GROUP_IDS.join(',') })
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

  const countByStatus = useMemo(() => {
    const activos = data.filter(r => (r.status || 'Activo') === 'Activo').length
    const retirados = data.filter(r => r.status === 'Retirado').length
    return { activos, retirados }
  }, [data])

  const incompleteEmployees = useMemo(
    () => data.filter(employee => getMissingRequiredFields(employee).length > 0).length,
    [data]
  )

  const handleCopyRegisterLink = useCallback(() => {
    const url = `${window.location.origin}/hr/register`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    toast.success('Link de registro copiado al portapapeles')
    setTimeout(() => setLinkCopied(false), 2000)
  }, [])

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
                onChange={e => updateUrlParams({ q: e.target.value || null })}
                className="pl-8 h-8 w-56 text-xs"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleCopyRegisterLink}
            >
              {linkCopied ? <Check className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
              {linkCopied ? 'Copiado!' : 'Link Registro'}
            </Button>

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
                onClick={() => updateUrlParams({ company: tab.key === 'all' ? null : tab.key })}
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

          {/* Status filter */}
          <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
            {([
              { key: 'Activo' as const, label: 'Activos', count: countByStatus.activos },
              { key: 'Retirado' as const, label: 'Retirados', count: countByStatus.retirados },
              { key: 'all' as const, label: 'Todos', count: data.length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => updateUrlParams({ status: tab.key === 'Activo' ? null : tab.key })}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? tab.key === 'Retirado'
                      ? 'bg-white dark:bg-zinc-700 shadow-sm text-red-600 dark:text-red-400'
                      : 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400'
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
                  <ColumnHeaderFilter
                    label="Nombre Completo"
                    columnKey="full_name"
                    type="text"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    presenceFilter={searchParams.get(getPresenceParamKey('full_name'))}
                    dateRange={undefined}
                    uniqueValues={uniqueValuesByColumn.get('full_name') || []}
                    selectedValues={parseValuesParam(searchParams.get(getValuesParamKey('full_name')))}
                    onSortChange={(dir) => updateUrlParams({ sortKey: 'full_name', sortDir: dir })}
                    onPresenceChange={(value) => updateUrlParams({ [getPresenceParamKey('full_name')]: value })}
                    onDateRangeChange={() => {}}
                    onValuesChange={(values) => updateUrlParams({ [getValuesParamKey('full_name')]: serializeValues(values) })}
                    onClear={() => updateUrlParams({
                      sortKey: sortKey === 'full_name' ? null : sortKey,
                      sortDir: sortKey === 'full_name' ? null : sortDir,
                      [getPresenceParamKey('full_name')]: null,
                      [getValuesParamKey('full_name')]: null,
                    })}
                  />
                </th>
                {activeColumns.map(col => (
                  <th
                    key={col.key}
                    className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap border-l border-gray-100 dark:border-zinc-800"
                    style={{ minWidth: col.width || 100 }}
                  >
                    <ColumnHeaderFilter
                      label={col.label}
                      columnKey={col.key}
                      type={col.type || 'text'}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      presenceFilter={searchParams.get(getPresenceParamKey(col.key))}
                      dateRange={{
                        from: parseDateValue(searchParams.get(getDateFromParamKey(col.key))) || undefined,
                        to: parseDateValue(searchParams.get(getDateToParamKey(col.key))) || undefined,
                      }}
                      uniqueValues={uniqueValuesByColumn.get(String(col.key)) || []}
                      selectedValues={parseValuesParam(searchParams.get(getValuesParamKey(col.key)))}
                      onSortChange={(dir) => updateUrlParams({ sortKey: String(col.key), sortDir: dir })}
                      onPresenceChange={(value) => updateUrlParams({ [getPresenceParamKey(col.key)]: value })}
                      onDateRangeChange={(range) => updateUrlParams({
                        [getDateFromParamKey(col.key)]: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
                        [getDateToParamKey(col.key)]: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
                      })}
                      onValuesChange={(values) => updateUrlParams({ [getValuesParamKey(col.key)]: serializeValues(values) })}
                      onClear={() => updateUrlParams({
                        sortKey: sortKey === col.key ? null : sortKey,
                        sortDir: sortKey === col.key ? null : sortDir,
                        [getPresenceParamKey(col.key)]: null,
                        [getDateFromParamKey(col.key)]: null,
                        [getDateToParamKey(col.key)]: null,
                        [getValuesParamKey(col.key)]: null,
                      })}
                    />
                  </th>
                ))}
                <th className="w-10 px-1" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => (
                (() => {
                  const missingRequiredFields = getMissingRequiredFields(emp)
                  const missingRequiredSet = new Set<keyof EmployeeRecord>(missingRequiredFields)

                  return (
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
                          <div className="flex min-w-0 items-center gap-2">
                            {missingRequiredFields.length > 0 && (
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                                title={`Faltan: ${missingRequiredFields.map(field => REQUIRED_FIELD_LABELS[field]).join(', ')}`}
                              />
                            )}
                            <EditableCell
                              value={emp.full_name || ''}
                              onChange={v => updateField(emp.id, 'full_name', v)}
                              width={160}
                            />
                          </div>
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
                            missing={missingRequiredSet.has(col.key)}
                          />
                        </td>
                      ))}

                      {/* Actions */}
                      <td className="w-16 px-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => generateContract(emp)}
                            className="text-gray-300 hover:text-blue-500 transition-colors"
                            title="Generar Contrato"
                          >
                            <FileText className="h-3 w-3" />
                          </button>
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
                        </div>
                      </td>
                    </tr>
                  )
                })()
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
            {activeColumns.length} columnas visibles · {incompleteEmployees} con datos obligatorios faltantes
          </span>
        </div>
      )}
    </div>
  )
}

export default function HRConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-60px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <HRConfigPageContent />
    </Suspense>
  )
}
