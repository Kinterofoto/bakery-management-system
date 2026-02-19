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
  const phraseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Transform origin at center circle
    if (logoWrapperRef.current) {
      logoWrapperRef.current.style.transformOrigin = "50% 26%"
    }

    // Phrase starts hidden
    gsap.set(phraseRef.current, { opacity: 0, y: 30 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=200%",
        scrub: 1,
        pin: true,
      },
    })

    // Phase 1: Fast zoom — letters and indicator vanish, logo zooms into center
    tl.to(scrollIndicatorRef.current, { opacity: 0, duration: 0.05 }, 0)
    tl.to(lettersRef.current, { opacity: 0, duration: 0.08 }, 0)
    tl.to(logoWrapperRef.current, { scale: 30, duration: 0.35, ease: "power3.in" }, 0)

    // Phase 2: Only when fully zoomed — circles fade and bg turns green
    tl.to(circlesRef.current, { opacity: 0, duration: 0.08 }, 0.28)
    tl.to(sectionRef.current, { backgroundColor: "#DFD860", duration: 0.1 }, 0.3)

    // Phase 3: Phrase appears big on the green background
    tl.to(phraseRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.15,
      ease: "expo.out",
    }, 0.42)

    // Hold the phrase
    tl.to({}, { duration: 0.35 }, 0.57)

    // Phase 4: Phrase fades out before next section
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

      {/* Manifesto phrase — appears after zoom-through on green bg */}
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
