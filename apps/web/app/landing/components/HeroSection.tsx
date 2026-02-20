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

// Full-screen viewBox — matches EntryAnimation so no jump on transition
const VB_START = { x: -460, y: -45, w: 2000, h: 1170 }
// Zoomed into the empty center of the big circle
const VB_END = { x: 530, y: 448, w: 20, h: 20 }

const PHRASE_L1 = "Nosotros amasamos, "
const PHRASE_L2 = "tú horneas."

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const lettersRef = useRef<SVGGElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const phraseRef = useRef<HTMLDivElement>(null)
  const phraseH2Ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Hide phrase container, will reveal per-char
    gsap.set(phraseRef.current, { opacity: 1 })
    const chars = phraseH2Ref.current?.querySelectorAll(".char")
    if (chars) {
      gsap.set(chars, { opacity: 0, filter: "blur(8px)", y: 8 })
    }

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

    // Phrase appears — per-character with blur (right after green)
    if (chars) {
      tl.to(chars, {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        stagger: 0.003,
        duration: 0.04,
        ease: "power2.out",
      }, 0.35)
    }

    // Hold
    tl.to({}, { duration: 0.35 }, 0.57)

    // Phrase fades — per-character blur out (slower exit)
    if (chars) {
      tl.to(chars, {
        opacity: 0,
        filter: "blur(6px)",
        y: -8,
        stagger: 0.004,
        duration: 0.06,
        ease: "power2.in",
      }, 0.88)
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[#27282E] overflow-hidden"
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

      {/* Phrase on green background — per-character animation */}
      <div
        ref={phraseRef}
        className="absolute inset-0 flex items-center justify-center px-8 z-10"
      >
        <h2
          ref={phraseH2Ref}
          className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-[#27282E] text-center leading-tight max-w-5xl"
        >
          {PHRASE_L1.split("").map((c, i) => (
            <span
              key={i}
              className="char inline-block"
              style={{ willChange: "opacity, filter, transform" }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
          <br className="hidden md:block" />
          {PHRASE_L2.split("").map((c, i) => (
            <span
              key={`l2-${i}`}
              className="char inline-block text-white"
              style={{ willChange: "opacity, filter, transform" }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </h2>
      </div>

      <div ref={scrollIndicatorRef} className="z-10">
        <ScrollIndicator />
      </div>
    </section>
  )
}
