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

// Hand-drawn ellipse via Catmull-Rom spline through wobbled anchors
function organicEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number
): string {
  const n = 8
  const anchors: { x: number; y: number }[] = []

  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2
    const w =
      1 +
      Math.sin(seed * 11 + angle * 2.5) * 0.07 +
      Math.cos(seed * 7 + angle * 4) * 0.04
    anchors.push({
      x: cx + Math.cos(angle) * rx * w,
      y: cy + Math.sin(angle) * ry * w,
    })
  }

  // Close the loop
  anchors.push({ ...anchors[0] })

  const len = anchors.length - 1
  let d = `M ${anchors[0].x.toFixed(1)},${anchors[0].y.toFixed(1)}`

  for (let i = 0; i < len; i++) {
    const p0 = anchors[(i - 1 + len) % len]
    const p1 = anchors[i]
    const p2 = anchors[i + 1]
    const p3 = anchors[(i + 2) % len]

    // Catmull-Rom → cubic Bézier
    const t = 1 / 3
    const cp1x = p1.x + (p2.x - p0.x) * t
    const cp1y = p1.y + (p2.y - p0.y) * t
    const cp2x = p2.x - (p3.x - p1.x) * t
    const cp2y = p2.y - (p3.y - p1.y) * t

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }

  return d
}

// Wavy connector line between two points
function wavyLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number
): string {
  const dist = Math.abs(x2 - x1)
  const amplitude = 4 + Math.sin(seed * 5) * 2
  const segments = Math.max(3, Math.ceil(dist / 60))

  let d = `M ${x1.toFixed(1)},${y1.toFixed(1)}`

  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const prevT = (i - 0.5) / segments
    const x = x1 + (x2 - x1) * t
    const baseY = y1 + (y2 - y1) * t
    const cpX = x1 + (x2 - x1) * prevT
    const cpBaseY = y1 + (y2 - y1) * prevT
    const wobble = Math.sin(cpX * 0.012 + seed * 3) * amplitude

    d += ` Q ${cpX.toFixed(1)},${(cpBaseY + wobble).toFixed(1)} ${x.toFixed(1)},${baseY.toFixed(1)}`
  }

  return d
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
      const cx = r.left - trackRect.left + r.width / 2
      const cy = r.top - trackRect.top + r.height / 2
      const px = 18
      const py = 14
      measured.push({
        cx,
        cy,
        rx: r.width / 2 + px,
        ry: r.height / 2 + py,
      })
    })

    setRects(measured)
  }, [])

  // Measure on mount + resize
  useEffect(() => {
    measure()
    window.addEventListener("resize", measure)
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

    // Set up stroke-dasharray on all SVG paths
    const connector = svg.querySelector<SVGPathElement>(".line-connector")
    const loops = svg.querySelectorAll<SVGPathElement>(".line-loop")

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

        // Draw each ellipse — fast, early in each panel
        loops.forEach((el, i) => {
          const len = parseFloat(el.style.strokeDasharray)
          const panelStart = i / values.length
          const drawStart = panelStart + 0.01
          const drawEnd = panelStart + 0.20
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

  // Build wavy connector path between ellipses
  const buildConnector = () => {
    if (rects.length === 0) return ""
    const parts: string[] = []

    // Left edge to first ellipse
    parts.push(
      wavyLine(0, rects[0].cy, rects[0].cx - rects[0].rx, rects[0].cy, 1)
    )

    // Between each ellipse — flows between different y positions
    for (let i = 0; i < rects.length - 1; i++) {
      const from = rects[i]
      const to = rects[i + 1]
      parts.push(
        wavyLine(from.cx + from.rx, from.cy, to.cx - to.rx, to.cy, i + 2)
      )
    }

    // Last ellipse to right edge
    const last = rects[rects.length - 1]
    const trackW = trackRef.current?.scrollWidth ?? 4000
    parts.push(wavyLine(last.cx + last.rx, last.cy, trackW, last.cy, 5))

    return parts.join(" ")
  }

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
            {/* Wavy connector lines */}
            <path
              className="line-connector"
              d={buildConnector()}
              fill="none"
              stroke="#DFD860"
              strokeWidth="1"
              strokeOpacity="0.2"
              strokeLinecap="round"
            />

            {/* Organic ellipse loops around first words */}
            {rects.map((r, i) => (
              <path
                key={i}
                className="line-loop"
                d={organicEllipse(r.cx, r.cy, r.rx, r.ry, i + 1)}
                fill="none"
                stroke="#DFD860"
                strokeWidth="1.2"
                strokeOpacity="0.3"
                strokeLinecap="round"
                transform={`rotate(${Math.sin((i + 1) * 7) * 3}, ${r.cx}, ${r.cy})`}
              />
            ))}
          </svg>
        )}

        {/* Panel content — fixed top padding for consistent first-line alignment */}
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
