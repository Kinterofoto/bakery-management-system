"use client"

import { useEffect, useRef } from "react"

const PHRASE_L1 = "Nosotros amasamos,"
const PHRASE_L2 = "tú horneas."

// Smoke particles
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  delay: i * 0.3 + Math.random() * 0.5,
  duration: 2 + Math.random() * 1.5,
  xDrift: (Math.random() - 0.5) * 50,
  size: 6 + Math.random() * 12,
  startX: 5 + (i / 14) * 90,
  opacity: 0.15 + Math.random() * 0.25,
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

        // p = 0 when wrapper top is at viewport top
        // p = 1 when wrapper bottom is at viewport bottom
        const p = Math.max(0, Math.min(1, -rect.top / scrollRoom))

        // Background: cream → dark over first 40% of scroll
        const bgP = Math.min(1, p / 0.4)
        const r = Math.round(231 - bgP * (231 - 39))
        const g = Math.round(219 - bgP * (219 - 40))
        const b = Math.round(204 - bgP * (204 - 46))
        sticky.style.backgroundColor = `rgb(${r},${g},${b})`

        // Reveal chars once we're ~30% in
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
              smokeRef.current.style.transition = "opacity 0.8s ease-out"
              smokeRef.current.style.opacity = "1"
            }
          }, chars.length * 30 + 300)
        }
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div ref={wrapperRef} style={{ height: "250vh" }}>
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-8"
        style={{ backgroundColor: "#E7DBCC" }}
      >
        <h2
          ref={h2Ref}
          className="text-[7vw] sm:text-5xl md:text-7xl lg:text-8xl font-bold text-[#DFD860] text-center leading-tight max-w-5xl"
        >
          {PHRASE_L1.split("").map((c, i) => (
            <span
              key={i}
              className="char inline-block"
              style={{ willChange: "opacity, filter, transform" }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
          <br />
          {PHRASE_L2.split("").map((c, i) => (
            <span
              key={`l2-${i}`}
              className="char inline-block"
              style={{ willChange: "opacity, filter, transform" }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
          {/* Smoke container anchored after last char */}
          <span className="relative inline-block w-0 h-0 align-baseline">
            <span
              ref={smokeRef}
              className="absolute pointer-events-none"
              style={{
                bottom: "50%",
                right: "0",
                width: "clamp(200px, 40vw, 500px)",
                height: "clamp(100px, 20vw, 250px)",
                opacity: 0,
              }}
              aria-hidden="true"
            >
              {PARTICLES.map((p) => (
                <span
                  key={p.id}
                  className="closing-smoke-particle"
                  style={{
                    position: "absolute",
                    bottom: "0",
                    left: `${p.startX}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    borderRadius: "50%",
                    background: `rgba(223, 216, 96, ${p.opacity})`,
                    animation: `closing-smoke-rise ${p.duration}s ease-out ${p.delay}s infinite`,
                    ["--x-drift" as string]: `${p.xDrift}px`,
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
