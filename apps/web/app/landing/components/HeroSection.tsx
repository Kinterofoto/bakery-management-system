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
import GrainTexture from "./GrainTexture"

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
  const gradientRef = useRef<HTMLDivElement>(null)
  const greenGradientRef = useRef<HTMLDivElement>(null)
  const grainWrapRef = useRef<HTMLDivElement>(null)
  const ovalRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Hide phrase container + green gradient, will reveal per-char
    gsap.set(phraseRef.current, { opacity: 1 })
    gsap.set(greenGradientRef.current, { opacity: 0 })
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

    // SVG + dark gradient fade out, green gradient fades in
    tl.to(svgRef.current, { opacity: 0, duration: 0.05 }, 0.32)
    tl.to(gradientRef.current, { opacity: 0, duration: 0.05 }, 0.32)
    tl.to(greenGradientRef.current, { opacity: 1, duration: 0.08 }, 0.32)
    // Boost grain on bright background so it stays visible
    tl.to(grainWrapRef.current, { opacity: 3, duration: 0.08 }, 0.32)

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

    // Hand-drawn oval around "horneas" draws on
    if (ovalRef.current) {
      const len = ovalRef.current.getTotalLength()
      gsap.set(ovalRef.current, { strokeDasharray: len, strokeDashoffset: len })
      tl.to(ovalRef.current, {
        strokeDashoffset: 0,
        duration: 0.12,
        ease: "power2.out",
      }, 0.50)
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
      if (ovalRef.current) {
        tl.to(ovalRef.current, { opacity: 0, duration: 0.06 }, 0.88)
      }
    }

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
      <div ref={grainWrapRef} className="absolute inset-0 z-[4]">
        <GrainTexture id="grain-hero" />
      </div>

      {/* Gradient overlay — lighter/darker zones of the same dark */}
      <div
        ref={gradientRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 0% 0%, rgba(54, 56, 64, 0.9) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 0%, rgba(46, 47, 54, 0.7) 0%, transparent 45%),
            radial-gradient(ellipse at 100% 100%, rgba(53, 54, 61, 0.8) 0%, transparent 50%),
            radial-gradient(ellipse at 0% 100%, rgba(30, 31, 36, 0.7) 0%, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Green gradient overlay — abstract same-tone glows */}
      <div
        ref={greenGradientRef}
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          opacity: 0,
          background: `
            radial-gradient(ellipse at 10% 10%, #b5af38 0%, transparent 45%),
            radial-gradient(ellipse at 90% 5%, #c8c244 0%, transparent 40%),
            radial-gradient(ellipse at 85% 90%, #aba530 0%, transparent 45%),
            radial-gradient(ellipse at 5% 85%, #ccc84e 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, #e8e36c 0%, transparent 55%)
          `,
        }}
        aria-hidden="true"
      />

      {/* SVG covers the entire viewport — no clipping */}
      <svg
        ref={svgRef}
        viewBox={`${VB_START.x} ${VB_START.y} ${VB_START.w} ${VB_START.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full z-[5]"
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
          {/* "tú " */}
          {"tú ".split("").map((c, i) => (
            <span
              key={`l2-${i}`}
              className="char inline-block text-[#F5EDE3]"
              style={{ willChange: "opacity, filter, transform" }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
          {/* "horneas" with hand-drawn oval */}
          <span className="relative inline-block">
            {"horneas".split("").map((c, i) => (
              <span
                key={`h-${i}`}
                className="char inline-block text-[#F5EDE3]"
                style={{ willChange: "opacity, filter, transform" }}
              >
                {c}
              </span>
            ))}
            <svg
              className="absolute pointer-events-none"
              style={{ bottom: "-5%", left: "-4%", width: "108%", height: "20%", overflow: "visible" }}
              viewBox="0 0 200 10"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                ref={ovalRef}
                d="M 2 7 C 30 2, 80 4, 120 3 C 160 2, 190 6, 198 4"
                stroke="#27282E"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {/* "." */}
          <span
            className="char inline-block text-[#F5EDE3]"
            style={{ willChange: "opacity, filter, transform" }}
          >
            .
          </span>
        </h2>
      </div>

      <div ref={scrollIndicatorRef} className="z-10">
        <ScrollIndicator />
      </div>
    </section>
  )
}
