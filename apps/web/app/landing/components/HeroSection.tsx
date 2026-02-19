"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import ScrollIndicator from "./ScrollIndicator"
import {
  CIRCLES,
  STROKE_WIDTH,
  COLOR,
  LETTER_PATHS,
} from "./logo-constants"

// Full-screen viewBox — logo appears centered at ~40% width
// Logo spans roughly x:350-730, y:370-700
const VB_START = { x: -60, y: 180, w: 1200, h: 700 }
// Zoomed into the empty center of the big circle
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

    gsap.set(phraseRef.current, { opacity: 0, y: 30 })

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

    // ViewBox zooms into center — always vector-crisp
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

    // Background turns green when fully inside the circle
    tl.to(sectionRef.current, {
      backgroundColor: "#DFD860",
      duration: 0.08,
    }, 0.32)

    // SVG fades out
    tl.to(svgRef.current, { opacity: 0, duration: 0.05 }, 0.32)

    // Phrase appears
    tl.to(phraseRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.15,
      ease: "expo.out",
    }, 0.42)

    // Hold
    tl.to({}, { duration: 0.35 }, 0.57)

    // Phrase fades
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

      {/* SVG covers the entire viewport — no clipping */}
      <svg
        ref={svgRef}
        viewBox={`${VB_START.x} ${VB_START.y} ${VB_START.w} ${VB_START.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
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

      {/* Phrase on green background */}
      <div
        ref={phraseRef}
        className="absolute inset-0 flex items-center justify-center px-8 z-10"
      >
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[#27282E] text-center leading-tight max-w-5xl">
          Nosotros amasamos,{" "}
          <br className="hidden md:block" />
          <span className="text-white">tú horneas.</span>
        </h2>
      </div>

      <div ref={scrollIndicatorRef} className="z-10">
        <ScrollIndicator />
      </div>
    </section>
  )
}
