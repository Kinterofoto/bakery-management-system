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
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const container = containerRef.current
    const track = trackRef.current
    const line = lineRef.current
    if (!container || !track || !line) return

    const scrollAmount = track.scrollWidth - window.innerWidth

    // Horizontal scroll
    const trackTween = gsap.to(track, {
      x: -scrollAmount,
      ease: "none",
    })

    // Line draws from left to right in sync
    const lineTween = gsap.to(line, {
      scaleX: 1,
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
        // Sync line progress with scroll
        lineTween.progress(self.progress)
      },
    })

    return () => {
      st.kill()
      trackTween.kill()
      lineTween.kill()
    }
  }, [])

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
        {/* Connecting line — spans the full track width */}
        <div
          ref={lineRef}
          className="absolute left-0 h-[1px] pointer-events-none"
          style={{
            top: "50%",
            width: `${values.length * 100}vw`,
            backgroundColor: "#DFD860",
            opacity: 0.2,
            transformOrigin: "left center",
            transform: "scaleX(0)",
          }}
        />

        {values.map((v) => (
          <div
            key={v.title}
            className="flex-shrink-0 w-screen h-full flex items-center justify-center px-8 md:px-16 lg:px-24"
          >
            <div className="max-w-3xl w-full">
              {/* Fixed-height title area for consistent alignment */}
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
