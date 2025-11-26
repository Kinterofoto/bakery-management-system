"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { Package, CheckCircle2, Building2, User, Calendar, FileText, ArrowRight, ArrowLeft, Check, Search } from "lucide-react"

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
  { id: 1, title: "Empresa", icon: Building2, description: "Información de la empresa" },
  { id: 2, title: "Contacto", icon: User, description: "Datos de contacto" },
  { id: 3, title: "Entregas", icon: Calendar, description: "Días de entrega" },
  { id: 4, title: "Materiales", icon: Package, description: "Productos que suministra" },
  { id: 5, title: "Revisión", icon: FileText, description: "Confirmar información" },
]

export default function RegistroProveedorPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materials, setMaterials] = useState<any[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())
  const [materialSearch, setMaterialSearch] = useState("")

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

  // Load materials on mount
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        setLoadingMaterials(true)
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or('category.eq.mp,category.eq.MP')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) throw error
        setMaterials(data || [])
      } catch (err) {
        console.error('Error loading materials:', err)
      } finally {
        setLoadingMaterials(false)
      }
    }
    loadMaterials()
  }, [])

  // Filter materials based on search
  const filteredMaterials = useMemo(() => {
    if (!materialSearch.trim()) return materials
    const searchLower = materialSearch.toLowerCase()
    return materials.filter(m =>
      m.name.toLowerCase().includes(searchLower) ||
      m.description?.toLowerCase().includes(searchLower)
    )
  }, [materials, materialSearch])

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

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev)
      if (newSet.has(materialId)) {
        newSet.delete(materialId)
      } else {
        newSet.add(materialId)
      }
      return newSet
    })
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

      case 4:
        if (selectedMaterials.size === 0) return { valid: false, message: "Debe seleccionar al menos un material" }
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
      // Check if NIT already exists
      const { data: existingSupplier } = await supabase
        .schema('compras')
        .from('suppliers')
        .select('id')
        .eq('nit', formData.nit)
        .single()

      if (existingSupplier) {
        throw new Error('Ya existe un proveedor registrado con este NIT')
      }

      // Create supplier
      const { data: supplier, error: supplierError } = await supabase
        .schema('compras')
        .from('suppliers')
        .insert([{
          ...formData,
          delivery_days: deliveryDays,
          status: 'active'
        }])
        .select()
        .single()

      if (supplierError) throw supplierError

      // Create material assignments
      const materialAssignments = Array.from(selectedMaterials).map(materialId => ({
        supplier_id: supplier.id,
        material_id: materialId,
        unit_price: 0,
        status: 'active',
        is_preferred: false
      }))

      const { error: assignmentsError } = await supabase
        .schema('compras')
        .from('material_suppliers')
        .insert(materialAssignments)

      if (assignmentsError) throw assignmentsError

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
    setSelectedMaterials(new Set())
    setMaterialSearch("")
    setError(null)
  }

  if (submitted) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="
          bg-white/90 dark:bg-black/80
          backdrop-blur-2xl
          border border-white/30 dark:border-white/15
          rounded-3xl
          shadow-2xl shadow-black/10
          max-w-md
          w-full
          p-8
          text-center
          animate-in fade-in zoom-in duration-500
        ">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              ¡Registro Exitoso!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Gracias por registrarse como proveedor. Nuestro equipo revisará su información y se pondrá en contacto con usted pronto.
            </p>
          </div>
          <Button
            onClick={resetForm}
            className="
              bg-blue-500
              text-white
              font-semibold
              px-6 py-3
              rounded-xl
              shadow-md shadow-blue-500/30
              hover:bg-blue-600
              hover:shadow-lg hover:shadow-blue-500/40
              active:scale-95
              transition-all duration-150
            "
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-4">
              <Building2 className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Información de la Empresa
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Ingrese los datos básicos de su empresa
              </p>
            </div>

            <div>
              <Label htmlFor="company_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre de la Empresa *
              </Label>
              <Input
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  h-12
                "
                placeholder="Ej: Distribuidora ABC S.A."
              />
            </div>

            <div>
              <Label htmlFor="nit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                NIT *
              </Label>
              <Input
                id="nit"
                name="nit"
                value={formData.nit}
                onChange={handleChange}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  h-12
                "
                placeholder="Ej: 900123456-7"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dirección *
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  h-12
                "
                placeholder="Ej: Calle 123 #45-67, Bogotá"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-4">
              <User className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Información de Contacto
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ¿Cómo podemos comunicarnos con usted?
              </p>
            </div>

            <div>
              <Label htmlFor="contact_person_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre del Contacto *
              </Label>
              <Input
                id="contact_person_name"
                name="contact_person_name"
                value={formData.contact_person_name}
                onChange={handleChange}
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  h-12
                "
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Teléfono *
              </Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                type="tel"
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  h-12
                "
                placeholder="Ej: 3001234567"
              />
            </div>

            <div>
              <Label htmlFor="contact_email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email *
              </Label>
              <Input
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                type="email"
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  h-12
                "
                placeholder="Ej: contacto@empresa.com"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-4">
              <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Días de Entrega
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Seleccione los días en los que puede realizar entregas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(dayLabels).map(([key, label]) => (
                <div
                  key={key}
                  className={`
                    flex items-center space-x-2
                    p-3 rounded-xl
                    border-2
                    cursor-pointer
                    transition-all duration-200
                    ${deliveryDays[key as keyof DeliveryDays]
                      ? 'bg-blue-500/20 border-blue-500 dark:bg-blue-500/30 scale-105'
                      : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 hover:border-blue-500/50'
                    }
                  `}
                  onClick={() => handleDayToggle(key as keyof DeliveryDays)}
                >
                  <Checkbox
                    id={key}
                    checked={deliveryDays[key as keyof DeliveryDays]}
                    onCheckedChange={() => handleDayToggle(key as keyof DeliveryDays)}
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={key}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex-1"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-3">
              <Package className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Materiales que Suministra
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Seleccione los materiales que puede proveer
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar material..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="
                    pl-10
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-blue-500/50
                    focus:border-blue-500/50
                    h-10
                  "
                />
              </div>
            </div>

            {loadingMaterials ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Cargando materiales...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`
                        flex items-start space-x-2
                        p-3 rounded-xl
                        border-2
                        cursor-pointer
                        transition-all duration-200
                        ${selectedMaterials.has(material.id)
                          ? 'bg-green-500/20 border-green-500 dark:bg-green-500/30'
                          : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 hover:border-green-500/50'
                        }
                      `}
                      onClick={() => handleMaterialToggle(material.id)}
                    >
                      <Checkbox
                        id={material.id}
                        checked={selectedMaterials.has(material.id)}
                        onCheckedChange={() => handleMaterialToggle(material.id)}
                        className="h-4 w-4 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={material.id}
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer block"
                        >
                          {material.name}
                        </Label>
                        {material.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {material.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No se encontraron materiales
                    </div>
                  )}
                </div>

                <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200/30 dark:border-white/10">
                  {selectedMaterials.size} material{selectedMaterials.size !== 1 ? 'es' : ''} seleccionado{selectedMaterials.size !== 1 ? 's' : ''}
                </div>
              </>
            )}
          </div>
        )

      case 5:
        const selectedDays = Object.entries(deliveryDays)
          .filter(([_, value]) => value)
          .map(([key]) => dayLabels[key as keyof typeof dayLabels])

        const selectedMaterialsList = materials.filter(m => selectedMaterials.has(m.id))

        return (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
            <div className="text-center mb-3">
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Revisión Final
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Verifique que toda la información sea correcta
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {/* Company Info */}
              <div className="
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-gray-200/50 dark:border-white/10
                rounded-xl
                p-3
              ">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Empresa
                </h3>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Nombre:</span> {formData.company_name}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">NIT:</span> {formData.nit}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Dirección:</span> {formData.address}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-gray-200/50 dark:border-white/10
                rounded-xl
                p-3
              ">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Contacto
                </h3>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Nombre:</span> {formData.contact_person_name}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Teléfono:</span> {formData.contact_phone}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Email:</span> {formData.contact_email}</p>
                </div>
              </div>

              {/* Delivery Days */}
              <div className="
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-gray-200/50 dark:border-white/10
                rounded-xl
                p-3
              ">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Días de Entrega
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selectedDays.map((day) => (
                    <span key={day} className="px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              {/* Materials */}
              <div className="
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border border-gray-200/50 dark:border-white/10
                rounded-xl
                p-3
              ">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Materiales ({selectedMaterialsList.length})
                </h3>
                <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                  {selectedMaterialsList.map((material) => (
                    <div key={material.id} className="text-xs text-gray-700 dark:text-gray-300 flex items-center">
                      <Check className="w-3 h-3 text-green-500 mr-1 flex-shrink-0" />
                      <span className="truncate">{material.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notas Adicionales (Opcional)
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-blue-500/50
                    focus:border-blue-500/50
                    text-sm
                  "
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
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">

        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Registro de Proveedores
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Panadería Industrial
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-4">
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
                        w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="mt-1 text-center hidden md:block">
                      <p className={`text-xs font-medium ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`
                        h-1 flex-1 mx-2 rounded-full
                        transition-all duration-300
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Container */}
        <div className="
          flex-1
          bg-white/70 dark:bg-black/50
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          rounded-3xl
          shadow-2xl shadow-black/10
          p-4 md:p-6
          flex flex-col
          overflow-hidden
        ">

          {/* Error Message */}
          {error && (
            <div className="
              bg-red-50/80 dark:bg-red-900/20
              border border-red-200 dark:border-red-800
              rounded-xl
              p-3
              text-sm
              text-red-800 dark:text-red-200
              mb-3
              animate-in fade-in slide-in-from-top duration-300
            ">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-200/30 dark:border-white/10">
            <Button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              variant="ghost"
              className="
                px-4 py-2
                rounded-xl
                text-sm
                font-semibold
                disabled:opacity-50
                disabled:cursor-not-allowed
                hover:bg-gray-100 dark:hover:bg-white/10
              "
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                className="
                  bg-blue-500
                  text-white
                  font-semibold
                  px-6 py-2
                  rounded-xl
                  text-sm
                  shadow-md shadow-blue-500/30
                  hover:bg-blue-600
                  hover:shadow-lg hover:shadow-blue-500/40
                  active:scale-95
                  transition-all duration-150
                "
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="
                  bg-green-500
                  text-white
                  font-semibold
                  px-6 py-2
                  rounded-xl
                  text-sm
                  shadow-md shadow-green-500/30
                  hover:bg-green-600
                  hover:shadow-lg hover:shadow-green-500/40
                  active:scale-95
                  transition-all duration-150
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Enviar Registro
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
