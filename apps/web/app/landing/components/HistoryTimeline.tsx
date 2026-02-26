"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

interface Milestone {
  year: number
  date?: string
  description: string
  image: string
  position: "above" | "below"
}

const milestones: Milestone[] = [
  {
    year: 2011,
    date: "15 de septiembre",
    description: "Una idea que nace",
    image: "/landing/historia/historia-2011.jpg",
    position: "above",
  },
  {
    year: 2017,
    description:
      "Nos convertimos en especialistas en hojaldre en nuestra primera planta de 350 M\u00B2",
    image: "/landing/historia/historia-2017.jpg",
    position: "below",
  },
  {
    year: 2019,
    description: "Crecemos y nos pasamos a una planta de 1300 M\u00B2",
    image: "/landing/historia/historia-2019.jpg",
    position: "above",
  },
  {
    year: 2020,
    description: "Llega la pandemia y nos revolucionamos",
    image: "/landing/historia/historia-2020.jpg",
    position: "below",
  },
  {
    year: 2025,
    description:
      "Sigue creciendo nuestro equipo y nos aliamos con La Fabrika",
    image: "/landing/historia/historia-2025.jpg",
    position: "above",
  },
]

const N = milestones.length
const SLOT_VW = 40
const SPACER_VW = 30
// Total track width in vw units
const TRACK_VW = SPACER_VW * 2 + N * SLOT_VW // 260vw
// Scroll distance = how far the track needs to translate
const SCROLL_VW = TRACK_VW - 100 // 160vw

