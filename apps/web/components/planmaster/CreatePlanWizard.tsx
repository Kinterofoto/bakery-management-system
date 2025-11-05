"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  Circle,
  ArrowLeft,
  ArrowRight,
  Save,
  Lock
} from "lucide-react"

// Import step components
import { DemandAggregationStep } from "./wizard-steps/DemandAggregationStep"
import { DeliveryAnalysisStep } from "./wizard-steps/DeliveryAnalysisStep"
import { ConflictDetectionStep } from "./wizard-steps/ConflictDetectionStep"
import { ConflictResolutionStep } from "./wizard-steps/ConflictResolutionStep"
import { PriorityManagementStep } from "./wizard-steps/PriorityManagementStep"
import { ProductionOrdersStep } from "./wizard-steps/ProductionOrdersStep"
import { CapacityFillingStep } from "./wizard-steps/CapacityFillingStep"
import { SavePlanStep } from "./wizard-steps/SavePlanStep"
import { MaterialExplosionStep } from "./wizard-steps/MaterialExplosionStep"
import { MaterialCalendarStep } from "./wizard-steps/MaterialCalendarStep"
import { WeeklyReviewStep } from "./wizard-steps/WeeklyReviewStep"
import { FinalConfirmationStep } from "./wizard-steps/FinalConfirmationStep"

interface CreatePlanWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface WizardStep {
  id: number
  title: string
  description: string
  component: React.ComponentType<any>
  category: 'planning' | 'execution' | 'materials' | 'finalization'
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "Master Production Schedule",
    description: "MPS: Plan de producción diario sugerido por producto",
    component: DemandAggregationStep,
    category: 'planning'
  },
  {
    id: 2,
    title: "Análisis de Fechas",
    description: "Revisar fechas de entrega y quiebras de stock",
    component: DeliveryAnalysisStep,
    category: 'planning'
  },
  {
    id: 3,
    title: "Detección de Conflictos",
    description: "Identificar problemas de MP, personal y maquinaria",
    component: ConflictDetectionStep,
    category: 'planning'
  },
  {
    id: 4,
    title: "Resolución de Conflictos",
    description: "Resolver incumplimientos detectados",
    component: ConflictResolutionStep,
    category: 'planning'
  },
  {
    id: 5,
    title: "Priorización",
    description: "Definir prioridad de pedidos y clientes",
    component: PriorityManagementStep,
    category: 'planning'
  },
  {
    id: 6,
    title: "Generación de OPs",
    description: "Crear órdenes de producción automáticamente",
    component: ProductionOrdersStep,
    category: 'execution'
  },
  {
    id: 7,
    title: "Llenado de Capacidad",
    description: "Optimizar uso de capacidad disponible",
    component: CapacityFillingStep,
    category: 'execution'
  },
  {
    id: 8,
    title: "Guardar Plan",
    description: "Confirmar y guardar plan de producción",
    component: SavePlanStep,
    category: 'execution'
  },
  {
    id: 9,
    title: "Explosión de Materiales",
    description: "Calcular requerimientos de materia prima (MRP)",
    component: MaterialExplosionStep,
    category: 'materials'
  },
  {
    id: 10,
    title: "Calendario de MP",
    description: "Programar llegadas de materia prima",
    component: MaterialCalendarStep,
    category: 'materials'
  },
  {
    id: 11,
    title: "Revisión Semanal",
    description: "Verificar cumplimiento y ajustes",
    component: WeeklyReviewStep,
    category: 'finalization'
  },
  {
    id: 12,
    title: "Dejar en Firme",
    description: "Confirmación final y lock del plan",
    component: FinalConfirmationStep,
    category: 'finalization'
  }
]

export function CreatePlanWizard({ open, onOpenChange }: CreatePlanWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [planData, setPlanData] = useState<any>({}) // Store wizard data

  const progress = (currentStep / WIZARD_STEPS.length) * 100
  const currentStepData = WIZARD_STEPS.find(s => s.id === currentStep)
  const StepComponent = currentStepData?.component

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])])
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepId: number) => {
    // Only allow jumping to completed steps or next step
    if (completedSteps.includes(stepId - 1) || stepId === 1) {
      setCurrentStep(stepId)
    }
  }

  const handleFinish = () => {
    console.log("Plan finalizado:", planData)
    onOpenChange(false)
    // Here would be the API call to save the plan
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'planning':
        return 'bg-blue-500'
      case 'execution':
        return 'bg-green-500'
      case 'materials':
        return 'bg-purple-500'
      case 'finalization':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Helper function to get week number
  const getWeekNumber = (date: Date) => {
    const d = new Date(date.getTime())
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
    const week1 = new Date(d.getFullYear(), 0, 4)
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] overflow-hidden flex flex-col p-0 m-0 rounded-none">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Crear Plan de Producción</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Paso {currentStep} de {WIZARD_STEPS.length}: {currentStepData?.title}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Semana {getWeekNumber(new Date())} - {new Date().getFullYear()}
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Collapsible Steps Navigator */}
          <div className="group w-12 hover:w-64 border-r bg-gray-50 overflow-y-auto transition-all duration-200 ease-in-out">
            <div className="p-2 space-y-1">
              {WIZARD_STEPS.map((step) => {
                const isActive = step.id === currentStep
                const isCompleted = completedSteps.includes(step.id)
                const isAccessible = completedSteps.includes(step.id - 1) || step.id === 1

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isAccessible && !isCompleted}
                    className={`
                      w-full text-left p-2 rounded-lg transition-all relative
                      ${isActive ? 'bg-blue-100 border-blue-300 border-2' : 'border border-transparent'}
                      ${isCompleted && !isActive ? 'bg-green-50' : ''}
                      ${!isAccessible && !isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}
                    `}
                  >
                    {/* Collapsed view - Just number */}
                    <div className="flex items-center justify-center group-hover:hidden">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${isActive ? 'bg-blue-600 text-white' :
                          isCompleted ? 'bg-green-600 text-white' :
                          'bg-gray-300 text-gray-700'}
                      `}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
                      </div>
                    </div>

                    {/* Expanded view on hover */}
                    <div className="hidden group-hover:flex items-start gap-2">
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}
                          `}>
                            {step.id}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500">
                            PASO {step.id}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(step.category)}`} />
                        </div>
                        <p className={`text-sm font-medium mt-1 ${
                          isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                        }`}>
                          {step.title}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col">
            {StepComponent && (
              <StepComponent
                planData={planData}
                onDataChange={setPlanData}
              />
            )}
          </div>
        </div>

        {/* Footer - Navigation */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < WIZARD_STEPS.length && (
              <Button onClick={handleNext}>
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 8 && (
              <Button onClick={handleNext} variant="default" className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Guardar Plan
              </Button>
            )}

            {currentStep === WIZARD_STEPS.length && (
              <Button onClick={handleFinish} variant="default" className="bg-orange-600 hover:bg-orange-700">
                <Lock className="w-4 h-4 mr-2" />
                Dejar en Firme
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
