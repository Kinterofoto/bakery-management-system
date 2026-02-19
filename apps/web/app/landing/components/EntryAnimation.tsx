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

// T letter stem position
const STEM_X = 575.41
const STEM_W = 15.09
const STEM_Y = 622.22
const STEM_H = 74.46
const STEM_CENTER_X = STEM_X + STEM_W / 2

// Full text area for clip
const TEXT_Y = 605
const TEXT_H = 100

// Stagger order from center outward: T, S+R, A+Y, P
// Each group gets a slight delay for the organic rise
const LETTER_GROUPS = [
  [3],       // T
  [2, 4],    // S, R
  [1, 5],    // A, Y
  [0],       // P
]

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const stemRef = useRef<SVGRectElement>(null)
  const clipRectRef = useRef<SVGRectElement>(null)
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

    // Circles start hidden at center
    circles.forEach((c) => {
      gsap.set(c, {
        attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 },
        opacity: 0,
      })
    })

    // Stem starts as a tiny sliver
    gsap.set(stemRef.current, {
      attr: {
        x: STEM_CENTER_X - 0.5,
        y: STEM_Y + STEM_H / 2,
        width: 1,
        height: 0,
      },
      opacity: 0,
    })

    // Clip rect starts zero-width at stem
    gsap.set(clipRectRef.current, {
      attr: { x: STEM_CENTER_X, width: 0 },
    })

    // Each letter starts shifted down and transparent
    letters.forEach((path) => {
      gsap.set(path, { opacity: 0, y: 12 })
    })

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        setVisible(false)
        onComplete()
      },
    })

    // 1. Dot snaps in instantly
    tl.to(circles[2], {
      attr: { r: 3 },
      opacity: 1,
      duration: 0.1,
      ease: "power4.out",
    })

    // 2. Explodes into center circle — violent start, long tail
    tl.to(circles[2], {
      attr: { r: CIRCLES[2].r },
      duration: 0.9,
      ease: "expo.out",
    })

    // 3. Medium circles burst out — overlap with center finishing
    tl.fromTo(
      circles[1],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[1].cx, cy: CIRCLES[1].cy, r: CIRCLES[1].r },
        duration: 0.9,
        ease: "expo.out",
      },
      ">-0.3"
    )
    tl.fromTo(
      circles[3],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[3].cx, cy: CIRCLES[3].cy, r: CIRCLES[3].r },
        duration: 0.9,
        ease: "expo.out",
      },
      "<"
    )

    // 4. Small circles — fire right after mediums start
    tl.fromTo(
      circles[0],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[0].cx, cy: CIRCLES[0].cy, r: CIRCLES[0].r },
        duration: 0.8,
        ease: "expo.out",
      },
      ">-0.65"
    )
    tl.fromTo(
      circles[4],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[4].cx, cy: CIRCLES[4].cy, r: CIRCLES[4].r },
        duration: 0.8,
        ease: "expo.out",
      },
      "<"
    )

    // Quick hold
    tl.to({}, { duration: 0.08 })

    // 5. T stem snaps in
    tl.to(stemRef.current, {
      opacity: 1,
      attr: {
        x: STEM_X,
        y: STEM_Y,
        width: STEM_W,
        height: STEM_H,
      },
      duration: 0.08,
      ease: "expo.out",
    })

    // 6. Clip bursts open + stem fades + letters rise from center
    tl.to(stemRef.current, {
      opacity: 0,
      duration: 0.06,
      ease: "power2.in",
    })
    tl.to(
      clipRectRef.current,
      {
        attr: { x: 240, width: 600 },
        duration: 0.45,
        ease: "expo.out",
      },
      "<"
    )

    // Letters snap up per group
    LETTER_GROUPS.forEach((group, gi) => {
      const groupLetters = group.map((idx) => letters[idx]).filter(Boolean)
      tl.to(
        groupLetters,
        {
          opacity: 1,
          y: 0,
          duration: 0.18,
          ease: "expo.out",
        },
        `<${gi * 0.03}`
      )
    })

    // Hold before exit
    tl.to({}, { duration: 0.3 })

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#27282E]"
    >
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className={LOGO_SIZE_CLASSES}
        aria-label="Pastry"
      >
        <defs>
          <clipPath id="letters-clip">
            <rect
              ref={clipRectRef}
              x={STEM_CENTER_X}
              y={TEXT_Y}
              width={0}
              height={TEXT_H}
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

        {/* T stem rect */}
        <rect
          ref={stemRef}
          fill={COLOR}
          opacity="0"
        />

        {/* Letter paths — clipped + individual rise animation */}
        <g clipPath="url(#letters-clip)">
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
