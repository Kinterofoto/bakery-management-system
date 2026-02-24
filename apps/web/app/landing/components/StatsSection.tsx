"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const stats = [
  { value: 120, suffix: "+", label: "Clientes HORECA activos" },
  { value: 1300, suffix: "", label: "m² de planta de producción" },
  { value: 15, suffix: "", label: "Años en el mercado" },
  { value: 30, suffix: "M", label: "Unidades producidas al año" },
]

function formatNumber(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("es-CO")
  }
  return n.toString()
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const countersRef = useRef<(HTMLSpanElement | null)[]>([])
  const linesRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

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

      const obj = { val: 0 }
      gsap.to(obj, {
        val: stat.value,
        duration: 2,
        ease: "power2.out",
        snap: { val: 1 },
        scrollTrigger: {
          trigger: counter,
          start: "top 85%",
          once: true,
        },
        onUpdate: () => {
          counter.textContent = formatNumber(Math.round(obj.val)) + stat.suffix
        },
      })

      if (line) {
        ScrollTrigger.create({
          trigger: line,
          start: "top 85%",
          once: true,
          onEnter: () => line.classList.add("stat-line--visible"),
        })
      }
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-[#27282E] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center">
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
