import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import StructuredData from "./components/StructuredData"
import "./landing.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

export const metadata: Metadata = {
  title:
    "Pastry | Panadería Congelada Premium para Hoteles, Restaurantes y Cafés en Colombia",
  description:
    "Proveedor líder de panadería congelada en Colombia. Croissants, hojaldre, pan y masas congeladas listas para hornear. Soluciones HORECA con entrega en Bogotá, Medellín, Cali, Barranquilla y Cartagena.",
  keywords: [
    "panadería congelada",
    "hojaldre congelado",
    "croissant congelado",
    "masa congelada",
    "pan ultracongelado",
    "productos de panadería congelados",
    "croissants congelados listos para hornear",
    "pan congelado para restaurantes",
    "hojaldre congelado por mayor",
    "proveedor de panadería congelada Colombia",
  ],
  alternates: {
    canonical: "https://pastrychef.com.co/landing",
  },
  openGraph: {
    title:
      "Pastry | Panadería Congelada Premium para Hoteles, Restaurantes y Cafés en Colombia",
    description:
      "Proveedor líder de panadería congelada en Colombia. Croissants, hojaldre, pan y masas congeladas listas para hornear. Soluciones HORECA con entrega en Bogotá, Medellín, Cali, Barranquilla y Cartagena.",
    type: "website",
    url: "https://pastrychef.com.co/landing",
    locale: "es_CO",
    siteName: "Pastry Chef",
    images: [
      {
        url: "https://pastrychef.com.co/landing/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Pastry — Panadería Congelada Premium en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Pastry | Panadería Congelada Premium para Hoteles, Restaurantes y Cafés en Colombia",
    description:
      "Proveedor líder de panadería congelada en Colombia. Croissants, hojaldre, pan y masas congeladas listas para hornear.",
    images: ["https://pastrychef.com.co/landing/og-image.jpg"],
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${jakarta.variable} font-sans bg-[#27282E] min-h-screen`}
    >
      <StructuredData />
      {children}
    </div>
  )
}
