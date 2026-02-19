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
// From the T path: vertical bar x=575.41..590.50, y=622.22..696.68
const STEM_X = 575.41
const STEM_W = 15.09
const STEM_Y = 622.22
const STEM_H = 74.46
const STEM_CENTER_X = STEM_X + STEM_W / 2 // ~583

// Full text area for clip
const TEXT_Y = 605
const TEXT_H = 100

export default function EntryAnimation({
  onComplete,
}: {
  onComplete: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const stemRef = useRef<SVGRectElement>(null)
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

    // Stem starts as a tiny sliver at the center of where T's bar will be
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

    // 5. T stem ("palito") grows from center — starts as a dot and grows
    //    to become the exact vertical bar of the T letter
    tl.to(stemRef.current, {
      opacity: 1,
      attr: {
        x: STEM_X,
        y: STEM_Y,
        width: STEM_W,
        height: STEM_H,
      },
      duration: 0.45,
      ease: "expo.out",
    })

    // 6. Clip expands outward from the stem position, revealing all letters.
    //    The stem fades as the real T (inside the clip) takes its place seamlessly.
    tl.to(stemRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power1.in",
    })
    tl.to(
      clipRectRef.current,
      {
        attr: { x: 240, width: 600 },
        duration: 1.4,
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
          {/* Clip that expands from T stem position to reveal letters */}
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

        {/* T stem rect — the "palito" that seeds the text.
            Positioned to match exactly the T letter's vertical bar,
            so when the clip reveals the real T, it's seamless. */}
        <rect
          ref={stemRef}
          fill={COLOR}
          opacity="0"
        />

        {/* Letter paths revealed by expanding clip from T stem */}
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
