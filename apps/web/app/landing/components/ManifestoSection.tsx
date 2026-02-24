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

function ellipseCirc(rx: number, ry: number): number {
  return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))
}

export default function ManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
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
      measured.push({
        cx: r.left - trackRect.left + r.width / 2,
        cy: r.top - trackRect.top + r.height / 2,
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

    const vw = window.innerWidth
    const totalLen = path.getTotalLength()
    path.style.strokeDasharray = `${totalLen}`
    path.style.strokeDashoffset = `${totalLen}`

    // ── Build path segments ──
    const segs: { len: number }[] = []
    segs.push({ len: 0 }) // no initial connector line
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      segs.push({ len: ellipseCirc(r.rx, r.ry) })
      if (i < rects.length - 1) {
        segs.push({ len: 0 }) // no connector line between ellipses
      }
    }
    const cumPath = [0]
    segs.forEach((s) => cumPath.push(cumPath[cumPath.length - 1] + s.len))
    const approxTotal = cumPath[cumPath.length - 1]

    // ── Phase-based animation ──
    // HOLD: panel stays still, ellipse draws around the word
    // TRANSITION: panel scrolls to the next, connector line draws
    const N = rects.length
    const holdPx = vw * 0.25
    const transPx = vw
    const totalScroll = N * holdPx + (N - 1) * transPx

    interface Phase {
      pStart: number
      pEnd: number
      drawStart: number
      drawEnd: number
      trackXStart: number
      trackXEnd: number
    }

    const phases: Phase[] = []
    let scrollPos = 0

    for (let i = 0; i < N; i++) {
      // ── Hold phase: draw the ellipse (panel static) ──
      const hStart = scrollPos / totalScroll
      const hEnd = (scrollPos + holdPx) / totalScroll

      let drawStart: number
      let drawEnd: number

      if (i === 0) {
        // Initial connector + loop 0
        drawStart = 0
        drawEnd = cumPath[2]
      } else {
        // Loop i only
        drawStart = cumPath[2 * i + 1]
        drawEnd = cumPath[2 * i + 2]
      }

      phases.push({
        pStart: hStart,
        pEnd: hEnd,
        drawStart,
        drawEnd,
        trackXStart: -i * vw,
        trackXEnd: -i * vw,
      })
      scrollPos += holdPx

      // ── Transition phase: scroll to next panel, draw connector ──
      if (i < N - 1) {
        const tStart = scrollPos / totalScroll
        const tEnd = (scrollPos + transPx) / totalScroll

        phases.push({
          pStart: tStart,
          pEnd: tEnd,
          drawStart: cumPath[2 * i + 2],
          drawEnd: cumPath[2 * i + 3],
          trackXStart: -i * vw,
          trackXEnd: -(i + 1) * vw,
        })
        scrollPos += transPx
      }
    }

    const st = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: `+=${totalScroll}`,
      pin: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress

        // Find current phase
        let phase = phases[phases.length - 1]
        for (const ph of phases) {
          if (p <= ph.pEnd) {
            phase = ph
            break
          }
        }

        const range = phase.pEnd - phase.pStart
        const t = range > 0 ? Math.min(1, (p - phase.pStart) / range) : 1

        // Track position
        gsap.set(track, {
          x: phase.trackXStart + (phase.trackXEnd - phase.trackXStart) * t,
        })

        // Line draw
        const drawLen = phase.drawStart + (phase.drawEnd - phase.drawStart) * t
        const fraction = Math.min(1, drawLen / approxTotal)
        path.style.strokeDashoffset = `${totalLen * (1 - fraction)}`
      },
    })

    return () => {
      st.kill()
    }
  }, [rects])

  const buildPath = () => {
    if (rects.length === 0) return ""
    const f = (n: number) => n.toFixed(1)
    let d = ""

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      // Move to start of ellipse (no connector line)
      d += ` M ${f(r.cx - r.rx)},${f(r.cy)}`
      d += ` A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx + r.rx)},${f(r.cy)}`
      d += ` A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx - r.rx)},${f(r.cy)}`
    }

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
        {rects.length > 0 && (
          <svg
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
