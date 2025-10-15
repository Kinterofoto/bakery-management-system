import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"

export const metadata: Metadata = {
  title: "PastryApp - Sistema de Gestión",
  description: "Sistema integral de gestión para PastryApp",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
          <SonnerToaster 
            position="top-right" 
            richColors 
            closeButton
            duration={4000}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
