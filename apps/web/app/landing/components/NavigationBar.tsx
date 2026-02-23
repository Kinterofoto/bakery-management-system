"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/*
 * Both logo and button use mix-blend-mode: difference with #FFFF8E.
 * Per-pixel color adaptation against any background:
 *   on #27282E (dark)  → #D8D760 (yellow-green)
 *   on #E7DBCC (beige) → #18243E (dark)
 *   on #DFD860 (yellow)→ #20272E (≈ #27282E)
 *
 * Hover: text flips to #000000 which, after difference blend, becomes
 * the background color — naturally inverting over the #FFFF8E fill.
 */

export default function NavigationBar() {
  const [pastHero, setPastHero] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

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

  const vis = pastHero
    ? "opacity-100 translate-y-0"
    : "opacity-0 -translate-y-4 pointer-events-none"

  return (
    <>
      {/* ── Logo ── */}
      <div
        className={`fixed top-5 left-5 sm:top-6 sm:left-8 z-[60] transition-all duration-500 ${vis}`}
        style={{ mixBlendMode: "difference" }}
      >
        <div
          className="h-12"
          style={{
            backgroundColor: "#FFFF8E",
            WebkitMaskImage: "url(/landing/logo-dark.png)",
            maskImage: "url(/landing/logo-dark.png)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "left center",
            maskPosition: "left center",
            aspectRatio: "2446 / 1376",
          }}
          role="img"
          aria-label="Pastry"
        />
      </div>

      {/* ── Comprar pill ── */}
      <div
        className={`fixed top-6 right-5 sm:top-7 sm:right-8 z-[60] transition-all duration-500 ${vis}`}
        style={{ mixBlendMode: "difference" }}
      >
        <Link
          href="/ecommerce"
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          className="landing-focus inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase overflow-hidden relative"
          style={{
            border: "1.5px solid #FFFF8E",
            color: btnHovered ? "#000000" : "#FFFF8E",
            transition: "color 0.4s ease",
          }}
        >
          {/* Slide-in fill */}
          <span
            className="absolute inset-0 rounded-full origin-left"
            style={{
              backgroundColor: "#FFFF8E",
              transform: btnHovered ? "scaleX(1)" : "scaleX(0)",
              transition:
                "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
          <span className="relative z-10">Comprar</span>
        </Link>
      </div>
    </>
  )
}
