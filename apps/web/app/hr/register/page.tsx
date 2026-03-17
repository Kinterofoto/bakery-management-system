'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'select' | 'date'
  options?: string[]
  required?: boolean
  placeholder?: string
}

const FIELD_SECTIONS: { title: string; icon: string; fields: FieldDef[] }[] = [
  {
    title: 'Datos Básicos', icon: '📋',
    fields: [
      { key: 'full_name', label: 'Nombre Completo', type: 'text', required: true, placeholder: 'Ej: Juan Carlos Pérez López' },
      { key: 'company', label: 'Empresa', type: 'select', required: true, options: ['PASTRY CHEF', 'PASTRYCOL'] },
      { key: 'document_type', label: 'Tipo de Identificación', type: 'select', required: true, options: ['CC', 'PPT', 'CE', 'TI', 'PA'] },
      { key: 'document_number', label: 'Número de Identificación', type: 'text', required: true, placeholder: 'Ej: 1234567890' },
      { key: 'position', label: 'Cargo', type: 'text', placeholder: 'Ej: Panadero' },
    ],
  },
  {
    title: 'Datos Personales', icon: '👤',
    fields: [
      { key: 'birth_date', label: 'Fecha de Nacimiento', type: 'date', required: true },
      { key: 'birth_place', label: 'Lugar de Nacimiento', type: 'text', placeholder: 'Ej: Bogotá' },
      { key: 'gender', label: 'Género', type: 'select', required: true, options: ['Masculino', 'Femenino', 'Otro'] },
      { key: 'blood_type', label: 'Tipo de Sangre', type: 'select', required: true, options: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] },
      { key: 'phone', label: 'Celular', type: 'text', required: true, placeholder: 'Ej: 3001234567' },
      { key: 'email', label: 'Correo Electrónico', type: 'text', required: true, placeholder: 'Ej: juan@email.com' },
      { key: 'marital_status', label: 'Estado Civil', type: 'select', options: ['Solter@', 'Casad@', 'Unión Libre', 'Divorciad@', 'Viud@'] },
      { key: 'smokes', label: '¿Fuma?', type: 'select', options: ['No', 'Si', 'Ocasionalmente'] },
    ],
  },
  {
    title: 'Vivienda', icon: '🏠',
    fields: [
      { key: 'address', label: 'Dirección', type: 'text', required: true, placeholder: 'Ej: Calle 123 #45-67' },
      { key: 'neighborhood', label: 'Barrio', type: 'text', placeholder: 'Ej: Chapinero' },
      { key: 'locality', label: 'Localidad', type: 'text', placeholder: 'Ej: Chapinero' },
      { key: 'housing_type', label: 'Tipo de Vivienda', type: 'select', options: ['Propia', 'Arrendada', 'Familiar'] },
      { key: 'estrato', label: 'Estrato', type: 'select', options: ['1', '2', '3', '4', '5', '6'] },
    ],
  },
  {
    title: 'Formación y Banco', icon: '🎓',
    fields: [
      { key: 'education_level', label: 'Nivel de Escolaridad', type: 'select', options: ['Primaria completa', 'Primaria incompleta', 'Bachiller completo', 'Bachiller incompleto', 'Técnico', 'Tecnólogo', 'Profesional'] },
      { key: 'bank', label: 'Banco', type: 'text', placeholder: 'Ej: Bancolombia' },
      { key: 'bank_account', label: 'Número de Cuenta', type: 'text', placeholder: 'Ej: 123-456789-00' },
    ],
  },
  {
    title: 'Seguridad Social', icon: '🏥',
    fields: [
      { key: 'eps', label: 'EPS', type: 'text', placeholder: 'Ej: Sura' },
      { key: 'pension_fund', label: 'Fondo de Pensión', type: 'text', placeholder: 'Ej: Protección' },
      { key: 'severance_fund', label: 'Fondo de Cesantías', type: 'text', placeholder: 'Ej: Porvenir' },
    ],
  },
  {
    title: 'Salud', icon: '❤️',
    fields: [
      { key: 'is_allergic', label: '¿Es alérgico?', type: 'select', options: ['No', 'Si'] },
      { key: 'allergy_details', label: 'Detalle de Alergia', type: 'text', placeholder: 'Si aplica, describa...' },
      { key: 'has_disease', label: '¿Tiene alguna enfermedad?', type: 'select', options: ['No', 'Si'] },
      { key: 'disease_details', label: 'Detalle de Enfermedad', type: 'text', placeholder: 'Si aplica, describa...' },
      { key: 'has_disability', label: '¿Tiene alguna discapacidad?', type: 'select', options: ['No', 'Si'] },
      { key: 'disability_details', label: 'Detalle de Discapacidad', type: 'text', placeholder: 'Si aplica, describa...' },
    ],
  },
  {
    title: 'Dependientes', icon: '👨‍👩‍👧',
    fields: [
      { key: 'has_dependents_company', label: '¿Personas a cargo en la empresa?', type: 'select', options: ['No', 'Si'] },
      { key: 'is_head_household', label: '¿Cabeza de hogar?', type: 'select', options: ['No', 'Si'] },
      { key: 'has_dependents_home', label: '¿Personas a cargo en el hogar?', type: 'select', options: ['No', 'Si'] },
      { key: 'num_dependents', label: 'Número de dependientes', type: 'text', placeholder: 'Ej: 2' },
    ],
  },
  {
    title: 'Contacto de Emergencia', icon: '🚨',
    fields: [
      { key: 'emergency_contact_name', label: 'Nombre del Contacto', type: 'text', required: true, placeholder: 'Ej: María López' },
      { key: 'emergency_contact_relationship', label: 'Parentesco', type: 'text', required: true, placeholder: 'Ej: Madre' },
      { key: 'emergency_contact_phone', label: 'Teléfono de Emergencia', type: 'text', required: true, placeholder: 'Ej: 3009876543' },
    ],
  },
  {
    title: 'Hijos', icon: '👶',
    fields: [
      { key: 'has_children', label: '¿Tiene hijos?', type: 'select', options: ['No', 'Si'] },
      { key: 'num_children', label: 'Número de hijos', type: 'text', placeholder: 'Ej: 2' },
      { key: 'child1_name', label: 'Hijo 1 - Nombre completo', type: 'text', placeholder: 'Nombre del hijo/a' },
      { key: 'child1_birthdate', label: 'Hijo 1 - Fecha de nacimiento', type: 'date' },
      { key: 'child2_name', label: 'Hijo 2 - Nombre completo', type: 'text', placeholder: 'Nombre del hijo/a' },
      { key: 'child2_birthdate', label: 'Hijo 2 - Fecha de nacimiento', type: 'date' },
      { key: 'child3_name', label: 'Hijo 3 - Nombre completo', type: 'text', placeholder: 'Nombre del hijo/a' },
      { key: 'child3_birthdate', label: 'Hijo 3 - Fecha de nacimiento', type: 'date' },
    ],
  },
  {
    title: 'Dotación', icon: '👕',
    fields: [
      { key: 'pants_size', label: 'Talla de Pantalón', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'shirt_size', label: 'Talla de Blusón', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'boots_size', label: 'Talla de Botas', type: 'text', placeholder: 'Ej: 40' },
    ],
  },
]

