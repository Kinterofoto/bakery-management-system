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

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) return

    // Logo shrinks and moves to top-left on scroll
    gsap.to(logoWrapperRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
        pin: true,
      },
      scale: 0.15,
      x: () => -(window.innerWidth / 2 - 80),
      y: () => -(window.innerHeight / 2 - 40),
      ease: "none",
    })

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
        {/* Same circle+letter SVG as EntryAnimation — no visual swap */}
        <svg
          viewBox={VIEWBOX}
          className={LOGO_SIZE_CLASSES}
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
          {LETTER_PATHS.map((d, i) => (
            <path
              key={`letter-${i}`}
              d={d}
              fill={COLOR}
              fillRule="nonzero"
            />
          ))}
        </svg>
      </div>
      <ScrollIndicator />
    </section>
  )
}
