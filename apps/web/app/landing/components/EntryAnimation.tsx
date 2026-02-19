"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import PastryLogoSVG from "./PastryLogoSVG"

// The 5 circles of the croissant logo - final positions
// All start from center (540, 458) and expand outward
const CENTER = { cx: 540, cy: 458 }
const CIRCLES = [
  { cx: 417, cy: 496, r: 41 }, // left small
  { cx: 472, cy: 475, r: 62 }, // left medium
  { cx: 540, cy: 458, r: 78 }, // center big
  { cx: 608, cy: 475, r: 62 }, // right medium
  { cx: 663, cy: 496, r: 41 }, // right small
]

const STROKE_WIDTH = 7

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
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

    const svg = svgRef.current
    const circles = circleRefs.current.filter(Boolean) as SVGCircleElement[]
    if (!svg || circles.length < 5) return

    const fillPath = svg.querySelector(".logo-icon-fill") as SVGPathElement
    const strokePath = svg.querySelector(".logo-icon-stroke") as SVGPathElement
    const letters = svg.querySelectorAll(".logo-letter")

    // Hide final logo initially
    gsap.set(fillPath, { opacity: 0 })
    gsap.set(strokePath, { opacity: 0 })
    gsap.set(letters, { opacity: 0, y: 12 })

    // All circles start at center, radius 0 (invisible dot)
    circles.forEach((circle) => {
      gsap.set(circle, {
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

    // --- Phase 1: Small dot appears in center ---
    // Show center circle as a tiny dot
    tl.to(circles[2], {
      attr: { r: 4 },
      opacity: 1,
      duration: 0.3,
      ease: "power2.out",
    })

    // --- Phase 2: Dot expands into the center big circle ---
    tl.to(circles[2], {
      attr: { r: CIRCLES[2].r },
      duration: 0.7,
      ease: "power3.out",
    })

    // --- Phase 3: Medium circles emerge from center outward ---
    // They start visible at center, then move + scale to their positions
    const mediumTime = ">-0.15"
    // Left medium
    tl.fromTo(
      circles[1],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 8 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[1].cx, cy: CIRCLES[1].cy, r: CIRCLES[1].r },
        duration: 0.6,
        ease: "power2.out",
      },
      mediumTime
    )
    // Right medium
    tl.fromTo(
      circles[3],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 8 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[3].cx, cy: CIRCLES[3].cy, r: CIRCLES[3].r },
        duration: 0.6,
        ease: "power2.out",
      },
      mediumTime
    )

    // --- Phase 4: Small circles emerge from medium circles outward ---
    const smallTime = ">-0.2"
    // Left small (emerges from left medium position)
    tl.fromTo(
      circles[0],
      {
        attr: { cx: CIRCLES[1].cx, cy: CIRCLES[1].cy, r: 5 },
        opacity: 1,
      },
      {
        attr: { cx: CIRCLES[0].cx, cy: CIRCLES[0].cy, r: CIRCLES[0].r },
        duration: 0.5,
        ease: "power2.out",
      },
      smallTime
    )
    // Right small (emerges from right medium position)
    tl.fromTo(
      circles[4],
      {
        attr: { cx: CIRCLES[3].cx, cy: CIRCLES[3].cy, r: 5 },
        opacity: 1,
      },
      {
        attr: { cx: CIRCLES[4].cx, cy: CIRCLES[4].cy, r: CIRCLES[4].r },
        duration: 0.5,
        ease: "power2.out",
      },
      smallTime
    )

    // Small elastic settle for all circles
    tl.to(
      circles,
      {
        duration: 0.3,
        ease: "elastic.out(1, 0.6)",
        attr: {
          // Just a tiny overshoot — GSAP will re-resolve current values
        },
      },
      ">-0.1"
    )

    // Brief hold to appreciate the formation
    tl.to({}, { duration: 0.3 })

    // --- Phase 5: Crossfade circles into filled logo ---
    tl.to(circles, {
      opacity: 0,
      duration: 0.35,
      ease: "power2.out",
    }).to(
      fillPath,
      {
        opacity: 1,
        duration: 0.35,
        ease: "power2.out",
      },
      "<"
    )

    // --- Phase 6: Letters appear ---
    tl.to(letters, {
      opacity: 1,
      y: 0,
      stagger: 0.07,
      duration: 0.3,
      ease: "power2.out",
    })

    // Hold
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
      {/* Animated circles layer */}
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

      {/* Full logo SVG (fades in after circles settle) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <PastryLogoSVG
          ref={svgRef}
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
