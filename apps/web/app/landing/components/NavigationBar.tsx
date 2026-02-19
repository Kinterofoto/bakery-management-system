"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Menu } from "lucide-react"

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

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-40 glass-blur transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-full pointer-events-none"
      }`}
      style={{ backgroundColor: "rgba(10, 10, 10, 0.8)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Image
          src="/landing/logo-recortado.png"
          alt="Pastry"
          width={120}
          height={40}
          className="h-8 w-auto object-contain brightness-0 invert"
        />
        <button
          onClick={onMenuToggle}
          className="landing-focus flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <span className="hidden sm:inline text-sm tracking-wide">Menú</span>
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </nav>
  )
}
