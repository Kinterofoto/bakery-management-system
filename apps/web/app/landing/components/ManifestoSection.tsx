"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import GrainTexture from "./GrainTexture"

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
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    // Cards stagger
    const cards = cardsRef.current?.children
    if (cards) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 80%",
            once: true,
          },
        }
      )
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="manifesto"
      className="relative z-10 gradient-green px-6 py-24 md:py-32 lg:py-40"
    >
      <GrainTexture id="grain-manifesto" />
      {/* Decorative icon background */}
      <div className="absolute top-12 right-8 md:right-16 opacity-[0.04] pointer-events-none" aria-hidden="true">
        <Image src="/landing/icon-dark.png" alt="" width={300} height={300} className="w-48 md:w-72 h-auto" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"
        >
          {values.map((v) => (
            <div key={v.title} className="border-t border-[#27282E]/10 pt-6">
              <h3 className="text-xl md:text-2xl font-semibold text-[#27282E] mb-3">
                {v.title}
              </h3>
              <p className="text-[#27282E]/60 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
