"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { Package, CheckCircle2, Building2 } from "lucide-react"

type DeliveryDays = {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export default function RegistroProveedorPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materials, setMaterials] = useState<any[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())

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
  useState(() => {
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
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate at least one delivery day is selected
      const hasDeliveryDay = Object.values(deliveryDays).some(day => day)
      if (!hasDeliveryDay) {
        throw new Error('Debe seleccionar al menos un día de entrega')
      }

      // Validate at least one material is selected
      if (selectedMaterials.size === 0) {
        throw new Error('Debe seleccionar al menos un material que suministra')
      }

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
        unit_price: 0, // The admin will update this later
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
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
        ">
          <div className="mb-6">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              ¡Registro Exitoso!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Gracias por registrarse como proveedor. Nuestro equipo revisará su información y se pondrá en contacto con usted pronto.
            </p>
          </div>
          <Button
            onClick={() => {
              setSubmitted(false)
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
            }}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="w-12 h-12 text-blue-500 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Registro de Proveedores
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Complete el formulario para registrarse como proveedor de Panadería Industrial
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="
          bg-white/70 dark:bg-black/50
          backdrop-blur-xl
          border border-white/20 dark:border-white/10
          rounded-3xl
          shadow-2xl shadow-black/10
          p-8
          space-y-8
        ">

          {/* Error Message */}
          {error && (
            <div className="
              bg-red-50/80 dark:bg-red-900/20
              border border-red-200 dark:border-red-800
              rounded-xl
              p-4
              text-red-800 dark:text-red-200
            ">
              {error}
            </div>
          )}

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Información de la Empresa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre de la Empresa *
                </Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-blue-500/50
                    focus:border-blue-500/50
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
                  required
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-blue-500/50
                    focus:border-blue-500/50
                  "
                  placeholder="Ej: 900123456-7"
                />
              </div>
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
                required
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                "
                placeholder="Ej: Calle 123 #45-67, Bogotá"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Información de Contacto
            </h3>

            <div>
              <Label htmlFor="contact_person_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre del Contacto *
              </Label>
              <Input
                id="contact_person_name"
                name="contact_person_name"
                value={formData.contact_person_name}
                onChange={handleChange}
                required
                className="
                  mt-1.5
                  bg-white/50 dark:bg-black/30
                  backdrop-blur-md
                  border-gray-200/50 dark:border-white/10
                  rounded-xl
                  focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                "
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  required
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-blue-500/50
                    focus:border-blue-500/50
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
                  required
                  className="
                    mt-1.5
                    bg-white/50 dark:bg-black/30
                    backdrop-blur-md
                    border-gray-200/50 dark:border-white/10
                    rounded-xl
                    focus:ring-2 focus:ring-blue-500/50
                    focus:border-blue-500/50
                  "
                  placeholder="Ej: contacto@empresa.com"
                />
              </div>
            </div>
          </div>

          {/* Delivery Days */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Días de Entrega *
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Seleccione los días en los que puede realizar entregas
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(dayLabels).map(([key, label]) => (
                <div
                  key={key}
                  className={`
                    flex items-center space-x-2
                    p-3 rounded-xl
                    border-2
                    cursor-pointer
                    transition-all duration-150
                    ${deliveryDays[key as keyof DeliveryDays]
                      ? 'bg-blue-500/20 border-blue-500 dark:bg-blue-500/30'
                      : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10'
                    }
                    hover:border-blue-500/50
                  `}
                  onClick={() => handleDayToggle(key as keyof DeliveryDays)}
                >
                  <Checkbox
                    id={key}
                    checked={deliveryDays[key as keyof DeliveryDays]}
                    onCheckedChange={() => handleDayToggle(key as keyof DeliveryDays)}
                  />
                  <Label
                    htmlFor={key}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Materiales que Suministra *
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Seleccione los materiales que puede suministrar
            </p>

            {loadingMaterials ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Cargando materiales...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className={`
                      flex items-start space-x-3
                      p-4 rounded-xl
                      border-2
                      cursor-pointer
                      transition-all duration-150
                      ${selectedMaterials.has(material.id)
                        ? 'bg-green-500/20 border-green-500 dark:bg-green-500/30'
                        : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10'
                      }
                      hover:border-green-500/50
                    `}
                    onClick={() => handleMaterialToggle(material.id)}
                  >
                    <Checkbox
                      id={material.id}
                      checked={selectedMaterials.has(material.id)}
                      onCheckedChange={() => handleMaterialToggle(material.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={material.id}
                        className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer block"
                      >
                        {material.name}
                      </Label>
                      {material.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {material.description}
                        </p>
                      )}
                      {material.unit && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Unidad: {material.unit}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notas Adicionales
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="
                mt-1.5
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border-gray-200/50 dark:border-white/10
                rounded-xl
                focus:ring-2 focus:ring-blue-500/50
                focus:border-blue-500/50
              "
              placeholder="Información adicional que desee compartir..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={loading || loadingMaterials}
              className="
                bg-blue-500
                text-white
                font-semibold
                px-8 py-4
                text-lg
                rounded-xl
                shadow-lg shadow-blue-500/30
                hover:bg-blue-600
                hover:shadow-xl hover:shadow-blue-500/40
                active:scale-95
                transition-all duration-150
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? "Enviando..." : "Registrar Proveedor"}
            </Button>
          </div>

        </form>

      </div>
    </div>
  )
}
