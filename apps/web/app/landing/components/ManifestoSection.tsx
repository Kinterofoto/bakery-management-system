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

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const container = containerRef.current
    const track = trackRef.current
    if (!container || !track) return

    // Scroll the track left by (totalWidth - viewportWidth)
    const scrollAmount = track.scrollWidth - window.innerWidth

    const st = ScrollTrigger.create({
      animation: gsap.to(track, {
        x: -scrollAmount,
        ease: "none",
      }),
      trigger: container,
      start: "top top",
      end: `+=${scrollAmount}`,
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    })

    return () => {
      st.kill()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      id="manifesto"
      className="relative w-full h-screen overflow-hidden bg-[#DFD860]"
    >
      <div
        ref={trackRef}
        className="flex h-full items-center"
        style={{ willChange: "transform" }}
      >
        {values.map((v) => (
          <div
            key={v.title}
            className="flex-shrink-0 w-screen h-full flex items-center justify-center px-8 md:px-16 lg:px-24"
          >
            <div className="max-w-3xl">
              <h3 className="text-[clamp(2rem,7vw,5rem)] font-bold text-[#27282E] leading-[1.1] mb-6">
                {v.title}
              </h3>
              <p className="text-[clamp(1rem,2vw,1.5rem)] text-[#27282E]/55 max-w-[50ch] leading-relaxed">
                {v.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
