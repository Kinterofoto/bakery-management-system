"use client"

import { useEffect, useRef } from "react"
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

export default function ManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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

    const scrollAmount = track.scrollWidth - window.innerWidth

    // Get all SVG strokes (connecting line + ellipses)
    const connectorPath = svg.querySelector<SVGPathElement>(".line-connector")
    const ellipses = svg.querySelectorAll<SVGEllipseElement>(".line-loop")

    // Set up stroke-dasharray on the connector line
    if (connectorPath) {
      const len = connectorPath.getTotalLength()
      connectorPath.style.strokeDasharray = `${len}`
      connectorPath.style.strokeDashoffset = `${len}`
    }

    // Set up stroke-dasharray on each ellipse
    ellipses.forEach((el) => {
      const len = el.getTotalLength()
      el.style.strokeDasharray = `${len}`
      el.style.strokeDashoffset = `${len}`
    })

    // Horizontal scroll tween
    const trackTween = gsap.to(track, {
      x: -scrollAmount,
      ease: "none",
    })

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
        const p = self.progress // 0–1

        // Draw the connector line proportionally
        if (connectorPath) {
          const len = parseFloat(connectorPath.style.strokeDasharray)
          connectorPath.style.strokeDashoffset = `${len * (1 - p)}`
        }

        // Draw each ellipse when scroll reaches its panel
        ellipses.forEach((el, i) => {
          const len = parseFloat(el.style.strokeDasharray)
          // Each panel occupies 1/4 of total scroll
          // Ellipse starts drawing a little before center and finishes a little after
          const panelCenter = (i + 0.4) / values.length
          const drawStart = panelCenter - 0.08
          const drawEnd = panelCenter + 0.08
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
  }, [])

  // SVG viewBox: each panel = 1000 units wide, total 4000 × 200
  // Connector line at y=100, ellipses centered around each panel's title area
  // Ellipse positions: ~280 within each 1000-unit panel (left-aligned content)
  const ellipseRx = 180
  const ellipseRy = 35
  const lineY = 100
  const panelOffsets = [280, 1280, 2280, 3280]

  // Build connector path: straight line segments between ellipse edges
  const connectorD = [
    `M 0,${lineY}`,
    `L ${panelOffsets[0] - ellipseRx},${lineY}`, // to left of ellipse 1
    `M ${panelOffsets[0] + ellipseRx},${lineY}`, // from right of ellipse 1
    `L ${panelOffsets[1] - ellipseRx},${lineY}`, // to left of ellipse 2
    `M ${panelOffsets[1] + ellipseRx},${lineY}`,
    `L ${panelOffsets[2] - ellipseRx},${lineY}`,
    `M ${panelOffsets[2] + ellipseRx},${lineY}`,
    `L ${panelOffsets[3] - ellipseRx},${lineY}`,
    `M ${panelOffsets[3] + ellipseRx},${lineY}`,
    `L 4000,${lineY}`,
  ].join(" ")

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
        {/* SVG line + loops overlay */}
        <svg
          ref={svgRef}
          viewBox="0 0 4000 200"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: `${values.length * 100}vw` }}
        >
          {/* Connecting line segments */}
          <path
            className="line-connector"
            d={connectorD}
            fill="none"
            stroke="#DFD860"
            strokeWidth="1.2"
            strokeOpacity="0.3"
          />

          {/* Ellipse loops around each panel's title */}
          {panelOffsets.map((cx, i) => (
            <ellipse
              key={i}
              className="line-loop"
              cx={cx}
              cy={lineY}
              rx={ellipseRx}
              ry={ellipseRy}
              fill="none"
              stroke="#DFD860"
              strokeWidth="1.2"
              strokeOpacity="0.3"
            />
          ))}
        </svg>

        {/* Panel content */}
        {values.map((v) => (
          <div
            key={v.title}
            className="flex-shrink-0 w-screen h-full flex items-center justify-center px-8 md:px-16 lg:px-24"
          >
            <div className="max-w-3xl w-full">
              <div className="min-h-[6em] sm:min-h-[5em] flex items-end mb-6">
                <h3 className="text-[clamp(2rem,7vw,5rem)] font-bold text-[#DFD860] leading-[1.1]">
                  {v.title}
                </h3>
              </div>
              <p className="text-[clamp(1rem,2vw,1.5rem)] text-[#DFD860]/45 max-w-[50ch] leading-relaxed">
                {v.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
