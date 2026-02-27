"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const PHRASE_L1 = "Nosotros amasamos,"
const PHRASE_L2 = "tú horneas."

// Smoke particles — numerous & visible
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
  const sectionRef = useRef<HTMLElement>(null)
  const phraseRef = useRef<HTMLDivElement>(null)
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const smokeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const section = sectionRef.current
    const h2 = h2Ref.current
    if (!section || !h2) return

    // Set initial bg explicitly for GSAP
    gsap.set(section, { backgroundColor: "#E7DBCC" })

    // Show phrase container, hide individual chars
    gsap.set(phraseRef.current, { opacity: 1 })
    const chars = h2.querySelectorAll(".char")
    if (chars.length) {
      gsap.set(chars, { opacity: 0, filter: "blur(12px)", y: 20 })
    }

    // Hide smoke
    if (smokeRef.current) {
      gsap.set(smokeRef.current, { opacity: 0 })
    }

    // Small delay to ensure DOM is fully laid out after dynamic import
    const raf = requestAnimationFrame(() => {
      ScrollTrigger.refresh()

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=200%",
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      })

      // Cream → dark transition
      tl.fromTo(
        section,
        { backgroundColor: "#E7DBCC" },
        { backgroundColor: "#27282E", duration: 0.15, ease: "power2.inOut" },
        0
      )

      // Phrase appears — per-character with blur
      if (chars.length) {
        tl.to(
          chars,
          {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            stagger: 0.007,
            duration: 0.12,
            ease: "power2.out",
          },
          0.15
        )
      }

      // Smoke fades in after chars
      if (smokeRef.current) {
        tl.to(
          smokeRef.current,
          { opacity: 1, duration: 0.10, ease: "power2.out" },
          0.30
        )
      }

      // Hold — let it breathe
      tl.to({}, { duration: 0.55 }, 0.45)

      // Store for cleanup
      section.dataset.tlReady = "1"
    })

    return () => {
      cancelAnimationFrame(raf)
      ScrollTrigger.getAll()
        .filter((st) => st.trigger === section)
        .forEach((st) => st.kill())
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#E7DBCC" }}
    >
      <div
        ref={phraseRef}
        className="absolute inset-0 flex items-center justify-center px-8 z-10"
        style={{ opacity: 0 }}
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
          {/* Smoke container anchored to end of text */}
          <span className="relative inline-block w-0 h-0 align-baseline">
            <span
              ref={smokeRef}
              className="absolute pointer-events-none"
              style={{
                bottom: "50%",
                right: "0",
                width: "clamp(200px, 40vw, 500px)",
                height: "clamp(80px, 15vw, 200px)",
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
    </section>
  )
}
