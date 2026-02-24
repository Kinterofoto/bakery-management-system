"use client"

import { useEffect, useRef, useState } from "react"

const TITLE = "Nuestras cifras"

const stats = [
  { value: 100, suffix: "+", label: "Corazones unidos" },
  { value: 1300, suffix: "", label: "Metros para crear sin límites" },
  { value: 15, suffix: "", label: "Años amasando" },
  { value: 30, suffix: "M", label: "Bocados por año" },
]

function formatNumber(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("es-CO")
  }
  return n.toString()
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const countersRef = useRef<(HTMLSpanElement | null)[]>([])
  const linesRef = useRef<(HTMLDivElement | null)[]>([])
  const [triggered, setTriggered] = useState(false)

  // Per-character blur+fade-in on title
  useEffect(() => {
    const title = titleRef.current
    if (!title) return
    const chars = title.querySelectorAll<HTMLSpanElement>(".schar")
    if (!chars.length) return

    let fired = false
    const reveal = () => {
      if (fired) return
      fired = true
      chars.forEach((ch, i) => {
        setTimeout(() => {
          ch.style.opacity = "1"
          ch.style.filter = "blur(0px)"
          ch.style.transform = "translateY(0)"
        }, i * 30)
      })
    }

    const onScroll = () => {
      const rect = title.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        reveal()
        window.removeEventListener("scroll", onScroll)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Detect when section enters viewport
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Run animations when triggered
  useEffect(() => {
    if (!triggered) return

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    stats.forEach((stat, i) => {
      const counter = countersRef.current[i]
      const line = linesRef.current[i]
      if (!counter) return

      if (prefersReduced) {
        counter.textContent = formatNumber(stat.value) + stat.suffix
        if (line) line.classList.add("stat-line--visible")
        return
      }

      // Staggered countup
      const delay = i * 150
      setTimeout(() => {
        const duration = 2000
        const start = performance.now()

        function tick(now: number) {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)
          // ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3)
          const current = Math.round(eased * stat.value)
          counter.textContent = formatNumber(current) + stat.suffix

          if (progress < 1) {
            requestAnimationFrame(tick)
          }
        }
        requestAnimationFrame(tick)

        if (line) line.classList.add("stat-line--visible")
      }, delay)
    })
  }, [triggered])

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-[#27282E] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/90 text-center mb-14"
        >
          {TITLE.split("").map((c, i) => (
            <span
              key={i}
              className="schar inline-block transition-all duration-500 ease-out"
              style={{
                opacity: 0,
                filter: "blur(12px)",
                transform: "translateY(20px)",
              }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center transition-all duration-700 ease-out"
              style={{
                opacity: triggered ? 1 : 0,
                transform: triggered ? "translateY(0)" : "translateY(2.5rem)",
                transitionDelay: `${i * 150}ms`,
              }}
            >
              <span
                ref={(el) => {
                  countersRef.current[i] = el
                }}
                className="block text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2"
                aria-label={`${stat.value}${stat.suffix} ${stat.label}`}
              >
                0
              </span>
              <div
                ref={(el) => {
                  linesRef.current[i] = el
                }}
                className="stat-line mx-auto w-12 mb-3"
              />
              <span className="text-xs sm:text-sm md:text-base text-white/50 leading-snug">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
