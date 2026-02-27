"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const values = [
  {
    title: "Obsesi\u00F3n por el producto",
    desc: "Seleccionamos cada ingrediente con rigor. Nuestras masas congeladas conservan el sabor y la textura de lo recién horneado.",
  },
  {
    title: "Expertos en hojaldre",
    desc: "Dominamos cada capa, cada pliegue, cada laminado. Nuestro hojaldre llega listo para que tu horno haga el resto.",
  },
  {
    title: "Pasión y conciencia",
    desc: "Producción 100% colombiana 🇨🇴 con ingredientes locales, procesos sostenibles y respeto por la tradición panadera.",
  },
  {
    title: "Creamos momentos únicos",
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
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
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
        rx: r.width / 2 + 24,
        ry: r.height / 2 + 18,
      })
    })
    setRects(measured)
  }, [])

  useEffect(() => {
    // Measure after layout settles and fonts load
    requestAnimationFrame(measure)
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
    if (!container || !track) return
    if (rects.length === 0) return

    const vw = window.innerWidth
    const N = rects.length

    // ── Initialize each ellipse path as fully hidden ──
    const pathLens: number[] = []
    for (let i = 0; i < N; i++) {
      const p = pathRefs.current[i]
      if (!p) {
        pathLens.push(0)
        continue
      }
      const len = p.getTotalLength()
      pathLens.push(len)
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
    }

    // ── Phase-based animation ──
    // HOLD: panel stays still, ellipse draws around the word
    // TRANSITION: panel scrolls to the next (no drawing)
    const holdPx = vw * 0.25
    const transPx = vw
    const totalScroll = N * holdPx + (N - 1) * transPx

    interface Phase {
      pStart: number
      pEnd: number
      type: "hold" | "transition"
      wordIndex: number
      trackXStart: number
      trackXEnd: number
    }

    const phases: Phase[] = []
    let scrollPos = 0

    for (let i = 0; i < N; i++) {
      // ── Hold phase: draw the ellipse (panel static) ──
      const hStart = scrollPos / totalScroll
      const hEnd = (scrollPos + holdPx) / totalScroll
      phases.push({
        pStart: hStart,
        pEnd: hEnd,
        type: "hold",
        wordIndex: i,
        trackXStart: -i * vw,
        trackXEnd: -i * vw,
      })
      scrollPos += holdPx

      // ── Transition phase: scroll to next panel (no drawing) ──
      if (i < N - 1) {
        const tStart = scrollPos / totalScroll
        const tEnd = (scrollPos + transPx) / totalScroll
        phases.push({
          pStart: tStart,
          pEnd: tEnd,
          type: "transition",
          wordIndex: i,
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
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress

        // Find current phase
        let phase = phases[phases.length - 1]
        let phaseIdx = phases.length - 1
        for (let j = 0; j < phases.length; j++) {
          if (p <= phases[j].pEnd) {
            phase = phases[j]
            phaseIdx = j
            break
          }
        }

        const range = phase.pEnd - phase.pStart
        const t = range > 0 ? Math.min(1, (p - phase.pStart) / range) : 1

        // Track position
        gsap.set(track, {
          x: phase.trackXStart + (phase.trackXEnd - phase.trackXStart) * t,
        })

        // Update each ellipse path independently
        for (let i = 0; i < N; i++) {
          const pathEl = pathRefs.current[i]
          if (!pathEl || !pathLens[i]) continue

          const holdPhaseIdx = i * 2 // hold phase for word i is at index i*2
          if (phaseIdx > holdPhaseIdx) {
            // Past this word's hold phase — fully drawn
            pathEl.style.strokeDashoffset = "0"
          } else if (phaseIdx === holdPhaseIdx) {
            // Currently drawing this ellipse
            pathEl.style.strokeDashoffset = `${pathLens[i] * (1 - t)}`
          } else {
            // Future — still hidden
            pathEl.style.strokeDashoffset = `${pathLens[i]}`
          }
        }
      },
    })

    return () => {
      st.kill()
    }
  }, [rects])

  const buildEllipsePath = (r: WordRect) => {
    const f = (n: number) => n.toFixed(1)
    return `M ${f(r.cx - r.rx)},${f(r.cy)} A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx + r.rx)},${f(r.cy)} A ${f(r.rx)} ${f(r.ry)} 0 0 1 ${f(r.cx - r.rx)},${f(r.cy)}`
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
            {rects.map((r, i) => (
              <path
                key={i}
                ref={(el) => {
                  pathRefs.current[i] = el
                }}
                d={buildEllipsePath(r)}
                fill="none"
                stroke="#DFD860"
                strokeWidth="3"
                strokeOpacity="0.55"
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
              className="flex-shrink-0 w-screen h-full px-6 sm:px-10 md:px-16 lg:px-24 flex items-center justify-center"
            >
              <div className="max-w-5xl w-full text-center">
                <h3 className="text-[clamp(1.5rem,5.5vw,4.5rem)] font-bold text-[#DFD860] leading-[1.1] mb-8">
                  <span
                    ref={(el) => {
                      wordRefs.current[i] = el
                    }}
                  >
                    {firstWord}
                  </span>
                  {rest && ` ${rest}`}
                </h3>
                <p className="text-[clamp(1.05rem,2.2vw,1.65rem)] text-[#DFD860]/75 max-w-[55ch] mx-auto leading-relaxed">
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
