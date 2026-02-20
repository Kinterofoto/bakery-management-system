"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Menu } from "lucide-react"

const navLinks = [
  { label: "Productos", href: "#productos" },
  { label: "Contacto", href: "#contacto" },
]

export default function NavigationBar({
  onMenuToggle,
}: {
  onMenuToggle: () => void
}) {
  const navRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    ScrollTrigger.create({
      trigger: "#hero",
      start: "bottom top",
      onEnter: () => setVisible(true),
      onLeaveBack: () => setVisible(false),
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <nav
      ref={navRef}
      className={`fixed top-4 left-4 right-4 z-40 transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <div
        className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3 rounded-full backdrop-blur-xl border border-white/20"
        style={{ backgroundColor: "rgba(231, 219, 204, 0.65)" }}
      >
        {/* Left — logo */}
        <Image
          src="/landing/logo-recortado.png"
          alt="Pastry"
          width={120}
          height={40}
          className="h-7 w-auto object-contain"
        />

        {/* Right — nav links + menu */}
        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="hidden sm:block text-sm font-medium text-[#27282E]/70 hover:text-[#27282E] transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={onMenuToggle}
            className="landing-focus flex items-center gap-2 text-[#27282E]/70 hover:text-[#27282E] transition-colors"
            aria-label="Abrir menú de navegación"
          >
            <span className="hidden sm:inline text-sm font-medium">Menú</span>
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  )
}
