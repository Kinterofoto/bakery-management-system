"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const values = [
  {
    title: "Obsesionados con el producto",
    desc: "Seleccionamos cada ingrediente con rigor. Nuestras masas congeladas conservan el sabor y la textura de lo recién horneado.",
    bg: "#DFD860",
    num: "01",
  },
  {
    title: "Democratizar el buen pan",
    desc: "Llevamos la calidad artesanal a hoteles, restaurantes y cafés de todo Colombia, sin que necesiten un maestro panadero.",
    bg: "#E8E26C",
    num: "02",
  },
  {
    title: "Pasión y conciencia",
    desc: "Producción 100% colombiana con ingredientes locales, procesos sostenibles y respeto por la tradición panadera.",
    bg: "#D4CE4A",
    num: "03",
  },
  {
    title: "Momentos únicos",
    desc: "Cada croissant, cada pan, cada hojaldre que sale de tu horno es una experiencia que tus clientes recordarán.",
    bg: "#EBE578",
    num: "04",
  },
]

function PanelContent({ v }: { v: (typeof values)[number] }) {
  return (
    <>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-bold font-mono text-[#27282E] opacity-[0.08] leading-none select-none pointer-events-none">
        {v.num}
      </span>
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12">
        <p className="text-[clamp(1rem,3vw,2rem)] text-[#27282E]/40 font-mono mb-4">
          {`{ ${v.num} }`}
        </p>
        <h3 className="text-[clamp(2rem,7vw,5rem)] font-bold text-[#27282E] leading-[1.1] mb-6">
          {v.title}
        </h3>
        <p className="text-[clamp(1rem,2vw,1.5rem)] text-[#27282E]/55 max-w-[50ch] leading-relaxed">
          {v.desc}
        </p>
      </div>
    </>
  )
}

export default function ManifestoSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const container = containerRef.current
    if (!container) return

    const panels = container.querySelectorAll<HTMLElement>(".manifesto-slide")
    if (panels.length < 4) return

    // Panels 2-4 start off-screen
    gsap.set(panels[1], { xPercent: -100 })
    gsap.set(panels[2], { xPercent: 100 })
    gsap.set(panels[3], { yPercent: -100 })

    const tl = gsap.timeline()
    tl.to(panels[1], { xPercent: 0, duration: 1, ease: "none" })
      .to(panels[2], { xPercent: 0, duration: 1, ease: "none" })
      .to(panels[3], { yPercent: 0, duration: 1, ease: "none" })

    const st = ScrollTrigger.create({
      animation: tl,
      trigger: container,
      start: "top top",
      end: "+=3000",
      scrub: true,
      pin: true,
      anticipatePin: 1,
    })

    return () => {
      st.kill()
      tl.kill()
    }
  }, [])

  return (
    <div ref={containerRef} id="manifesto" className="relative w-full min-h-screen overflow-hidden">
      {/* Panel 1 — relative to give container height */}
      <section
        className="manifesto-slide relative w-full h-screen flex items-center justify-center"
        style={{ background: values[0].bg, zIndex: 1 }}
      >
        <PanelContent v={values[0]} />
      </section>

      {/* Panels 2-4 — absolute, slide in on top */}
      {values.slice(1).map((v, i) => (
        <section
          key={v.title}
          className="manifesto-slide absolute inset-0 w-full h-screen flex items-center justify-center"
          style={{ background: v.bg, zIndex: i + 2 }}
        >
          <PanelContent v={v} />
        </section>
      ))}
    </div>
  )
}
