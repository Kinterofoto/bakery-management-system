import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./landing.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pastry — Nosotros amasamos, tú horneas",
  description:
    "Productos de panadería congelada premium, 100% hechos en Colombia. Soluciones para hoteles, restaurantes y cafés.",
  openGraph: {
    title: "Pastry — Nosotros amasamos, tú horneas",
    description:
      "Productos de panadería congelada premium, 100% hechos en Colombia. Soluciones para hoteles, restaurantes y cafés.",
    type: "website",
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${jakarta.variable} font-sans`}>
      {children}
    </div>
  )
}
