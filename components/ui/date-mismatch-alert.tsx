import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle } from "lucide-react"

interface DateMismatchAlertProps {
  requestedDate?: string | null
  expectedDate: string
  className?: string
}

export function DateMismatchAlert({ requestedDate, expectedDate, className = "" }: DateMismatchAlertProps) {
  // Only show if both dates exist and are different
  if (!requestedDate || requestedDate === expectedDate) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className={`text-xs cursor-help ${className}`}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Fecha ajustada
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-1 text-xs">
            <p className="font-medium">Fecha ajustada por frecuencia del cliente</p>
            <p><span className="font-medium">Solicitada:</span> {requestedDate}</p>
            <p><span className="font-medium">Confirmada:</span> {expectedDate}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}