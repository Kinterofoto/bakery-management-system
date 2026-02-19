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

// Draw order: from center outward — T, then S+R, then A+Y, then P
const DRAW_ORDER = [3, 2, 4, 1, 5, 0] // T, S, R, A, Y, P

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
    if (circles.length < 5 || letters.length < 6) return

    // Circles start hidden at center
    circles.forEach((c) => {
      gsap.set(c, {
        attr: { cx: CENTER.cx, cy: CENTER.cy, r: 0 },
        opacity: 0,
      })
    })

    // Letters: measure path lengths, set up stroke-draw + hidden fill
    letters.forEach((path) => {
      const len = path.getTotalLength()
      gsap.set(path, {
        fill: "transparent",
        stroke: COLOR,
        strokeWidth: 2,
        strokeDasharray: len,
        strokeDashoffset: len,
        opacity: 1,
      })
    })

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("no-scroll")
        setVisible(false)
        onComplete()
      },
    })

    // 1. Small dot — punchy snap
    tl.to(circles[2], {
      attr: { r: 3 },
      opacity: 1,
      duration: 0.15,
      ease: "power4.out",
    })

    // 2. Explodes into center circle
    tl.to(circles[2], {
      attr: { r: CIRCLES[2].r },
      duration: 1.2,
      ease: "expo.out",
    })

    // 3. Medium circles burst out
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

    // 4. Small circles burst out
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
    tl.to({}, { duration: 0.2 })

    // 5. Letters draw on from center outward
    //    T draws first, then S+R together, then A+Y together, then P
    //    Each letter: stroke draws on, then fill fades in

    // T (index 3)
    const t = letters[3]
    tl.to(t, {
      strokeDashoffset: 0,
      duration: 0.6,
      ease: "power2.inOut",
    })
    tl.to(t, {
      fill: COLOR,
      stroke: "transparent",
      duration: 0.3,
      ease: "power1.in",
    }, ">-0.15")

    // S (2) + R (4) — start slightly before T finishes filling
    const s = letters[2]
    const r = letters[4]
    tl.to([s, r], {
      strokeDashoffset: 0,
      duration: 0.55,
      ease: "power2.inOut",
    }, ">-0.25")
    tl.to([s, r], {
      fill: COLOR,
      stroke: "transparent",
      duration: 0.3,
      ease: "power1.in",
    }, ">-0.1")

    // A (1) + Y (5)
    const a = letters[1]
    const y = letters[5]
    tl.to([a, y], {
      strokeDashoffset: 0,
      duration: 0.5,
      ease: "power2.inOut",
    }, ">-0.25")
    tl.to([a, y], {
      fill: COLOR,
      stroke: "transparent",
      duration: 0.3,
      ease: "power1.in",
    }, ">-0.1")

    // P (0)
    const p = letters[0]
    tl.to(p, {
      strokeDashoffset: 0,
      duration: 0.45,
      ease: "power2.inOut",
    }, ">-0.25")
    tl.to(p, {
      fill: COLOR,
      stroke: "transparent",
      duration: 0.3,
      ease: "power1.in",
    }, ">-0.1")

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
        viewBox={VIEWBOX}
        className={LOGO_SIZE_CLASSES}
        aria-label="Pastry"
      >
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

        {/* Letter paths — drawn on with stroke then filled */}
        {LETTER_PATHS.map((d, i) => (
          <path
            key={`letter-${i}`}
            ref={(el) => {
              letterRefs.current[i] = el
            }}
            d={d}
            fill="transparent"
            fillRule="nonzero"
            stroke={COLOR}
            strokeWidth={2}
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
