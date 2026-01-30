"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#27282E] via-gray-800 to-[#27282E]">
      {/* Logo */}
      <div className="mb-12">
        <img
          src="/logo_recortado.png"
          alt="PastryChef Logo"
          className="h-32 w-auto md:h-40"
        />
      </div>

      {/* Main Title */}
      <div className="text-center mb-12 px-4">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
          PastryChef
        </h1>
        <p className="text-xl md:text-2xl text-[#DFD860] font-light">
          Sistema Integral de Gestión Empresarial
        </p>
      </div>

      {/* CTA Button */}
      <Link href="/login">
        <Button
          size="lg"
          className="bg-[#DFD860] hover:bg-yellow-400 text-[#27282E] font-semibold text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          Ingresar al Sistema
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-gray-400 text-sm">
          © 2026 PastryChef. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
