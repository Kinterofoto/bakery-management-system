"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import {
  CENTER,
  CIRCLES,
  STROKE_WIDTH,
  COLOR,
  VIEWBOX,
  LOGO_SIZE_CLASSES,
  LETTER_PATHS,
} from "./logo-constants"

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const letterRefs = useRef<(SVGPathElement | null)[]>([])
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

    const circles = circleRefs.current.filter(Boolean) as SVGCircleElement[]
    const letters = letterRefs.current.filter(Boolean) as SVGPathElement[]
    if (circles.length < 5) return

    // All circles start hidden at center with r=0
    circles.forEach((c) => {
      gsap.set(c, {
        attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 },
        opacity: 0,
      })
    })

    // Letters hidden
    gsap.set(letters, { opacity: 0, y: 10 })

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        // Instant removal — hero underneath is visually identical
        setVisible(false)
        onComplete()
      },
    })

    // 1. Single small dot appears fast
    tl.to(circles[2], {
      attr: { r: 3 },
      opacity: 1,
      duration: 0.25,
      ease: "power2.out",
    })

    // 2. Expands into center big circle — fast start, slow finish
    tl.to(circles[2], {
      attr: { r: CIRCLES[2].r },
      duration: 1,
      ease: "expo.out",
    })

    // 3. Left medium + Right medium emerge together
    tl.fromTo(
      circles[1],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[1].cx, cy: CIRCLES[1].cy, r: CIRCLES[1].r },
        duration: 1.1,
        ease: "expo.out",
      },
      ">-0.15"
    )
    tl.fromTo(
      circles[3],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[3].cx, cy: CIRCLES[3].cy, r: CIRCLES[3].r },
        duration: 1.1,
        ease: "expo.out",
      },
      "<"
    )

    // 4. Left small + Right small emerge together (after mediums start)
    tl.fromTo(
      circles[0],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[0].cx, cy: CIRCLES[0].cy, r: CIRCLES[0].r },
        duration: 1,
        ease: "expo.out",
      },
      ">-0.7"
    )
    tl.fromTo(
      circles[4],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[4].cx, cy: CIRCLES[4].cy, r: CIRCLES[4].r },
        duration: 1,
        ease: "expo.out",
      },
      "<"
    )

    // Hold
    tl.to({}, { duration: 0.35 })

    // 7. Letters appear
    tl.to(letters, {
      opacity: 1,
      y: 0,
      stagger: 0.07,
      duration: 0.3,
      ease: "power2.out",
    })

    tl.to({}, { duration: 0.6 })

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
      <svg
        viewBox={VIEWBOX}
        className={LOGO_SIZE_CLASSES}
        aria-label="Pastry"
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
            stroke={COLOR}
            strokeWidth={STROKE_WIDTH}
            opacity="0"
          />
        ))}

        {LETTER_PATHS.map((d, i) => (
          <path
            key={`letter-${i}`}
            ref={(el) => {
              letterRefs.current[i] = el
            }}
            d={d}
            fill={COLOR}
            fillRule="nonzero"
            opacity="0"
          />
        ))}
      </svg>

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
