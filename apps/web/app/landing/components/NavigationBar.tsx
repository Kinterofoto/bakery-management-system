"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

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

  // Sample the real rendered background at a point behind the nav
  const sampleBackground = useCallback(() => {
    rafRef.current = 0
    // Sample at center-x, 60px from top — avoids our fixed elements
    const els = document.elementsFromPoint(window.innerWidth / 2, 60)

    for (const el of els) {
      // Skip our own fixed nav wrapper
      if (el.closest("[data-nav-floating]")) continue
      // Skip elements with no real background
      const bg = getComputedStyle(el).backgroundColor
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue

      const match = bg.match(/(\d+)/g)
      if (match) {
        const [r, g, b] = match.map(Number)
        // Perceived luminance
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
    // Initial check after sections mount
    const timer = setTimeout(sampleBackground, 200)

    return () => {
      window.removeEventListener("scroll", onScroll)
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [sampleBackground])

  // Palette swap
  const textColor = onLightBg ? "#27282E" : "#DFD860"
  const borderColor = onLightBg
    ? "rgba(39,40,46,0.35)"
    : "rgba(223,216,96,0.45)"
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
        <div className="relative h-12 w-40">
          {/* Dark version (for light backgrounds) */}
          <Image
            src="/landing/logo-dark.png"
            alt="Pastry"
            width={200}
            height={67}
            className={`h-12 w-auto object-contain absolute top-0 left-0 transition-opacity duration-500 ${
              onLightBg ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Yellow version (for dark backgrounds) */}
          <Image
            src="/landing/logo-yellow.png"
            alt=""
            width={200}
            height={67}
            className={`h-12 w-auto object-contain absolute top-0 left-0 transition-opacity duration-500 ${
              onLightBg ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden
          />
        </div>
      </div>

      {/* ── "Comprar" pill — top right ── */}
      <Link
        data-nav-floating
        href="/ecommerce"
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        className={`landing-focus fixed top-6 right-5 sm:top-7 sm:right-8 z-[60]
          rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase
          border overflow-hidden relative
          transition-all duration-500
          ${
            pastHero
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        style={{
          borderColor,
          color: btnHovered ? fillTextColor : textColor,
        }}
      >
        {/* Slide-in fill */}
        <span
          className={`absolute inset-0 rounded-full origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            btnHovered ? "scale-x-100" : "scale-x-0"
          }`}
          style={{ backgroundColor: fillColor }}
        />
        <span className="relative z-10">Comprar</span>
      </Link>
    </>
  )
}
