import { MessageCircle, Mail, ShoppingCart, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OrderSourceIconProps {
  source: string
  userName?: string
  className?: string
}

export function OrderSourceIcon({ source, userName, className }: OrderSourceIconProps) {
  const getSourceConfig = (source: string, userName?: string) => {
    // Debug logs temporales
    console.log("OrderSourceIcon - source:", source, "userName:", userName)
    
    // Detectar origen basado en el name del usuario
    let detectedSource = "manual"
    let displayTitle = userName || "Manual"
    
    if (source && typeof source === 'string') {
      const sourceLower = source.toLowerCase()
      if (sourceLower === "whatsapp") {
        detectedSource = "whatsapp"
        displayTitle = "WhatsApp"
      } else if (sourceLower === "outlook") {
        detectedSource = "outlook"
        displayTitle = "Outlook"
      } else if (sourceLower === "woocommerce") {
        detectedSource = "woocommerce"
        displayTitle = "WooCommerce"
      }
    }

    const config = {
      whatsapp: {
        icon: MessageCircle,
        color: "text-green-600",
        bgColor: "bg-green-100"
      },
      outlook: {
        icon: Mail,
        color: "text-blue-600", 
        bgColor: "bg-blue-100"
      },
      woocommerce: {
        icon: ShoppingCart,
        color: "text-purple-600",
        bgColor: "bg-purple-100"
      },
      manual: {
        icon: User,
        color: "text-gray-600",
        bgColor: "bg-gray-100"
      }
    }

    return {
      ...config[detectedSource as keyof typeof config] || config.manual,
      title: displayTitle
    }
  }

  const { icon: Icon, color, bgColor, title } = getSourceConfig(source, userName)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer",
              bgColor,
              className
            )}
          >
            <Icon className={cn("w-3 h-3", color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}