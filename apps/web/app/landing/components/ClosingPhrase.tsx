"use client"

import { useEffect, useRef } from "react"

const PHRASE_L1 = "Nosotros amasamos,"
const PHRASE_L2_PRE = "tú "
const PHRASE_L2_SMOKE = "horneas."

// Smoke particles — ultra organic, blurred, starting near the 's'
const PARTICLES = Array.from({ length: 75 }, (_, i) => ({
  id: i,
  delay: Math.random() * 6,
  duration: 6 + Math.random() * 5, // Slower for smoother movement
  xDrift: 100 + Math.random() * 150, // Diagonal right
  yRise: 150 + Math.random() * 150, // Diagonal UP (much higher so it goes diagonal instead of flat)
  size: 70 + Math.random() * 80, // Much larger size for smooth, seamless blending
  startOffset: (Math.random() - 0.5) * 10,
  opacity: 0.02 + Math.random() * 0.05, // Slightly more visible for clear shapes
  rotation: Math.random() * 360,
  wobble: Math.random() > 0.5 ? 1 : -1, // Sway direction to make sweeping "S" shapes
  // Organic shapes instead of perfect circles
  borderRadius: `${40 + Math.random() * 20}% ${40 + Math.random() * 20}% ${40 + Math.random() * 20}% ${40 + Math.random() * 20}% / ${40 + Math.random() * 20}% ${40 + Math.random() * 20}% ${40 + Math.random() * 20}% ${40 + Math.random() * 20}%`,
}))

export default function ClosingPhrase() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const smokeRef = useRef<HTMLSpanElement>(null)
  const revealedRef = useRef(false)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const sticky = stickyRef.current
    const h2 = h2Ref.current
    if (!wrapper || !sticky || !h2) return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const chars = h2.querySelectorAll<HTMLSpanElement>(".char")

    if (prefersReduced) {
      sticky.style.backgroundColor = "#27282E"
      chars.forEach((ch) => {
        ch.style.opacity = "1"
        ch.style.filter = "none"
        ch.style.transform = "none"
      })
      if (smokeRef.current) smokeRef.current.style.opacity = "1"
      return
    }

    // Initial hidden state
    chars.forEach((ch) => {
      ch.style.opacity = "0"
      ch.style.filter = "blur(12px)"
      ch.style.transform = "translateY(20px)"
      ch.style.transition = "none"
    })
    if (smokeRef.current) {
      smokeRef.current.style.opacity = "0"
      smokeRef.current.style.transition = "none"
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        if (!wrapper || !sticky) return

        const rect = wrapper.getBoundingClientRect()
        const wrapperH = wrapper.offsetHeight
        const vh = window.innerHeight
        const scrollRoom = wrapperH - vh
        if (scrollRoom <= 0) return

        const p = Math.max(0, Math.min(1, -rect.top / scrollRoom))

        // Background: cream → dark over first 40%
        const bgP = Math.min(1, p / 0.4)
        const r = Math.round(231 - bgP * (231 - 39))
        const g = Math.round(219 - bgP * (219 - 40))
        const b = Math.round(204 - bgP * (204 - 46))
        sticky.style.backgroundColor = `rgb(${r},${g},${b})`

        // Reveal chars at ~25%
        if (p > 0.25 && !revealedRef.current) {
          revealedRef.current = true
          chars.forEach((ch, i) => {
            setTimeout(() => {
              ch.style.transition =
                "opacity 0.5s ease-out, filter 0.5s ease-out, transform 0.5s ease-out"
              ch.style.opacity = "1"
              ch.style.filter = "blur(0px)"
              ch.style.transform = "translateY(0)"
            }, i * 30)
          })

          // Show smoke after chars
          setTimeout(() => {
            if (smokeRef.current) {
              smokeRef.current.style.transition = "opacity 1s ease-out"
              smokeRef.current.style.opacity = "1"
            }
          }, chars.length * 30 + 200)
        }
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  let charIndex = 0

  const renderChars = (text: string, className?: string) =>
    text.split("").map((c) => {
      const idx = charIndex++
      return (
        <span
          key={idx}
          className={`char inline-block ${className || ""}`}
          style={{ willChange: "opacity, filter, transform" }}
        >
          {c === " " ? "\u00A0" : c}
        </span>
      )
    })

  return (
    <div ref={wrapperRef} style={{ height: "250vh" }}>
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-8"
        style={{ backgroundColor: "#E7DBCC" }}
      >
        <h2
          ref={h2Ref}
          className="text-[7vw] sm:text-5xl md:text-7xl lg:text-8xl font-bold text-center leading-tight max-w-5xl"
        >
          {/* "Nosotros amasamos," in yellow/green */}
          <span className="text-[#DFD860]">
            {renderChars(PHRASE_L1)}
          </span>
          <br />
          {/* "tú " in cream */}
          <span className="text-[#F5EDE3]">
            {renderChars(PHRASE_L2_PRE)}
          </span>
          {/* "horneas." in cream, with smoke anchored to this word */}
          <span className="relative inline-block text-[#F5EDE3]">
            {renderChars(PHRASE_L2_SMOKE)}
            {/* Smoke from the top right corner, grey wispy */}
            <span
              ref={smokeRef}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                top: "15%", // Anchored at the top part of the 's'
                right: "3%", // Right over the s/dot
                width: "0",
                height: "0",
                opacity: 0,
                overflow: "visible",
              }}
              aria-hidden="true"
            >
              {PARTICLES.map((p) => (
                <span
                  key={p.id}
                  className="closing-smoke-particle"
                  style={{
                    position: "absolute",
                    transform: `translate(${p.startOffset}px, ${p.startOffset}px)`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: p.borderRadius,
                    background: `rgba(200, 200, 205, ${p.opacity})`, // Grey color!
                    filter: "blur(10px)",
                    animation: `closing-smoke-rise ${p.duration}s ease-in-out ${p.delay}s infinite backwards`,
                    ["--x-drift" as string]: `${p.xDrift}px`,
                    ["--y-rise" as string]: `-${p.yRise}px`,
                    ["--rotation" as string]: `${p.rotation}deg`,
                    ["--wobble" as string]: p.wobble,
                  }}
                />
              ))}
            </span>
          </span>
        </h2>
      </div>
    </div>
  )
}
