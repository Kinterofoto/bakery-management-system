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
        {/* Left — hamburger + brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="landing-focus flex items-center gap-2 text-[#27282E]/70 hover:text-[#27282E] transition-colors"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <span className="text-sm font-semibold tracking-widest text-[#27282E] uppercase">
            Pastry
          </span>
        </div>

        {/* Center — logo icon */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Image
            src="/landing/icon-dark.png"
            alt="Pastry"
            width={32}
            height={32}
            className="h-6 w-6 object-contain"
          />
        </div>

        {/* Right — nav links */}
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
        </div>
      </div>
    </nav>
  )
}
