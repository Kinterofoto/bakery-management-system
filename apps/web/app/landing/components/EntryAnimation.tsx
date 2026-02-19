"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

const CENTER = { cx: 540, cy: 458 }
const CIRCLES = [
  { cx: 417, cy: 496, r: 41 }, // 0: left small
  { cx: 472, cy: 475, r: 62 }, // 1: left medium
  { cx: 540, cy: 458, r: 78 }, // 2: center big
  { cx: 608, cy: 475, r: 62 }, // 3: right medium
  { cx: 663, cy: 496, r: 41 }, // 4: right small
]

const STROKE_WIDTH = 11
const COLOR = "#DFD860"

// Letter paths extracted from the original AI vector file
const LETTER_PATHS = [
  // P
  "M 299.066406 651.273438 L 270.261719 651.273438 L 270.261719 622.21875 L 299.066406 622.21875 C 307.746094 622.21875 313.402344 628.007812 313.402344 636.308594 C 313.402344 644.234375 308.496094 651.273438 299.066406 651.273438 M 299.820312 608.636719 L 255.167969 608.636719 L 255.167969 696.683594 L 270.261719 696.683594 L 270.261719 664.859375 L 299.820312 664.859375 C 316.421875 664.859375 328.75 654.042969 328.75 636.308594 C 328.75 620.585938 317.804688 608.636719 299.820312 608.636719",
  // A
  "M 366.0625 672.507812 L 384.21875 628.132812 L 402.292969 672.507812 Z M 412.140625 696.679688 L 427.738281 696.679688 L 391.640625 608.636719 L 376.546875 608.636719 L 340.578125 696.679688 L 356.171875 696.679688 L 360.507812 686.089844 L 407.828125 686.089844 Z M 412.140625 696.679688",
  // S
  "M 490.628906 682.664062 C 476.542969 682.664062 467.738281 677.082031 466.355469 668.242188 L 450.886719 668.242188 C 452.015625 684.410156 467.484375 695.109375 490.628906 695.109375 C 510.753906 695.109375 523.460938 685.804688 523.460938 671.035156 C 523.460938 655.683594 510.378906 651.496094 497.925781 647.890625 L 484.59375 644.054688 C 476.039062 641.496094 468.367188 639.75 468.367188 632.65625 C 468.367188 626.375 474.65625 622.652344 484.339844 622.652344 C 497.550781 622.652344 504.84375 628.816406 505.472656 638.003906 L 520.816406 638.003906 C 519.683594 620.792969 506.101562 610.210938 484.84375 610.210938 C 465.347656 610.210938 453.398438 619.976562 453.398438 633.351562 C 453.398438 649.285156 469.5 653.472656 479.8125 656.378906 L 494.152344 660.335938 C 502.703125 662.777344 508.113281 665.335938 508.113281 671.734375 C 508.113281 678.59375 502.078125 682.664062 490.628906 682.664062",
  // T
  "M 545.980469 622.21875 L 575.410156 622.21875 L 575.410156 696.683594 L 590.503906 696.683594 L 590.503906 622.21875 L 619.8125 622.21875 L 619.8125 608.636719 L 545.980469 608.636719 Z M 545.980469 622.21875",
  // R
  "M 692.511719 650.144531 L 665.34375 650.144531 L 665.34375 622.21875 L 692.511719 622.21875 C 701.066406 622.21875 706.601562 627.753906 706.601562 635.804688 C 706.601562 643.476562 701.820312 650.144531 692.511719 650.144531 M 702.199219 656.304688 C 713.894531 653.289062 721.566406 644.359375 721.566406 633.539062 C 721.566406 618.824219 709.996094 608.636719 693.269531 608.636719 L 650.25 608.636719 L 650.25 696.679688 L 665.34375 696.679688 L 665.34375 663.476562 L 691.128906 663.476562 C 695.152344 663.476562 698.046875 665.363281 699.304688 668.882812 L 709.496094 696.679688 L 725.59375 696.679688 L 714.273438 666.371094 C 712.136719 660.960938 707.984375 657.4375 702.199219 656.304688",
  // Y
  "M 807.351562 608.636719 L 783.828125 644.734375 L 760.308594 608.636719 L 742.824219 608.636719 L 776.15625 659.074219 L 776.15625 696.679688 L 791.25 696.679688 L 791.25 659.074219 L 824.832031 608.636719 Z M 807.351562 608.636719",
]

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
      {/* Single SVG — circles + letters, nothing else */}
      <svg
        viewBox="240 370 600 340"
        className="w-[70vw] md:w-[40vw] lg:w-[30vw] h-auto"
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

        {/* Letter paths */}
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
