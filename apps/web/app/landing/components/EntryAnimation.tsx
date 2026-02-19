"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import PastryLogoSVG from "./PastryLogoSVG"

const CENTER = { cx: 540, cy: 458 }
const CIRCLES = [
  { cx: 417, cy: 496, r: 41 }, // 0: left small
  { cx: 472, cy: 475, r: 62 }, // 1: left medium
  { cx: 540, cy: 458, r: 78 }, // 2: center big
  { cx: 608, cy: 475, r: 62 }, // 3: right medium
  { cx: 663, cy: 496, r: 41 }, // 4: right small
]

const STROKE_WIDTH = 11

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<SVGSVGElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) {
      setVisible(false)
      onComplete()
      return
    }

    document.documentElement.classList.add("no-scroll")

    const logo = logoRef.current
    const circles = circleRefs.current.filter(Boolean) as SVGCircleElement[]
    if (!logo || circles.length < 5) return

    // Only use PastryLogoSVG for the letters — hide everything else
    const fillPath = logo.querySelector(".logo-icon-fill") as SVGPathElement
    const strokePath = logo.querySelector(".logo-icon-stroke") as SVGPathElement
    const letters = logo.querySelectorAll(".logo-letter")

    gsap.set(fillPath, { opacity: 0 })
    gsap.set(strokePath, { opacity: 0 })
    gsap.set(letters, { opacity: 0, y: 12 })

    // All circles start hidden at center with r=0
    circles.forEach((c) => {
      gsap.set(c, {
        attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 },
        opacity: 0,
      })
    })

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: "power2.inOut",
          onComplete: () => {
            setVisible(false)
            onComplete()
          },
        })
      },
    })

    // 1. Single small dot
    tl.to(circles[2], {
      attr: { r: 3 },
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
    })

    // 2. Expands into center big circle
    tl.to(circles[2], {
      attr: { r: CIRCLES[2].r },
      duration: 0.8,
      ease: "expo.out",
    })

    // 3. Left medium from center
    tl.fromTo(
      circles[1],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[1].cx, cy: CIRCLES[1].cy, r: CIRCLES[1].r },
        duration: 0.65,
        ease: "power3.out",
      },
      ">-0.1"
    )

    // 4. Right medium from center
    tl.fromTo(
      circles[3],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[3].cx, cy: CIRCLES[3].cy, r: CIRCLES[3].r },
        duration: 0.65,
        ease: "power3.out",
      },
      "<0.15"
    )

    // 5. Left small from center
    tl.fromTo(
      circles[0],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[0].cx, cy: CIRCLES[0].cy, r: CIRCLES[0].r },
        duration: 0.55,
        ease: "power3.out",
      },
      "<0.15"
    )

    // 6. Right small from center
    tl.fromTo(
      circles[4],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[4].cx, cy: CIRCLES[4].cy, r: CIRCLES[4].r },
        duration: 0.55,
        ease: "power3.out",
      },
      "<0.12"
    )

    // Hold — circles stay as final icon
    tl.to({}, { duration: 0.35 })

    // 7. Only letters appear (circles stay visible, no swap)
    tl.to(letters, {
      opacity: 1,
      y: 0,
      stagger: 0.07,
      duration: 0.3,
      ease: "power2.out",
    })

    tl.to({}, { duration: 0.4 })

    return () => {
      tl.kill()
      document.documentElement.classList.remove("no-scroll")
    }
  }, [onComplete])

  const handleSkip = () => {
    gsap.killTweensOf("*")
    document.documentElement.classList.remove("no-scroll")
    setVisible(false)
    onComplete()
  }

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0A]"
    >
      {/* The circles — these ARE the final icon, they stay */}
      <svg
        viewBox="240 370 600 340"
        className="w-[70vw] md:w-[40vw] lg:w-[30vw] h-auto absolute"
        aria-hidden="true"
      >
        {CIRCLES.map((c, i) => (
          <circle
            key={i}
            ref={(el) => {
              circleRefs.current[i] = el
            }}
            cx={CENTER.cx}
            cy={CENTER.cy}
            r={0}
            fill="none"
            stroke="#DFD860"
            strokeWidth={STROKE_WIDTH}
            opacity="0"
          />
        ))}
      </svg>

      {/* PastryLogoSVG — only used for the letter paths, icon stays hidden */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <PastryLogoSVG
          ref={logoRef}
          className="w-[70vw] md:w-[40vw] lg:w-[30vw] h-auto"
          color="#DFD860"
        />
      </div>

      <button
        onClick={handleSkip}
        className="landing-focus absolute bottom-8 right-8 z-[101] text-sm text-white/50 hover:text-white transition-colors"
        aria-label="Saltar animación de entrada"
      >
        Skip
      </button>
    </div>
  )
}
