"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const navLinks = [
  { label: "Productos", href: "#productos" },
  { label: "Nosotros", href: "#manifesto" },
  { label: "Contacto", href: "#contacto" },
]

export default function NavigationBar({
  onMenuToggle,
}: {
  onMenuToggle: () => void
}) {
  const headerRef = useRef<HTMLElement>(null)
  const [sticky, setSticky] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    ScrollTrigger.create({
      trigger: "#hero",
      start: "bottom top",
      onEnter: () => setSticky(true),
      onLeaveBack: () => setSticky(false),
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
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-40 flex flex-col items-center pointer-events-none">
      {/* Logo — centered, fades out on scroll */}
      <Image
        src="/landing/logo-recortado.png"
        alt="Pastry"
        width={120}
        height={50}
        className={`mt-6 h-10 w-auto object-contain pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.075,0.82,0.165,1)] ${
          sticky ? "opacity-0 scale-75 -translate-y-4" : "opacity-100 scale-100 translate-y-0"
        }`}
      />

      {/* Nav pill — collapses to circle on scroll */}
      <div
        className={`mt-4 flex items-center justify-center pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.075,0.82,0.165,1)] backdrop-blur-md border border-white/10 ${
          sticky
            ? "w-14 h-14 rounded-full px-0 py-0 mt-5 bg-black/30"
            : "w-auto rounded-full px-6 py-3 bg-white/5"
        }`}
      >
        {/* Links — visible when not sticky */}
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleNavClick(e, link.href)}
            className={`text-sm font-semibold text-white/80 hover:text-white lowercase tracking-wider transition-all duration-500 ease-[cubic-bezier(0.075,0.82,0.165,1)] ${
              sticky
                ? "opacity-0 scale-50 w-0 px-0 overflow-hidden"
                : "opacity-100 scale-100 px-4 py-2"
            }`}
          >
            {link.label}
          </a>
        ))}

        {/* Hamburger button — visible when sticky */}
        <button
          onClick={onMenuToggle}
          className={`flex flex-col items-center justify-center gap-[5px] transition-all duration-500 ease-[cubic-bezier(0.075,0.82,0.165,1)] ${
            sticky
              ? "opacity-100 scale-100 w-14 h-14"
              : "opacity-0 scale-0 w-0 h-0 overflow-hidden"
          }`}
          aria-label="Abrir menú de navegación"
        >
          <span className="block w-5 h-[1.5px] bg-white transition-all duration-500" />
          <span className="block w-5 h-[1.5px] bg-white transition-all duration-500" />
        </button>
      </div>
    </header>
  )
}