export default function EmployeeRegisterPage() {
  const [formData, setFormData] = useState<Record<string, string>>({
    company: 'PASTRY CHEF',
    smokes: 'No',
    is_allergic: 'No',
    has_disease: 'No',
    has_disability: 'No',
    has_dependents_company: 'No',
    is_head_household: 'No',
    has_dependents_home: 'No',
    has_children: 'No',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const requiredFields = FIELD_SECTIONS.flatMap(s => s.fields).filter(f => f.required)
    const missing = requiredFields.filter(f => !formData[f.key]?.trim())
    if (missing.length > 0) {
      toast.error(`Campos obligatorios faltantes: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('employee_directory')
        .insert({
          ...formData,
          status: 'Activo',
        })

      if (error) throw error

      setSubmitted(true)
      toast.success('Registro exitoso')
    } catch (err: any) {
      toast.error('Error al registrarse: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registro Exitoso</h2>
          <p className="text-gray-500">
            Tu información ha sido registrada correctamente. El equipo de Recursos Humanos revisará tus datos.
          </p>
          <p className="text-sm text-gray-400 mt-4">Ya puedes cerrar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
            <span className="text-2xl">🏭</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Empleado</h1>
          <p className="text-gray-500 mt-1">Completa tus datos personales para registrarte en el sistema</p>
          <p className="text-xs text-gray-400 mt-1">Los campos marcados con * son obligatorios</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {FIELD_SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">
                  {section.icon} {section.title}
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map(field => (
                  <div key={field.key} className={field.key === 'address' || field.key === 'full_name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <Select
                        value={formData[field.key] || ''}
                        onValueChange={v => updateField(field.key, v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'date' ? (
                      <Input
                        type="date"
                        className="h-9 text-sm"
                        value={formData[field.key] || ''}
                        onChange={e => updateField(field.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        className="h-9 text-sm"
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={e => updateField(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            Enviar Registro
          </Button>

          <p className="text-center text-xs text-gray-400 pb-4">
            Al enviar este formulario, tu información será almacenada de forma segura en nuestro sistema de Recursos Humanos.
          </p>
        </form>
      </div>
    </div>
  )
}
