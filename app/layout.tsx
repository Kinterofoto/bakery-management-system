import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { PWAInstaller } from "@/components/pwa-installer"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

export const metadata: Metadata = {
  title: "PastryApp - Sistema de Gestión",
  description: "Sistema integral de gestión para PastryApp",
  applicationName: "PastryApp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PastryApp",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          <PWAInstaller />
          <PWAInstallPrompt />
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
