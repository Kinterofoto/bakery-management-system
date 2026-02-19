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

// Text bounds (from the letter paths)
const TEXT_CENTER_X = 540
const TEXT_TOP = 608
const TEXT_BOTTOM = 697

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const lineRef = useRef<SVGLineElement>(null)
  const clipRectRef = useRef<SVGRectElement>(null)
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
    if (circles.length < 5) return

    // All circles start hidden at center with r=0
    circles.forEach((c) => {
      gsap.set(c, {
        attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 },
        opacity: 0,
      })
    })

    // Line starts invisible
    gsap.set(lineRef.current, { opacity: 0, attr: { y1: TEXT_CENTER_X, y2: TEXT_CENTER_X } })

    // Clip rect starts as zero-width at center
    gsap.set(clipRectRef.current, {
      attr: { x: TEXT_CENTER_X, width: 0 },
    })

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
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

    // 2. Expands into center big circle
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

    // 4. Left small + Right small emerge together
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

    // Hold after circles
    tl.to({}, { duration: 0.3 })

    // 5. Small vertical line appears at center ("palito")
    tl.to(lineRef.current, {
      opacity: 1,
      attr: { y1: TEXT_TOP + 15, y2: TEXT_BOTTOM - 15 },
      duration: 0.3,
      ease: "power2.out",
    })
    // Grow to full height
    tl.to(lineRef.current, {
      attr: { y1: TEXT_TOP, y2: TEXT_BOTTOM },
      duration: 0.2,
      ease: "power2.out",
    })

    // 6. Letters expand from center — clipRect grows outward
    // Simultaneously fade out the line
    tl.to(lineRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
    })
    tl.to(
      clipRectRef.current,
      {
        attr: { x: 240, width: 600 },
        duration: 1.2,
        ease: "expo.out",
      },
      "<"
    )

    // Hold before exit
    tl.to({}, { duration: 0.5 })

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
        <defs>
          {/* Clip that expands from center to reveal letters */}
          <clipPath id="letters-clip">
            <rect
              ref={clipRectRef}
              x={TEXT_CENTER_X}
              y={TEXT_TOP - 10}
              width={0}
              height={TEXT_BOTTOM - TEXT_TOP + 20}
            />
          </clipPath>
        </defs>

        {/* Circles */}
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

        {/* Center vertical line — "palito" seed for letters */}
        <line
          ref={lineRef}
          x1={TEXT_CENTER_X}
          y1={TEXT_CENTER_X}
          x2={TEXT_CENTER_X}
          y2={TEXT_CENTER_X}
          stroke={COLOR}
          strokeWidth={3}
          opacity="0"
        />

        {/* Letter paths revealed by expanding clip */}
        <g clipPath="url(#letters-clip)">
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
