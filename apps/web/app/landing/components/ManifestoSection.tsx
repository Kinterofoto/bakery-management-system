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
  const pathRef = useRef<SVGPathElement>(null)
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
    const path = pathRef.current
    if (!container || !track || !path) return
    if (rects.length === 0) return

    const scrollAmount = track.scrollWidth - window.innerWidth
    const totalLen = path.getTotalLength()
    path.style.strokeDasharray = `${totalLen}`
    path.style.strokeDashoffset = `${totalLen}`

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
        // Draw the line 3x faster than the scroll so loops complete
        // while their words are still on-screen
        const lineProgress = Math.min(1, self.progress * 3)
        path.style.strokeDashoffset = `${totalLen * (1 - lineProgress)}`
      },
    })

    return () => {
      st.kill()
      trackTween.kill()
    }
  }, [rects])

  // One continuous path: straight connectors + elliptical loops around each word
  const buildPath = () => {
    if (rects.length === 0) return ""
    const f = (n: number) => n.toFixed(1)

    const r0 = rects[0]
    let d = `M 0,${f(r0.cy)}`

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]

      // Straight line to left edge of word
      d += ` L ${f(r.cx - r.rx)},${f(r.cy)}`

      // Full clockwise ellipse loop:
      // Bottom arc: left → bottom → right
      d += ` A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx + r.rx)},${f(r.cy)}`
      // Top arc: right → top → left (completes the loop)
      d += ` A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx - r.rx)},${f(r.cy)}`
    }

    // From last word to right edge
    const last = rects[rects.length - 1]
    const trackW = trackRef.current?.scrollWidth ?? 4000
    d += ` L ${trackW},${f(last.cy)}`

    return d
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
        {/* Single SVG path — connectors + loops as one continuous stroke */}
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
            <path
              ref={pathRef}
              d={buildPath()}
              fill="none"
              stroke="#DFD860"
              strokeWidth="1"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
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
