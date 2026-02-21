"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// CSS filter that turns a dark image into approx #DFD860
const YELLOW_FILTER =
  "brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(-8deg) brightness(0.88)"

export default function NavigationBar() {
  const [pastHero, setPastHero] = useState(false)
  const [onLightBg, setOnLightBg] = useState(true)
  const [btnHovered, setBtnHovered] = useState(false)
  const rafRef = useRef(0)

  // Detect when we scroll past the hero section
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

  // Sample the real rendered background color behind the nav
  const sampleBackground = useCallback(() => {
    rafRef.current = 0
    const els = document.elementsFromPoint(window.innerWidth / 2, 60)

    for (const el of els) {
      if (el.closest("[data-nav-floating]")) continue
      const bg = getComputedStyle(el).backgroundColor
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue

      const match = bg.match(/(\d+)/g)
      if (match) {
        const [r, g, b] = match.map(Number)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        setOnLightBg(lum > 100)
      }
      break
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(sampleBackground)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    const timer = setTimeout(sampleBackground, 200)

    return () => {
      window.removeEventListener("scroll", onScroll)
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [sampleBackground])

  // Palette
  const textColor = onLightBg ? "#27282E" : "#DFD860"
  const fillColor = onLightBg ? "#27282E" : "#DFD860"
  const fillTextColor = onLightBg ? "#FAFAFA" : "#27282E"

  return (
    <>
      {/* ── Floating logo — top left ── */}
      <div
        data-nav-floating
        className={`fixed top-5 left-5 sm:top-6 sm:left-8 z-[60] transition-all duration-500 ${
          pastHero
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {/* Single image, color toggled via CSS filter */}
        <Image
          src="/landing/logo-dark.png"
          alt="Pastry"
          width={200}
          height={67}
          className="h-12 w-auto object-contain"
          style={{
            filter: onLightBg ? "none" : YELLOW_FILTER,
            transition: "filter 0.5s ease",
          }}
        />
      </div>

      {/* ── "Comprar" pill — top right ── */}
      <Link
        data-nav-floating
        href="/ecommerce"
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        className={`landing-focus fixed top-6 right-5 sm:top-7 sm:right-8 z-[60]
          inline-flex items-center justify-center
          rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase
          overflow-hidden
          ${
            pastHero
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        style={{
          border: `1.5px solid ${textColor}`,
          color: btnHovered ? fillTextColor : textColor,
          transition: "opacity 0.5s, transform 0.5s, color 0.4s, border-color 0.5s",
        }}
      >
        {/* Slide-in fill */}
        <span
          className="absolute inset-0 rounded-full origin-left"
          style={{
            backgroundColor: fillColor,
            transform: btnHovered ? "scaleX(1)" : "scaleX(0)",
            transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1), background-color 0.5s",
          }}
        />
        <span className="relative z-10">Comprar</span>
      </Link>
    </>
  )
}
