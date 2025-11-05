"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, ArrowLeft, ArrowRight, Check, User, Phone, MessageSquare, ChevronsUpDown, CheckIcon, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProgressBar } from "@/components/visitas/ProgressBar"
import { ProductEvalCard } from "@/components/visitas/ProductEvalCard"
import { PhotoUpload } from "@/components/visitas/PhotoUpload"
import { useStoreVisits } from "@/hooks/use-store-visits"
import { useClients } from "@/hooks/use-clients"
import { useBranches } from "@/hooks/use-branches"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ProductEval {
  product_id: string
  has_stock: boolean
  score_baking?: number
  score_display?: number
  score_presentation?: number
  score_taste?: number
  storage_temperature?: number
  score_staff_training?: number
  score_baking_params?: number
  comments?: string
  photos?: File[]
}

export default function NewVisitPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const { createVisit, getProductsSoldToClientBranch } = useStoreVisits()
  const { clients } = useClients()
  const { branches } = useBranches()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 data
  const [clientId, setClientId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [openClientCombobox, setOpenClientCombobox] = useState(false)
  const [openBranchCombobox, setOpenBranchCombobox] = useState(false)

  // Step 2 data
  const [products, setProducts] = useState<any[]>([])
  const [evaluations, setEvaluations] = useState<Record<string, ProductEval>>({})

  // Step 3 data
  const [operatorName, setOperatorName] = useState("")
  const [operatorPhone, setOperatorPhone] = useState("")
  const [generalComments, setGeneralComments] = useState("")
  const [generalPhotos, setGeneralPhotos] = useState<File[]>([])

  const clientBranches = branches.filter(b => b.client_id === clientId)

  // Auto-select main branch if client has only one branch
  useEffect(() => {
    if (clientId && clientBranches.length === 1) {
      setBranchId(clientBranches[0].id)
    }
  }, [clientId, clientBranches])

  // Load products when client/branch selected
  useEffect(() => {
    if (clientId && branchId) {
      loadProducts()
    }
  }, [clientId, branchId])

  const loadProducts = async () => {
    try {
      const productsData = await getProductsSoldToClientBranch(clientId, branchId || undefined)
      setProducts(productsData)

      // Initialize evaluations
      const initialEvals: Record<string, ProductEval> = {}
      productsData.forEach(product => {
        initialEvals[product.id] = {
          product_id: product.id,
          has_stock: false
        }
      })
      setEvaluations(initialEvals)
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      })
    }
  }

  const handleNext = async () => {
    // Validation
    if (currentStep === 1) {
      if (!clientId) {
        toast({
          title: "Cliente requerido",
          description: "Por favor selecciona un cliente",
          variant: "destructive"
        })
        return
      }
      if (!branchId) {
        toast({
          title: "Sucursal requerida",
          description: "Por favor selecciona una sucursal",
          variant: "destructive"
        })
        return
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      await handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Prepare evaluations data
      const evaluationsData = Object.values(evaluations)
        .filter(evaluation => evaluation.has_stock) // Only include products with stock

      if (evaluationsData.length === 0) {
        toast({
          title: "Sin productos evaluados",
          description: "Debes evaluar al menos un producto con existencias",
          variant: "destructive"
        })
        return
      }

      await createVisit({
        client_id: clientId,
        branch_id: branchId,
        visit_date: new Date().toISOString().split('T')[0],
        operator_name: operatorName || undefined,
        operator_phone: operatorPhone || undefined,
        general_comments: generalComments || undefined,
        evaluations: evaluationsData,
        general_photos: generalPhotos.length > 0 ? generalPhotos : undefined
      })

      toast({
        title: "¡Visita registrada!",
        description: "La visita se ha guardado correctamente",
      })

      router.push("/visitas")
    } catch (error: any) {
      console.error("Error creating visit:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la visita",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/visitas">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 hover:text-teal-600 transition-colors">
                  PastryApp
                </h1>
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-sm md:text-base text-gray-600">
                Paso {currentStep} de 3
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/visitas")}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4">
            <ProgressBar currentStep={currentStep} totalSteps={3} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Cliente y Sucursal */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                ¿A quién visitas?
              </h2>
              <p className="text-gray-600">
                Selecciona el cliente y la sucursal
              </p>
            </div>

            <Card className="border-2 border-gray-200">
              <CardContent className="p-8 space-y-6">
                {/* Cliente Combobox */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientCombobox}
                        className="w-full h-14 justify-between text-lg font-normal"
                      >
                        {clientId
                          ? clients.find((client) => client.id === clientId)?.name
                          : "Buscar y seleccionar cliente..."}
                        <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." className="h-12 text-base" />
                        <CommandList>
                          <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => {
                                  setClientId(client.id)
                                  setBranchId("") // Reset branch when client changes
                                  setOpenClientCombobox(false)
                                }}
                                className="text-base py-3"
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    clientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sucursal Combobox */}
                {clientId && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">
                      Sucursal <span className="text-red-500">*</span>
                    </Label>
                    {clientBranches.length > 0 ? (
                      <Popover open={openBranchCombobox} onOpenChange={setOpenBranchCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBranchCombobox}
                            className="w-full h-14 justify-between text-lg font-normal"
                          >
                            {branchId
                              ? clientBranches.find((branch) => branch.id === branchId)?.name
                              : "Buscar y seleccionar sucursal..."}
                            <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[600px] p-0" align="start" side="bottom">
                          <Command>
                            <CommandInput placeholder="Buscar sucursal..." className="h-12 text-base" />
                            <CommandList>
                              <CommandEmpty>No se encontraron sucursales.</CommandEmpty>
                              <CommandGroup>
                                {clientBranches.map((branch) => (
                                  <CommandItem
                                    key={branch.id}
                                    value={branch.name}
                                    onSelect={() => {
                                      setBranchId(branch.id)
                                      setOpenBranchCombobox(false)
                                    }}
                                    className="text-base py-3"
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        branchId === branch.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {branch.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50">
                        <p className="text-sm text-amber-800 font-medium">
                          ⚠️ Este cliente no tiene sucursales registradas
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Por favor, crea sucursales desde la configuración de clientes antes de registrar una visita.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Evaluación de Productos */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Evalúa los productos
              </h2>
              <p className="text-gray-600">
                Marca cuáles tienen existencias y califícalos
              </p>
            </div>

            <div className="space-y-4">
              {products.length > 0 ? (
                products.map(product => (
                  <ProductEvalCard
                    key={product.id}
                    product={product}
                    evaluation={evaluations[product.id]}
                    onChange={(newEval) => {
                      setEvaluations({
                        ...evaluations,
                        [product.id]: newEval
                      })
                    }}
                  />
                ))
              ) : (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600">
                      No se encontraron productos vendidos a este cliente/sucursal
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Información Final */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Información adicional
              </h2>
              <p className="text-gray-600">
                Detalles del operador y comentarios generales
              </p>
            </div>

            <Card className="border-2 border-gray-200">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="general-comments" className="text-base font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    Comentarios del operador de tienda
                  </Label>
                  <Textarea
                    id="general-comments"
                    value={generalComments}
                    onChange={(e) => setGeneralComments(e.target.value)}
                    rows={4}
                    className="text-base resize-none"
                    placeholder="Observaciones generales de la visita..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operator-name" className="text-base font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-600" />
                    Nombre del operador
                  </Label>
                  <Input
                    id="operator-name"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Nombre completo..."
                    className="h-14 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operator-phone" className="text-base font-semibold flex items-center gap-2">
                    <Phone className="h-5 w-5 text-gray-600" />
                    Teléfono del operador
                  </Label>
                  <Input
                    id="operator-phone"
                    type="tel"
                    value={operatorPhone}
                    onChange={(e) => setOperatorPhone(e.target.value)}
                    placeholder="Número de teléfono..."
                    className="h-14 text-lg"
                  />
                </div>

                <div className="pt-4">
                  <PhotoUpload
                    photos={generalPhotos}
                    onPhotosChange={setGeneralPhotos}
                    multiple
                    label="📷 Agregar fotos generales de la visita"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-white border-t shadow-lg p-6 -mx-4 sm:-mx-6 lg:-mx-8 mt-8">
          <div className="max-w-4xl mx-auto flex gap-4">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-14 text-lg font-semibold"
                disabled={loading}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Anterior
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={`flex-1 h-14 text-lg font-semibold ${
                currentStep === 3
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
              disabled={loading}
            >
              {loading ? (
                "Guardando..."
              ) : currentStep === 3 ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Finalizar Visita
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
