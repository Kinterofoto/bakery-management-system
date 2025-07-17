import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
// Add the Toaster component to the layout
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
