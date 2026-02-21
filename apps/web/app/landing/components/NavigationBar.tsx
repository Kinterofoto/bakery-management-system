"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export default function NavigationBar({
  menuOpen,
  onMenuToggle,
}: {
  menuOpen: boolean
  onMenuToggle: () => void
}) {
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.create({
      trigger: "#hero",
      start: "bottom top",
      onEnter: () => setPastHero(true),
      onLeaveBack: () => setPastHero(false),
    })
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  const logoVisible = pastHero || menuOpen

  return (
    <>
      {/* Floating logo — top left, 30 % bigger than before */}
      <div
        className={`fixed top-5 left-5 sm:top-6 sm:left-8 z-[60] transition-all duration-500 ${
          logoVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <Image
          src="/landing/logo-recortado.png"
          alt="Pastry"
          width={200}
          height={67}
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Floating glass ball — top right */}
      <button
        onClick={onMenuToggle}
        className="landing-focus fixed top-5 right-5 sm:top-6 sm:right-8 z-[60] w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: menuOpen
            ? "rgba(231, 219, 204, 0.4)"
            : "rgba(231, 219, 204, 0.65)",
        }}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú de navegación"}
        aria-expanded={menuOpen}
      >
        {/* Hamburger ↔ X  */}
        <div className="w-[18px] h-[14px] relative flex flex-col justify-between">
          {/* Top line */}
          <span
            className="block h-[2px] w-full rounded-full origin-center"
            style={{
              backgroundColor: "#27282E",
              transition:
                "transform 0.45s cubic-bezier(0.16,1,0.3,1), width 0.3s cubic-bezier(0.16,1,0.3,1)",
              transform: menuOpen
                ? "translateY(6px) rotate(45deg)"
                : "translateY(0) rotate(0deg)",
            }}
          />
          {/* Middle line */}
          <span
            className="block h-[2px] rounded-full origin-center"
            style={{
              backgroundColor: "#27282E",
              transition:
                "opacity 0.2s ease, transform 0.2s ease",
              opacity: menuOpen ? 0 : 1,
              transform: menuOpen ? "scaleX(0)" : "scaleX(1)",
              width: "70%",
              alignSelf: "flex-end",
            }}
          />
          {/* Bottom line */}
          <span
            className="block h-[2px] w-full rounded-full origin-center"
            style={{
              backgroundColor: "#27282E",
              transition:
                "transform 0.45s cubic-bezier(0.16,1,0.3,1), width 0.3s cubic-bezier(0.16,1,0.3,1)",
              transform: menuOpen
                ? "translateY(-6px) rotate(-45deg)"
                : "translateY(0) rotate(0deg)",
            }}
          />
        </div>
      </button>
    </>
  )
}
