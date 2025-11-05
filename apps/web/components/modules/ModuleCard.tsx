"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, LucideIcon } from "lucide-react"
import Link from "next/link"

interface ModuleFeature {
  icon: LucideIcon
  label: string
}

interface ModuleCardProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
  bgColor: string
  hoverColor: string
  borderColor: string
  textColor: string
  features: ModuleFeature[]
  variant?: "default" | "outline"
}

export function ModuleCard({
  title,
  description,
  href,
  icon: Icon,
  bgColor,
  hoverColor,
  borderColor,
  textColor,
  features,
  variant = "default"
}: ModuleCardProps) {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg">
      <CardContent className="p-12">
        <div className="text-center">
          <div className={`mx-auto w-24 h-24 ${bgColor} rounded-full flex items-center justify-center mb-8 group-hover:${hoverColor} transition-colors`}>
            <Icon className="h-12 w-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            {description}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-gray-500">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <feature.icon className="h-4 w-4" />
                <span>{feature.label}</span>
              </div>
            ))}
          </div>

          <Link href={href}>
            {variant === "outline" ? (
              <Button 
                size="lg" 
                variant="outline" 
                className={`w-full text-lg py-6 border-2 ${borderColor} ${textColor} hover:${bgColor} hover:text-white group-hover:${borderColor.replace('border-', 'border-').replace('500', '600')}`}
              >
                Acceder a {title}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button 
                size="lg" 
                className={`w-full text-lg py-6 group-hover:${hoverColor}`}
              >
                Acceder a {title}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}