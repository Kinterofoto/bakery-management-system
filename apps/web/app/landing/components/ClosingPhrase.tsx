"use client"

import { useEffect, useRef } from "react"

const LINE1 = "Nosotros amasamos,"
const LINE2_PREFIX = "tú "
const LINE2_SMOKE = "horneas."

// Smoke particles config
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  delay: i * 0.4 + Math.random() * 0.3,
  duration: 2.2 + Math.random() * 1.2,
  xDrift: (Math.random() - 0.5) * 30,
  size: 4 + Math.random() * 6,
}))

export default function ClosingPhrase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])
  const smokeRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) {
      charsRef.current.forEach((ch) => {
        if (ch) {
          ch.style.opacity = "1"
          ch.style.filter = "none"
          ch.style.transform = "none"
        }
      })
      if (smokeRef.current) smokeRef.current.style.opacity = "1"
      return
    }

    // Initial hidden state
    charsRef.current.forEach((ch) => {
      if (ch) {
        ch.style.opacity = "0"
        ch.style.filter = "blur(10px)"
        ch.style.transform = "translateY(16px)"
      }
    })
    if (smokeRef.current) smokeRef.current.style.opacity = "0"

    const onScroll = () => {
      if (firedRef.current) return
      const rect = container.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        firedRef.current = true
        window.removeEventListener("scroll", onScroll)

        // Reveal chars one by one
        charsRef.current.forEach((ch, i) => {
          if (!ch) return
          setTimeout(() => {
            ch.style.transition =
              "opacity 0.5s ease-out, filter 0.5s ease-out, transform 0.5s ease-out"
            ch.style.opacity = "1"
            ch.style.filter = "blur(0px)"
            ch.style.transform = "translateY(0)"
          }, i * 35)
        })

        // Start smoke after last char reveals
        const totalChars = charsRef.current.length
        setTimeout(() => {
          if (smokeRef.current) {
            smokeRef.current.style.transition = "opacity 0.8s ease-out"
            smokeRef.current.style.opacity = "1"
          }
        }, totalChars * 35 + 200)
      }
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
          ref={(el) => {
            if (el) charsRef.current[idx] = el
          }}
          className={`inline-block ${className || ""}`}
          style={{ willChange: "opacity, filter, transform" }}
        >
          {c === " " ? "\u00A0" : c}
        </span>
      )
    })

  return (
    <div
      ref={containerRef}
      className="bg-[#27282E] pt-14 pb-20 md:pt-16 md:pb-24 px-6"
    >
      <p className="text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-light tracking-wide text-[#DFD860]/70 leading-relaxed">
        {renderChars(LINE1)}
        <br />
        {renderChars(LINE2_PREFIX)}
        <span className="relative inline-block">
          {renderChars(LINE2_SMOKE)}
          {/* Smoke particles */}
          <span
            ref={smokeRef}
            className="absolute pointer-events-none"
            style={{
              top: "-8px",
              left: "0",
              right: "0",
              height: "60px",
              opacity: 0,
            }}
            aria-hidden="true"
          >
            {PARTICLES.map((p) => (
              <span
                key={p.id}
                className="smoke-particle"
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: `${20 + (p.id / PARTICLES.length) * 60}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: "50%",
                  background: "rgba(223, 216, 96, 0.25)",
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  ["--x-drift" as string]: `${p.xDrift}px`,
                }}
              />
            ))}
          </span>
        </span>
      </p>

      <style jsx>{`
        @keyframes smoke-rise {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0) scale(0.5);
            filter: blur(1px);
          }
          15% {
            opacity: 0.5;
          }
          60% {
            opacity: 0.2;
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) translateX(var(--x-drift, 0px))
              scale(1.5);
            filter: blur(4px);
          }
        }
        .smoke-particle {
          animation: smoke-rise var(--dur, 2.5s) ease-out infinite;
          animation-delay: var(--delay, 0s);
        }
      `}</style>
    </div>
  )
}
