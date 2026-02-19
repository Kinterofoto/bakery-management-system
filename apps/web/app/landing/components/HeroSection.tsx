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

// ViewBox start and end for the zoom-through animation
// Start: full logo view
const VB_START = { x: 240, y: 370, w: 600, h: 340 }
// End: zoomed into the empty center of the big circle
// Center circle: cx=540, cy=458, r=78, strokeWidth=11
// Inner empty radius = 78 - 5.5 = 72.5
// Zoom to a tiny area in the center — the circle stroke goes off-screen
const VB_END = { x: 530, y: 448, w: 20, h: 20 }

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const lettersRef = useRef<SVGGElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const phraseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Phrase starts hidden
    gsap.set(phraseRef.current, { opacity: 0, y: 30 })

    // Proxy object for viewBox animation
    const vb = { ...VB_START }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=200%",
        scrub: 1,
        pin: true,
      },
    })

    // Scroll indicator fades immediately
    tl.to(scrollIndicatorRef.current, { opacity: 0, duration: 0.05 }, 0)

    // Letters fade out early
    tl.to(lettersRef.current, { opacity: 0, duration: 0.08 }, 0)

    // ViewBox zooms into center — vector-quality at all sizes
    tl.to(vb, {
      x: VB_END.x,
      y: VB_END.y,
      w: VB_END.w,
      h: VB_END.h,
      duration: 0.35,
      ease: "power3.in",
      onUpdate: () => {
        svgRef.current?.setAttribute(
          "viewBox",
          `${vb.x} ${vb.y} ${vb.w} ${vb.h}`
        )
      },
    }, 0)

    // Background turns green only when fully inside the circle
    tl.to(sectionRef.current, {
      backgroundColor: "#DFD860",
      duration: 0.08,
    }, 0.32)

    // SVG fades out (we're now on solid green)
    tl.to(svgRef.current, { opacity: 0, duration: 0.05 }, 0.32)

    // Phrase appears big on the green background
    tl.to(phraseRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.15,
      ease: "expo.out",
    }, 0.42)

    // Hold the phrase
    tl.to({}, { duration: 0.35 }, 0.57)

    // Phrase fades out
    tl.to(phraseRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.1,
    }, 0.92)

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
      <div className="flex flex-col items-center select-none">
        <svg
          ref={svgRef}
          viewBox={VIEWBOX}
          className={`${LOGO_SIZE_CLASSES} will-change-[viewBox]`}
          aria-label="Pastry"
        >
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

      {/* Manifesto phrase — appears after zoom-through */}
      <div
        ref={phraseRef}
        className="absolute inset-0 flex items-center justify-center px-8"
      >
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[#27282E] text-center leading-tight max-w-5xl">
          Nosotros amasamos,{" "}
          <br className="hidden md:block" />
          <span className="text-white">tú horneas.</span>
        </h2>
      </div>

      <div ref={scrollIndicatorRef}>
        <ScrollIndicator />
      </div>
    </section>
  )
}
