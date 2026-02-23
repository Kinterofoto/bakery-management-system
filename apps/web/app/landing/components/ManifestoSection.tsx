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
  const svgRef = useRef<SVGSVGElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [rects, setRects] = useState<WordRect[]>([])

  // Measure first-word positions relative to the track
  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const trackRect = track.getBoundingClientRect()
    const measured: WordRect[] = []

    wordRefs.current.forEach((span) => {
      if (!span) return
      const r = span.getBoundingClientRect()
      // Position relative to track (not viewport)
      const cx = r.left - trackRect.left + r.width / 2
      const cy = r.top - trackRect.top + r.height / 2
      const padding = 16
      measured.push({
        cx,
        cy,
        rx: r.width / 2 + padding,
        ry: r.height / 2 + padding,
      })
    })

    setRects(measured)
  }, [])

  // Measure on mount + resize
  useEffect(() => {
    measure()
    window.addEventListener("resize", measure)
    // Re-measure after fonts load
    document.fonts?.ready?.then(measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  // GSAP animation
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const container = containerRef.current
    const track = trackRef.current
    const svg = svgRef.current
    if (!container || !track || !svg) return
    if (rects.length === 0) return

    const scrollAmount = track.scrollWidth - window.innerWidth

    // Set up stroke-dasharray on all SVG strokes
    const connector = svg.querySelector<SVGPathElement>(".line-connector")
    const loops = svg.querySelectorAll<SVGEllipseElement>(".line-loop")

    if (connector) {
      const len = connector.getTotalLength()
      connector.style.strokeDasharray = `${len}`
      connector.style.strokeDashoffset = `${len}`
    }

    loops.forEach((el) => {
      const len = el.getTotalLength()
      el.style.strokeDasharray = `${len}`
      el.style.strokeDashoffset = `${len}`
    })

    // Horizontal scroll
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

        // Draw connector
        if (connector) {
          const len = parseFloat(connector.style.strokeDasharray)
          connector.style.strokeDashoffset = `${len * (1 - p)}`
        }

        // Draw each ellipse when scroll reaches its panel
        loops.forEach((el, i) => {
          const len = parseFloat(el.style.strokeDasharray)
          const panelCenter = (i + 0.35) / values.length
          const drawStart = panelCenter - 0.06
          const drawEnd = panelCenter + 0.10
          const localP = Math.min(
            1,
            Math.max(0, (p - drawStart) / (drawEnd - drawStart))
          )
          el.style.strokeDashoffset = `${len * (1 - localP)}`
        })
      },
    })

    return () => {
      st.kill()
      trackTween.kill()
    }
  }, [rects])

  // Build connector path between ellipses
  const buildConnector = () => {
    if (rects.length === 0) return ""
    const parts: string[] = []
    const lineY = rects[0]?.cy ?? 0

    // Start from left edge to first ellipse
    parts.push(`M 0,${lineY}`)
    parts.push(`L ${rects[0].cx - rects[0].rx},${lineY}`)

    // Between each ellipse
    for (let i = 0; i < rects.length - 1; i++) {
      const from = rects[i]
      const to = rects[i + 1]
      parts.push(`M ${from.cx + from.rx},${from.cy}`)
      parts.push(`L ${to.cx - to.rx},${to.cy}`)
    }

    // From last ellipse to right edge
    const last = rects[rects.length - 1]
    const trackW = trackRef.current?.scrollWidth ?? 4000
    parts.push(`M ${last.cx + last.rx},${last.cy}`)
    parts.push(`L ${trackW},${last.cy}`)

    return parts.join(" ")
  }

  const trackH = trackRef.current?.offsetHeight ?? 1000

  return (
    <div
      ref={containerRef}
      id="manifesto"
      className="relative w-full h-screen overflow-hidden bg-[#27282E]"
    >
      <div
        ref={trackRef}
        className="relative flex h-full items-center"
        style={{ willChange: "transform" }}
      >
        {/* SVG overlay — pixel-matched to track */}
        {rects.length > 0 && (
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: `${values.length * 100}vw`,
              height: "100%",
              overflow: "visible",
            }}
          >
            {/* Connector lines between ellipses */}
            <path
              className="line-connector"
              d={buildConnector()}
              fill="none"
              stroke="#DFD860"
              strokeWidth="1"
              strokeOpacity="0.25"
            />

            {/* Ellipse loops measured from actual word positions */}
            {rects.map((r, i) => (
              <ellipse
                key={i}
                className="line-loop"
                cx={r.cx}
                cy={r.cy}
                rx={r.rx}
                ry={r.ry}
                fill="none"
                stroke="#DFD860"
                strokeWidth="1"
                strokeOpacity="0.25"
              />
            ))}
          </svg>
        )}

        {/* Panel content */}
        {values.map((v, i) => {
          const words = v.title.split(" ")
          const firstWord = words[0]
          const rest = words.slice(1).join(" ")

          return (
            <div
              key={v.title}
              className="flex-shrink-0 w-screen h-full flex items-center justify-center px-8 md:px-16 lg:px-24"
            >
              <div className="max-w-3xl w-full">
                <div className="min-h-[6em] sm:min-h-[5em] flex items-end mb-6">
                  <h3 className="text-[clamp(2rem,7vw,5rem)] font-bold text-[#DFD860] leading-[1.1]">
                    <span
                      ref={(el) => {
                        wordRefs.current[i] = el
                      }}
                    >
                      {firstWord}
                    </span>
                    {rest && ` ${rest}`}
                  </h3>
                </div>
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
