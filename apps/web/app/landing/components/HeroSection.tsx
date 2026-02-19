"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import ScrollIndicator from "./ScrollIndicator"
import {
  CIRCLES,
  STROKE_WIDTH,
  COLOR,
  VIEWBOX,
  LOGO_SIZE_CLASSES,
  LETTER_PATHS,
} from "./logo-constants"

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const logoWrapperRef = useRef<HTMLDivElement>(null)
  const lettersRef = useRef<SVGGElement>(null)
  const circlesRef = useRef<SVGGElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Transform origin at center circle position in the SVG
    // Center circle at (540,458) in viewBox "240 370 600 340"
    // x: (540-240)/600 = 50%, y: (458-370)/340 = 25.9%
    if (logoWrapperRef.current) {
      logoWrapperRef.current.style.transformOrigin = "50% 26%"
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=150%",
        scrub: 1,
        pin: true,
      },
    })

    // Scroll indicator fades out immediately
    tl.to(
      scrollIndicatorRef.current,
      { opacity: 0, duration: 0.1 },
      0
    )

    // Letters fade out early
    tl.to(
      lettersRef.current,
      { opacity: 0, duration: 0.15 },
      0
    )

    // Logo zooms in — fast acceleration into the center circle
    tl.to(
      logoWrapperRef.current,
      { scale: 25, duration: 1, ease: "power2.in" },
      0
    )

    // Background transitions to green pastry
    tl.to(
      sectionRef.current,
      { backgroundColor: "#DFD860", duration: 0.4 },
      0.35
    )

    // Circles fade out as they get huge
    tl.to(
      circlesRef.current,
      { opacity: 0, duration: 0.25 },
      0.5
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center bg-[#27282E] overflow-hidden"
    >
      <h1 className="sr-only">Pastry — Panadería congelada premium</h1>
      <div
        ref={logoWrapperRef}
        className="flex flex-col items-center select-none will-change-transform"
      >
        <svg
          viewBox={VIEWBOX}
          className={LOGO_SIZE_CLASSES}
          aria-label="Pastry"
        >
          <g ref={circlesRef}>
            {CIRCLES.map((c, i) => (
              <circle
                key={i}
                cx={c.cx}
                cy={c.cy}
                r={c.r}
                fill="none"
                stroke={COLOR}
                strokeWidth={STROKE_WIDTH}
              />
            ))}
          </g>
          <g ref={lettersRef}>
            {LETTER_PATHS.map((d, i) => (
              <path
                key={`letter-${i}`}
                d={d}
                fill={COLOR}
                fillRule="nonzero"
              />
            ))}
          </g>
        </svg>
      </div>
      <div ref={scrollIndicatorRef}>
        <ScrollIndicator />
      </div>
    </section>
  )
}
