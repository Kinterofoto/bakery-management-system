"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Sections with light backgrounds (yellow / beige)
const LIGHT_SECTIONS = [
  "#manifesto",
  "#productos",
  "#compromisos",
  "#contacto",
  "#newsletter",
]

export default function NavigationBar() {
  const [pastHero, setPastHero] = useState(false)
  const [onLightBg, setOnLightBg] = useState(true) // first section after hero is light
  const [btnHovered, setBtnHovered] = useState(false)

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

  // Observe light sections to swap nav colors
  useEffect(() => {
    const visible = new Set<Element>()
    const els = LIGHT_SECTIONS.map((s) => document.querySelector(s)).filter(
      Boolean
    ) as Element[]

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        })
        setOnLightBg(visible.size > 0)
      },
      { rootMargin: "0px 0px -85% 0px" }
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

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
        className={`fixed top-5 left-5 sm:top-6 sm:left-8 z-[60] transition-all duration-500 ${
          pastHero
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="relative h-12">
          {/* Dark version (for light backgrounds) */}
          <Image
            src="/landing/logo-dark.png"
            alt="Pastry"
            width={200}
            height={67}
            className={`h-12 w-auto object-contain transition-opacity duration-500 ${
              onLightBg ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Yellow version (for dark backgrounds) */}
          <Image
            src="/landing/logo-yellow.png"
            alt=""
            width={200}
            height={67}
            className={`h-12 w-auto object-contain absolute inset-0 transition-opacity duration-500 ${
              onLightBg ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden
          />
        </div>
      </div>

      {/* ── "Comprar" pill — top right ── */}
      <Link
        href="/ecommerce"
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        className={`landing-focus fixed top-5 right-5 sm:top-6 sm:right-8 z-[60]
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
