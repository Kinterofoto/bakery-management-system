import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Serif_Display, Outfit } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { PWAInstaller } from "@/components/pwa-installer"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

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
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#f9fafb',
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
    <html lang="es" className={`${dmSerif.variable} ${outfit.variable}`}>
      <body className="font-sans">
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
          <SpeedInsights />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
