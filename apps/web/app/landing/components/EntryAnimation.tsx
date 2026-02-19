"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import PastryLogoSVG from "./PastryLogoSVG"

// The 5 circles of the croissant logo (extracted from vector file)
// Positions in SVG coordinate space (viewBox "240 370 600 340")
const CIRCLES = [
  { id: 0, cx: 417, cy: 496, r: 41, label: "left-small" },
  { id: 1, cx: 472, cy: 475, r: 62, label: "left-med" },
  { id: 2, cx: 540, cy: 458, r: 78, label: "center-big" },
  { id: 3, cx: 608, cy: 475, r: 62, label: "right-med" },
  { id: 4, cx: 663, cy: 496, r: 41, label: "right-small" },
]

// Random starting positions above the viewport
const START_POSITIONS = [
  { x: -120, y: -500 },
  { x: 80, y: -650 },
  { x: -30, y: -800 },
  { x: 150, y: -550 },
  { x: -80, y: -700 },
]

// Staggered delays for async feel
const DROP_DELAYS = [0, 0.15, 0.08, 0.22, 0.12]

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
    if (!svg || circles.length === 0) return

    const fillPath = svg.querySelector(".logo-icon-fill") as SVGPathElement
    const strokePath = svg.querySelector(".logo-icon-stroke") as SVGPathElement
    const letters = svg.querySelectorAll(".logo-letter")

    // Hide the final logo elements initially
    gsap.set(fillPath, { opacity: 0 })
    gsap.set(strokePath, { opacity: 0 })
    gsap.set(letters, { opacity: 0, y: 12 })

    // Position circles at random starting points above
    circles.forEach((circle, i) => {
      const start = START_POSITIONS[i]
      gsap.set(circle, {
        attr: {
          cx: CIRCLES[i].cx + start.x,
          cy: CIRCLES[i].cy + start.y,
        },
        opacity: 1,
      })
    })

    const masterTl = gsap.timeline({
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

    // Phase 1: Balls fall and bounce to a "ground" level (cy ~550)
    // Each ball drops at its own time, bounces, wobbles
    const groundY = 560
    circles.forEach((circle, i) => {
      const startPos = START_POSITIONS[i]
      const delay = DROP_DELAYS[i]

      masterTl.to(
        circle,
        {
          attr: { cy: groundY, cx: CIRCLES[i].cx + startPos.x * 0.3 },
          duration: 0.8,
          ease: "bounce.out",
          delay,
        },
        0 // all start from time 0 (with individual delays)
      )
    })

    // Phase 2: After bouncing, balls scatter slightly then organize
    // Small random scatter
    const scatterTime = 1.2
    circles.forEach((circle, i) => {
      const scatter = {
        cx: CIRCLES[i].cx + (Math.random() - 0.5) * 80,
        cy: groundY + (Math.random() - 0.5) * 40,
      }
      masterTl.to(
        circle,
        {
          attr: scatter,
          duration: 0.3,
          ease: "power1.out",
        },
        scatterTime
      )
    })

    // Phase 3: Organic settle into final croissant formation
    const settleTime = 1.7
    circles.forEach((circle, i) => {
      masterTl.to(
        circle,
        {
          attr: {
            cx: CIRCLES[i].cx,
            cy: CIRCLES[i].cy,
          },
          duration: 0.9,
          ease: "elastic.out(1, 0.5)",
        },
        settleTime + i * 0.06
      )
    })

    // Phase 4: Crossfade circles into the actual filled logo
    const crossfadeTime = settleTime + 1.2
    masterTl
      .to(
        circles,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out",
        },
        crossfadeTime
      )
      .to(
        fillPath,
        {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
        crossfadeTime
      )

    // Phase 5: Reveal letters P-A-S-T-R-Y
    masterTl.to(
      letters,
      {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.35,
        ease: "power2.out",
      },
      crossfadeTime + 0.3
    )

    // Hold
    masterTl.to({}, { duration: 0.5 })

    return () => {
      masterTl.kill()
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
      <svg
        viewBox="240 370 600 340"
        className="w-[70vw] md:w-[40vw] lg:w-[30vw] h-auto"
        aria-label="Pastry"
      >
        {/* Animated bouncing circles */}
        {CIRCLES.map((c, i) => (
          <circle
            key={c.id}
            ref={(el) => {
              circleRefs.current[i] = el
            }}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke="#DFD860"
            strokeWidth="3"
            opacity="0"
          />
        ))}
      </svg>

      {/* Hidden full logo SVG (fades in after balls settle) */}
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
