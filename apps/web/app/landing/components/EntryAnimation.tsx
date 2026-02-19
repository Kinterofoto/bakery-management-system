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

// T letter stem position (the "palito" that seeds the text)
const STEM_X = 575.41
const STEM_W = 15.09
const STEM_Y = 622.22
const STEM_H = 74.46
const STEM_CENTER_X = STEM_X + STEM_W / 2

// Full text area for clip
const TEXT_Y = 605
const TEXT_H = 100

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const stemRef = useRef<SVGRectElement>(null)
  const clipRectRef = useRef<SVGRectElement>(null)
  const lettersGroupRef = useRef<SVGGElement>(null)
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

    // All circles start hidden at center with r=0, with blur
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

    // Clip rect starts as zero-width centered on the T stem
    gsap.set(clipRectRef.current, {
      attr: { x: STEM_CENTER_X, width: 0 },
    })

    // Letters group starts blurred
    gsap.set(lettersGroupRef.current, {
      attr: { filter: "url(#text-blur)" },
    })

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        setVisible(false)
        onComplete()
      },
    })

    // 1. Small dot appears — punchy and fast
    tl.to(circles[2], {
      attr: { r: 3 },
      opacity: 1,
      duration: 0.15,
      ease: "power4.out",
    })

    // 2. Explodes into center big circle — very fast start, long deceleration
    tl.to(circles[2], {
      attr: { r: CIRCLES[2].r },
      duration: 1.2,
      ease: "expo.out",
    })

    // 3. Left medium + Right medium burst out together
    tl.fromTo(
      circles[1],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[1].cx, cy: CIRCLES[1].cy, r: CIRCLES[1].r },
        duration: 1.3,
        ease: "expo.out",
      },
      ">-0.2"
    )
    tl.fromTo(
      circles[3],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[3].cx, cy: CIRCLES[3].cy, r: CIRCLES[3].r },
        duration: 1.3,
        ease: "expo.out",
      },
      "<"
    )

    // 4. Left small + Right small burst out
    tl.fromTo(
      circles[0],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[0].cx, cy: CIRCLES[0].cy, r: CIRCLES[0].r },
        duration: 1.2,
        ease: "expo.out",
      },
      ">-0.85"
    )
    tl.fromTo(
      circles[4],
      { attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 }, opacity: 1 },
      {
        attr: { cx: CIRCLES[4].cx, cy: CIRCLES[4].cy, r: CIRCLES[4].r },
        duration: 1.2,
        ease: "expo.out",
      },
      "<"
    )

    // Brief hold
    tl.to({}, { duration: 0.25 })

    // 5. T stem grows from center — fast snap
    tl.to(stemRef.current, {
      opacity: 1,
      attr: {
        x: STEM_X,
        y: STEM_Y,
        width: STEM_W,
        height: STEM_H,
      },
      duration: 0.35,
      ease: "expo.out",
    })

    // 6. Letters expand from stem — fast burst then slow reveal
    //    Stem fades into the real T, blur clears as letters are revealed
    const blurFilter = svgRef.current?.querySelector("#text-blur feGaussianBlur")
    tl.to(stemRef.current, {
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
    })
    tl.to(
      clipRectRef.current,
      {
        attr: { x: 240, width: 600 },
        duration: 1.6,
        ease: "expo.out",
      },
      "<"
    )
    // Clear the blur as letters are revealed
    if (blurFilter) {
      tl.to(
        blurFilter,
        {
          attr: { stdDeviation: 0 },
          duration: 0.8,
          ease: "power2.out",
        },
        "<0.1"
      )
    }

    // Hold before exit
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
      <svg
        ref={svgRef}
        viewBox={VIEWBOX}
        className={LOGO_SIZE_CLASSES}
        aria-label="Pastry"
      >
        <defs>
          {/* Blur filter for circles glow */}
          <filter id="circle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Blur filter for text — starts blurred, animates to sharp */}
          <filter id="text-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>

          {/* Clip that expands from T stem position */}
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

        {/* Circles with glow */}
        <g filter="url(#circle-glow)">
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
        </g>

        {/* T stem rect */}
        <rect
          ref={stemRef}
          fill={COLOR}
          opacity="0"
        />

        {/* Letter paths — clipped and initially blurred */}
        <g ref={lettersGroupRef} clipPath="url(#letters-clip)">
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
