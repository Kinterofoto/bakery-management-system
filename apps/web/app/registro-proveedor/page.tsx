"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, Building2, User, Calendar, FileText, ArrowRight, ArrowLeft, Check } from "lucide-react"

type DeliveryDays = {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

const STEPS = [
  { id: 1, title: "Empresa", icon: Building2 },
  { id: 2, title: "Contacto", icon: User },
  { id: 3, title: "Entregas", icon: Calendar },
  { id: 4, title: "Revisión", icon: FileText },
]

export default function RegistroProveedorPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    company_name: "",
    nit: "",
    address: "",
    contact_person_name: "",
    contact_phone: "",
    contact_email: "",
    notes: "",
  })

  const [deliveryDays, setDeliveryDays] = useState<DeliveryDays>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  })

  const dayLabels = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
  }


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleDayToggle = (day: keyof DeliveryDays) => {
    setDeliveryDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }))
  }

  const validateStep = (step: number): { valid: boolean; message?: string } => {
    switch (step) {
      case 1:
        if (!formData.company_name.trim()) return { valid: false, message: "El nombre de la empresa es requerido" }
        if (!formData.nit.trim()) return { valid: false, message: "El NIT es requerido" }
        if (!formData.address.trim()) return { valid: false, message: "La dirección es requerida" }
        return { valid: true }

      case 2:
        if (!formData.contact_person_name.trim()) return { valid: false, message: "El nombre del contacto es requerido" }
        if (!formData.contact_phone.trim()) return { valid: false, message: "El teléfono es requerido" }
        if (!formData.contact_email.trim()) return { valid: false, message: "El email es requerido" }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.contact_email)) return { valid: false, message: "El email no es válido" }
        return { valid: true }

      case 3:
        const hasDeliveryDay = Object.values(deliveryDays).some(day => day)
        if (!hasDeliveryDay) return { valid: false, message: "Debe seleccionar al menos un día de entrega" }
        return { valid: true }

      default:
        return { valid: true }
    }
  }

  const handleNext = () => {
    const validation = validateStep(currentStep)
    if (!validation.valid) {
      setError(validation.message || "Por favor complete todos los campos")
      return
    }
    setError(null)
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
  }

  const handlePrevious = () => {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: existingSupplier } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('id')
        .eq('nit', formData.nit)
        .maybeSingle()

      if (existingSupplier) {
        throw new Error('Ya existe un proveedor registrado con este NIT')
      }

      const { error: supplierError } = await supabase
        .schema('compras')
        .from('suppliers')
        .insert([{
          ...formData,
          delivery_days: deliveryDays,
          status: 'active'
        }])

      if (supplierError) throw supplierError

      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting form:', err)
      setError(err instanceof Error ? err.message : 'Error al enviar el formulario')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSubmitted(false)
    setCurrentStep(1)
    setFormData({
      company_name: "",
      nit: "",
      address: "",
      contact_person_name: "",
      contact_phone: "",
      contact_email: "",
      notes: "",
    })
    setDeliveryDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    })
    setError(null)
  }

  if (submitted) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-white/30 dark:border-white/15 rounded-3xl shadow-2xl shadow-black/10 max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            ¡Registro Exitoso!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Gracias por registrarse como proveedor. Nuestro equipo revisará su información y se pondrá en contacto con usted pronto.
          </p>
          <Button
            onClick={resetForm}
            className="bg-blue-500 text-white font-semibold px-6 py-2 rounded-xl shadow-md shadow-blue-500/30 hover:bg-blue-600"
          >
            Registrar Otro Proveedor
          </Button>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <Building2 className="w-10 h-10 text-blue-500 mx-auto mb-1" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Información de la Empresa</h2>
            </div>

            <div>
              <Label htmlFor="company_name" className="text-xs font-medium text-gray-700 dark:text-gray-300">Nombre de la Empresa *</Label>
              <Input
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-10 text-sm"
                placeholder="Ej: Distribuidora ABC S.A."
              />
            </div>

            <div>
              <Label htmlFor="nit" className="text-xs font-medium text-gray-700 dark:text-gray-300">NIT *</Label>
              <Input
                id="nit"
                name="nit"
                value={formData.nit}
                onChange={handleChange}
                className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-10 text-sm"
                placeholder="Ej: 900123456-7"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-xs font-medium text-gray-700 dark:text-gray-300">Dirección *</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-10 text-sm"
                placeholder="Ej: Calle 123 #45-67, Bogotá"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <User className="w-10 h-10 text-blue-500 mx-auto mb-1" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Información de Contacto</h2>
            </div>

            <div>
              <Label htmlFor="contact_person_name" className="text-xs font-medium text-gray-700 dark:text-gray-300">Nombre del Contacto *</Label>
              <Input
                id="contact_person_name"
                name="contact_person_name"
                value={formData.contact_person_name}
                onChange={handleChange}
                className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-10 text-sm"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone" className="text-xs font-medium text-gray-700 dark:text-gray-300">Teléfono *</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                type="tel"
                className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-10 text-sm"
                placeholder="Ej: 3001234567"
              />
            </div>

            <div>
              <Label htmlFor="contact_email" className="text-xs font-medium text-gray-700 dark:text-gray-300">Email *</Label>
              <Input
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                type="email"
                className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-xl h-10 text-sm"
                placeholder="Ej: contacto@empresa.com"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <Calendar className="w-10 h-10 text-blue-500 mx-auto mb-1" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Días de Entrega</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(dayLabels).map(([key, label]) => (
                <div
                  key={key}
                  className={`
                    flex items-center space-x-2 p-2 rounded-lg border-2 cursor-pointer transition-all
                    ${deliveryDays[key as keyof DeliveryDays]
                      ? 'bg-blue-500/20 border-blue-500 dark:bg-blue-500/30'
                      : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10'
                    }
                  `}
                  onClick={() => handleDayToggle(key as keyof DeliveryDays)}
                >
                  <Checkbox
                    id={key}
                    checked={deliveryDays[key as keyof DeliveryDays]}
                    onCheckedChange={() => handleDayToggle(key as keyof DeliveryDays)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={key} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        const selectedDays = Object.entries(deliveryDays)
          .filter(([_, value]) => value)
          .map(([key]) => dayLabels[key as keyof typeof dayLabels])

        return (
          <div className="flex flex-col h-full min-h-0">
            <div className="text-center mb-2">
              <FileText className="w-10 h-10 text-blue-500 mx-auto mb-1" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Revisión</h2>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-lg p-2">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1 flex items-center">
                  <Building2 className="w-3 h-3 mr-1" />Empresa
                </h3>
                <div className="space-y-0.5 text-xs">
                  <p className="truncate"><span className="font-medium">Nombre:</span> {formData.company_name}</p>
                  <p className="truncate"><span className="font-medium">NIT:</span> {formData.nit}</p>
                  <p className="truncate"><span className="font-medium">Dirección:</span> {formData.address}</p>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-lg p-2">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1 flex items-center">
                  <User className="w-3 h-3 mr-1" />Contacto
                </h3>
                <div className="space-y-0.5 text-xs">
                  <p className="truncate"><span className="font-medium">Nombre:</span> {formData.contact_person_name}</p>
                  <p className="truncate"><span className="font-medium">Teléfono:</span> {formData.contact_phone}</p>
                  <p className="truncate"><span className="font-medium">Email:</span> {formData.contact_email}</p>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-lg p-2">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />Días
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selectedDays.map((day) => (
                    <span key={day} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-xs font-medium text-gray-700 dark:text-gray-300">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 bg-white/50 dark:bg-black/30 backdrop-blur-md border-gray-200/50 dark:border-white/10 rounded-lg text-xs"
                  placeholder="Información adicional..."
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-3 md:p-4 min-h-0">

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Registro de Proveedores</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Panadería Industrial</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-2">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center transition-all
                        ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}
                      `}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <p className={`text-xs mt-0.5 hidden sm:block ${isCurrent ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl p-3 md:p-4 flex flex-col min-h-0 overflow-hidden">

          {/* Error Message */}
          {error && (
            <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-xs text-red-800 dark:text-red-200 mb-2">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-200/30">
            <Button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              variant="ghost"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Anterior
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-md hover:bg-blue-600"
              >
                Siguiente
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Enviar
                  </>
                )}
              </Button>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