export default function HistoryTimeline() {
  // Shared ref for the outer section (used by both desktop & mobile ScrollTriggers)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Desktop refs
  const desktopWrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const stemsRef = useRef<(HTMLDivElement | null)[]>([])
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  // Mobile refs
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const mobileLineRef = useRef<SVGPathElement>(null)
  const mobileDotsRef = useRef<(HTMLDivElement | null)[]>([])
  const mobileCardsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReduced) {
      ;[...dotsRef.current, ...mobileDotsRef.current].forEach((d) => {
        if (d) {
          d.style.transform = "scale(1)"
          d.style.opacity = "1"
        }
      })
      stemsRef.current.forEach((s) => {
        if (s) {
          s.style.transform = "scaleY(1)"
          s.style.opacity = "1"
        }
      })
      ;[...cardsRef.current, ...mobileCardsRef.current].forEach((c) => {
        if (c) {
          c.style.transform = "none"
          c.style.opacity = "1"
        }
      })
      const ml = mobileLineRef.current
      if (ml) ml.style.strokeDashoffset = "0"
      const dl = lineRef.current
      if (dl) {
        dl.style.strokeDashoffset = "0"
      }
      return
    }

    const mm = gsap.matchMedia()

    // ── Desktop: sticky container + ScrollTrigger (NO pin) ──
    // Uses CSS sticky instead of ScrollTrigger pin to avoid
    // conflicts with ManifestoSection's pinned scroll.
    mm.add("(min-width: 768px)", () => {
      const wrapper = desktopWrapperRef.current
      const track = trackRef.current
      const line = lineRef.current
      if (!wrapper || !track || !line) return

      const vw = window.innerWidth / 100
      const slotPx = SLOT_VW * vw
      const spacerPx = SPACER_VW * vw
      const totalScrollPx = SCROLL_VW * vw

      // SVG line endpoints
      const lineStartX = spacerPx + slotPx / 2
      const lineEndX = spacerPx + (N - 1) * slotPx + slotPx / 2
      const lineLength = lineEndX - lineStartX

      line.setAttribute("d", `M ${lineStartX} 3 L ${lineEndX} 3`)
      line.style.strokeDasharray = `${lineLength}`
      line.style.strokeDashoffset = `${lineLength}`

      // Initial hidden states
      dotsRef.current.forEach((d) => {
        if (d) {
          d.style.transform = "scale(0)"
          d.style.opacity = "0"
        }
      })
      stemsRef.current.forEach((s) => {
        if (s) {
          s.style.transform = "scaleY(0)"
          s.style.opacity = "0"
        }
      })
      cardsRef.current.forEach((c, i) => {
        if (c) {
          const yOff = milestones[i].position === "above" ? 30 : -30
          c.style.transform = `translateY(${yOff}px)`
          c.style.opacity = "0"
        }
      })

      // ScrollTrigger drives the animation as you scroll through
      // the tall wrapper. The sticky inner container stays visible.
      // NO pin — avoids conflict with ManifestoSection.
      const st = ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress

          // Translate track horizontally
          track.style.transform = `translateX(${-totalScrollPx * p}px)`

          // Draw SVG line
          line.style.strokeDashoffset = `${lineLength * (1 - p)}`

          // Reveal milestones
          for (let i = 0; i < N; i++) {
            const threshold = i / (N - 1)
            const margin = 0.08
            const start = Math.max(0, threshold - margin)
            const end = Math.min(1, threshold + margin)

            let t: number
            if (p >= end) t = 1
            else if (p <= start) t = 0
            else t = (p - start) / (end - start)

            const e = 1 - Math.pow(1 - t, 3)

            const dot = dotsRef.current[i]
            const stem = stemsRef.current[i]
            const card = cardsRef.current[i]

            if (dot) {
              dot.style.transform = `scale(${e})`
              dot.style.opacity = `${e}`
            }
            if (stem) {
              stem.style.transform = `scaleY(${e})`
              stem.style.opacity = `${e}`
            }
            if (card) {
              const yOff =
                milestones[i].position === "above"
                  ? (1 - e) * 30
                  : -(1 - e) * 30
              card.style.opacity = `${e}`
              card.style.transform = `translateY(${yOff}px)`
            }
          }
        },
      })

      return () => st.kill()
    })

    // ── Mobile: vertical scroll-driven timeline ──
    mm.add("(max-width: 767px)", () => {
      const section = sectionRef.current
      const container = mobileContainerRef.current
      const line = mobileLineRef.current
      if (!section || !container || !line) return

      const containerHeight = container.scrollHeight
      line.setAttribute("d", `M 3 0 L 3 ${containerHeight}`)
      const lineLength = line.getTotalLength()
      line.style.strokeDasharray = `${lineLength}`
      line.style.strokeDashoffset = `${lineLength}`

      mobileDotsRef.current.forEach((d) => {
        if (d) {
          d.style.transform = "scale(0)"
          d.style.opacity = "0"
        }
      })
      mobileCardsRef.current.forEach((c) => {
        if (c) {
          c.style.transform = "translateX(-20px)"
          c.style.opacity = "0"
        }
      })

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 80%",
        end: "bottom 20%",
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress

          line.style.strokeDashoffset = `${lineLength * (1 - p)}`

          for (let i = 0; i < N; i++) {
            const threshold = i / (N - 1)
            const margin = 0.12
            const start = Math.max(0, threshold - margin)
            const end = Math.min(1, threshold + margin)

            let t: number
            if (p >= end) t = 1
            else if (p <= start) t = 0
            else t = (p - start) / (end - start)

            const e = 1 - Math.pow(1 - t, 3)

            const dot = mobileDotsRef.current[i]
            const card = mobileCardsRef.current[i]

            if (dot) {
              dot.style.transform = `scale(${e})`
              dot.style.opacity = `${e}`
            }
            if (card) {
              card.style.opacity = `${e}`
              card.style.transform = `translateX(${(1 - e) * -20}px)`
            }
          }
        },
      })

      return () => st.kill()
    })

    return () => mm.revert()
  }, [])

  // Height provides scroll distance: 100vh for the visible area + 160vw for the animation
  const desktopHeightStyle = `calc(100vh + ${SCROLL_VW}vw)`

  return (
    <section
      ref={sectionRef}
      id="historia"
      className="relative z-30 bg-[#E7DBCC]"
    >
      {/* ── Desktop: tall wrapper + sticky viewport ── */}
      <div
        ref={desktopWrapperRef}
        className="hidden md:block"
        style={{ height: desktopHeightStyle }}
      >
        {/* Sticky container — stays visible while scrolling through the tall wrapper */}
        <div className="sticky top-0 h-screen overflow-hidden bg-[#E7DBCC]">
          {/* Title */}
          <div className="absolute top-0 left-0 w-full pt-12 lg:pt-16 px-8 lg:px-16 z-20 pointer-events-none">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#27282E]">
              Nuestra historia
            </h2>
          </div>

          {/* Horizontal track */}
          <div
            ref={trackRef}
            className="relative flex items-stretch h-full"
            style={{
              width: `${TRACK_VW}vw`,
              willChange: "transform",
            }}
          >
            {/* SVG line */}
            <svg
              className="absolute top-1/2 left-0 -translate-y-1/2 w-full pointer-events-none z-[2]"
              style={{ height: "6px", overflow: "visible" }}
            >
              <path
                ref={lineRef}
                fill="none"
                stroke="#27282E"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            {/* Left spacer */}
            <div
              className="flex-shrink-0"
              style={{ width: `${SPACER_VW}vw` }}
            />

            {/* Milestone slots */}
            {milestones.map((m, i) => (
              <div
                key={m.year}
                className="flex-shrink-0 relative"
                style={{ width: `${SLOT_VW}vw` }}
              >
                {/* Dot wrapper */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    ref={(el) => {
                      dotsRef.current[i] = el
                    }}
                    className="w-4 h-4 rounded-full bg-[#27282E]"
                  />
                </div>

                {/* Vertical stem */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 z-[1] ${
                    m.position === "above"
                      ? "bottom-1/2 mb-3"
                      : "top-1/2 mt-3"
                  }`}
                  style={{ height: "8vh", width: "2px" }}
                >
                  <div
                    ref={(el) => {
                      stemsRef.current[i] = el
                    }}
                    className="w-full h-full bg-[#27282E]/30"
                    style={{
                      transformOrigin:
                        m.position === "above" ? "bottom" : "top",
                    }}
                  />
                </div>

                {/* Card wrapper */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center ${
                    m.position === "above"
                      ? "bottom-[calc(50%+8vh+1.5rem)]"
                      : "top-[calc(50%+8vh+1.5rem)]"
                  }`}
                >
                  <div
                    ref={(el) => {
                      cardsRef.current[i] = el
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-24 h-24 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-full overflow-hidden border-4 border-[#27282E] shadow-lg">
                      <Image
                        src={m.image}
                        alt={`Pastry Chef en ${m.year}`}
                        width={144}
                        height={144}
                        className="object-cover w-full h-full"
                      />
                    </div>

                    <div className="text-center">
                      <span className="block text-xl lg:text-2xl xl:text-3xl font-bold text-[#27282E]">
                        {m.year}
                      </span>
                      {m.date && (
                        <span className="block text-xs lg:text-sm text-[#27282E]/50 -mt-0.5">
                          {m.date}
                        </span>
                      )}
                    </div>

                    <p className="text-xs lg:text-sm text-[#27282E]/60 text-center max-w-[200px] lg:max-w-[240px] leading-snug">
                      {m.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Right spacer */}
            <div
              className="flex-shrink-0"
              style={{ width: `${SPACER_VW}vw` }}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile: vertical scroll-driven timeline ── */}
      <div className="md:hidden px-6 py-20 bg-[#E7DBCC]">
        <h2 className="text-2xl font-bold text-[#27282E] mb-10 text-center">
          Nuestra historia
        </h2>

        <div ref={mobileContainerRef} className="relative">
          <svg
            className="absolute left-6 top-0 pointer-events-none"
            style={{ width: "6px", height: "100%", overflow: "visible" }}
          >
            <path
              ref={mobileLineRef}
              fill="none"
              stroke="#27282E"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {milestones.map((m, i) => (
            <div key={m.year} className="relative pl-14 pb-10 last:pb-0">
              <div className="absolute left-[21px] top-2 z-10">
                <div
                  ref={(el) => {
                    mobileDotsRef.current[i] = el
                  }}
                  className="w-3 h-3 rounded-full bg-[#27282E]"
                />
              </div>

              <div
                ref={(el) => {
                  mobileCardsRef.current[i] = el
                }}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#27282E] shadow-md mb-2">
                  <Image
                    src={m.image}
                    alt={`Pastry Chef en ${m.year}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </div>

                <span className="text-lg font-bold text-[#27282E] block">
                  {m.year}
                </span>
                {m.date && (
                  <span className="text-xs text-[#27282E]/50">{m.date}</span>
                )}

                <p className="text-sm text-[#27282E]/60 mt-1 leading-snug max-w-[280px]">
                  {m.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
