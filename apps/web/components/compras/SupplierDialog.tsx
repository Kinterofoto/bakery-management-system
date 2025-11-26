"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { X } from "lucide-react"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useToast } from "@/components/ui/use-toast"

type SupplierDialogProps = {
  supplier?: any
  onClose: () => void
}

type DeliveryDays = {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

export function SupplierDialog({ supplier, onClose }: SupplierDialogProps) {
  const { createSupplier, updateSupplier } = useSuppliers()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    company_name: "",
    nit: "",
    address: "",
    contact_person_name: "",
    contact_phone: "",
    contact_email: "",
    notes: "",
    status: "active" as const
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

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (supplier) {
      setFormData({
        company_name: supplier.company_name || "",
        nit: supplier.nit || "",
        address: supplier.address || "",
        contact_person_name: supplier.contact_person_name || "",
        contact_phone: supplier.contact_phone || "",
        contact_email: supplier.contact_email || "",
        notes: supplier.notes || "",
        status: supplier.status || "active"
      })

      // Load delivery days if they exist
      if (supplier.delivery_days) {
        setDeliveryDays({
          monday: supplier.delivery_days.monday || false,
          tuesday: supplier.delivery_days.tuesday || false,
          wednesday: supplier.delivery_days.wednesday || false,
          thursday: supplier.delivery_days.thursday || false,
          friday: supplier.delivery_days.friday || false,
          saturday: supplier.delivery_days.saturday || false,
          sunday: supplier.delivery_days.sunday || false,
        })
      }
    }
  }, [supplier])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        delivery_days: deliveryDays
      }

      if (supplier) {
        // Update existing supplier
        const success = await updateSupplier(supplier.id, dataToSave)
        if (success) {
          toast({
            title: "Proveedor actualizado",
            description: "El proveedor ha sido actualizado exitosamente",
          })
          onClose()
        }
      } else {
        // Create new supplier
        const newSupplier = await createSupplier(dataToSave)
        if (newSupplier) {
          toast({
            title: "Proveedor creado",
            description: "El proveedor ha sido creado exitosamente",
          })
          onClose()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el proveedor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="
        bg-white/90 dark:bg-black/80
        backdrop-blur-2xl
        border border-white/30 dark:border-white/15
        rounded-3xl
        shadow-2xl shadow-black/20
        max-w-2xl
        w-full
        max-h-[90vh]
        overflow-hidden
      ">
        {/* Header */}
        <div className="
          bg-blue-500
          px-6 py-4
          flex items-center justify-between
        ">
          <h2 className="text-xl font-semibold text-white">
            {supplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h2>
          <button
            onClick={onClose}
            className="
              text-white
              hover:bg-white/20
              rounded-lg
              p-2
              transition-colors
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información de la Empresa</h3>

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
                Dirección
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
                "
                placeholder="Ej: Calle 123 #45-67, Bogotá"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información de Contacto</h3>

            <div>
              <Label htmlFor="contact_person_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre del Contacto
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
                "
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono
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
                  "
                  placeholder="Ej: 3001234567"
                />
              </div>

              <div>
                <Label htmlFor="contact_email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
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
                  "
                  placeholder="Ej: contacto@empresa.com"
                />
              </div>
            </div>
          </div>

          {/* Delivery Days */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Días de Entrega</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Seleccione los días en los que el proveedor realiza entregas
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
                      : 'bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 hover:border-blue-500/50'
                    }
                  `}
                  onClick={() => handleDayToggle(key as keyof DeliveryDays)}
                >
                  <Checkbox
                    id={key}
                    checked={deliveryDays[key as keyof DeliveryDays]}
                    readOnly
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
              rows={3}
              className="
                mt-1.5
                bg-white/50 dark:bg-black/30
                backdrop-blur-md
                border-gray-200/50 dark:border-white/10
                rounded-xl
                focus:ring-2 focus:ring-blue-500/50
                focus:border-blue-500/50
              "
              placeholder="Información adicional sobre el proveedor..."
            />
          </div>

        </form>

        {/* Footer */}
        <div className="
          bg-gray-50/50 dark:bg-white/5
          backdrop-blur-sm
          px-6 py-4
          flex justify-end gap-3
        ">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="
              bg-white/20 dark:bg-black/20
              backdrop-blur-md
              border border-white/30 dark:border-white/20
              rounded-xl
              hover:bg-white/30 dark:hover:bg-black/30
            "
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="
              bg-blue-500
              text-white
              font-semibold
              px-6
              rounded-xl
              shadow-md shadow-blue-500/30
              hover:bg-blue-600
              hover:shadow-lg hover:shadow-blue-500/40
              active:scale-95
              transition-all duration-150
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Guardando..." : (supplier ? "Actualizar" : "Crear")}
          </Button>
        </div>

      </div>
    </div>
  )
}
