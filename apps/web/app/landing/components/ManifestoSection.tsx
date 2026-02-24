"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const values = [
  {
    title: "Obsesionados con el producto",
    desc: "Seleccionamos cada ingrediente con rigor. Nuestras masas congeladas conservan el sabor y la textura de lo recién horneado.",
  },
  {
    title: "Democratizar el buen pan",
    desc: "Llevamos la calidad artesanal a hoteles, restaurantes y cafés de todo Colombia, sin que necesiten un maestro panadero.",
  },
  {
    title: "Pasión y conciencia",
    desc: "Producción 100% colombiana con ingredientes locales, procesos sostenibles y respeto por la tradición panadera.",
  },
  {
    title: "Momentos únicos",
    desc: "Cada croissant, cada pan, cada hojaldre que sale de tu horno es una experiencia que tus clientes recordarán.",
  },
]

interface WordRect {
  cx: number
  cy: number
  rx: number
  ry: number
}

export default function ManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const connectorRef = useRef<SVGPathElement>(null)
  const loopRefs = useRef<(SVGPathElement | null)[]>([])
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [rects, setRects] = useState<WordRect[]>([])

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const trackRect = track.getBoundingClientRect()
    const measured: WordRect[] = []

    wordRefs.current.forEach((span) => {
      if (!span) return
      const r = span.getBoundingClientRect()
      const cx = r.left - trackRect.left + r.width / 2
      const cy = r.top - trackRect.top + r.height / 2
      measured.push({
        cx,
        cy,
        rx: r.width / 2 + 18,
        ry: r.height / 2 + 14,
      })
    })

    setRects(measured)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener("resize", measure)
    document.fonts?.ready?.then(measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const container = containerRef.current
    const track = trackRef.current
    const connector = connectorRef.current
    if (!container || !track || !connector) return
    if (rects.length === 0) return

    const scrollAmount = track.scrollWidth - window.innerWidth
    const vw = window.innerWidth
    const trackW = track.scrollWidth

    // ── Connector setup ──
    const connectorLen = connector.getTotalLength()
    connector.style.strokeDasharray = `${connectorLen}`
    connector.style.strokeDashoffset = `${connectorLen}`

    // ── Loop setup ──
    const loops = loopRefs.current.filter(Boolean) as SVGPathElement[]
    const loopLens = loops.map((el) => {
      const len = el.getTotalLength()
      el.style.strokeDasharray = `${len}`
      el.style.strokeDashoffset = `${len}`
      return len
    })

    // Precompute each loop's trigger and deadline based on viewport position
    const loopTimings = rects.map((r) => {
      // Trigger: word center reaches 60% of viewport from the left
      const triggerOffset = r.cx - vw * 0.6
      const triggerP = Math.max(0, triggerOffset / scrollAmount)

      // Deadline: word's right edge exits the viewport (crosses left edge)
      const deadlineP = Math.min(1, (r.cx + r.rx) / scrollAmount)

      // Draw over 35% of available window, at least 3% of total scroll
      const available = deadlineP - triggerP
      const drawRange = Math.max(0.03, available * 0.35)

      return { triggerP, drawEnd: Math.min(deadlineP, triggerP + drawRange) }
    })

    const trackTween = gsap.to(track, { x: -scrollAmount, ease: "none" })

    const st = ScrollTrigger.create({
      animation: trackTween,
      trigger: container,
      start: "top top",
      end: `+=${scrollAmount}`,
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress

        // Connector: always drawn to the viewport's right edge
        const drawnX = p * scrollAmount + vw
        const connFraction = Math.min(1, drawnX / trackW)
        connector.style.strokeDashoffset = `${connectorLen * (1 - connFraction)}`

        // Each loop: quick draw triggered by viewport position,
        // guaranteed to finish before word exits
        loops.forEach((el, i) => {
          const { triggerP, drawEnd } = loopTimings[i]
          const range = drawEnd - triggerP
          const localP = Math.min(1, Math.max(0, (p - triggerP) / range))
          el.style.strokeDashoffset = `${loopLens[i] * (1 - localP)}`
        })
      },
    })

    return () => {
      st.kill()
      trackTween.kill()
    }
  }, [rects])

  const f = (n: number) => n.toFixed(1)

  return (
    <div
      ref={containerRef}
      id="manifesto"
      className="relative w-full h-screen overflow-hidden bg-[#27282E]"
    >
      <div
        ref={trackRef}
        className="relative flex h-full"
        style={{ willChange: "transform" }}
      >
        {rects.length > 0 && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: `${values.length * 100}vw`,
              height: "100%",
              overflow: "visible",
            }}
          >
            {/* Horizontal connector line spanning full track */}
            <path
              ref={connectorRef}
              d={`M 0,${f(rects[0].cy)} L ${trackRef.current?.scrollWidth ?? 4000},${f(rects[0].cy)}`}
              fill="none"
              stroke="#DFD860"
              strokeWidth="1"
              strokeOpacity="0.2"
              strokeLinecap="round"
            />

            {/* Ellipse loops — each triggered independently by viewport */}
            {rects.map((r, i) => (
              <path
                key={i}
                ref={(el) => {
                  loopRefs.current[i] = el
                }}
                d={`M ${f(r.cx - r.rx)},${f(r.cy)} A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx + r.rx)},${f(r.cy)} A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx - r.rx)},${f(r.cy)}`}
                fill="none"
                stroke="#DFD860"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeLinecap="round"
              />
            ))}
          </svg>
        )}

        {values.map((v, i) => {
          const words = v.title.split(" ")
          const firstWord = words[0]
          const rest = words.slice(1).join(" ")

          return (
            <div
              key={v.title}
              className="flex-shrink-0 w-screen h-full px-8 md:px-16 lg:px-24 pt-[35vh]"
            >
              <div className="max-w-3xl mx-auto">
                <h3 className="text-[clamp(2rem,7vw,5rem)] font-bold text-[#DFD860] leading-[1.1] mb-6">
                  <span
                    ref={(el) => {
                      wordRefs.current[i] = el
                    }}
                  >
                    {firstWord}
                  </span>
                  {rest && ` ${rest}`}
                </h3>
                <p className="text-[clamp(1rem,2vw,1.5rem)] text-[#DFD860]/45 max-w-[50ch] leading-relaxed">
                  {v.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
