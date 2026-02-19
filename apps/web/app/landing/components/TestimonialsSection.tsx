"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const testimonials = [
  {
    quote:
      "Los croissants de Pastry llegan congelados y salen del horno como si los hiciera un maestro francés. Nuestros huéspedes no lo pueden creer.",
    author: "Roberto Sánchez",
    bakery: "Hotel Casa del Parque — Bogotá",
  },
  {
    quote:
      "Pasamos de madrugar a las 3am a hornear producto Pastry a las 6am. La misma calidad, la mitad del esfuerzo. Nuestro brunch cambió por completo.",
    author: "Carmen Flores",
    bakery: "Café Libertario — Medellín",
  },
  {
    quote:
      "La consistencia lote a lote es impresionante. Servimos los mismos danish perfectos en nuestras 5 sedes sin variación.",
    author: "Diego Martínez",
    bakery: "Restaurante Oliva — Cartagena",
  },
  {
    quote:
      "Reducimos desperdicio un 60% al hornear solo lo que necesitamos cada día. Y la cadena de frío siempre impecable en cada entrega.",
    author: "Lucía Hernández",
    bakery: "Catering Élite — Cali",
  },
]

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const cards = cardsRef.current?.children
    if (!cards) return

    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
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
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-[#27282E] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-16">
          <Image
            src="/landing/icon-yellow.png"
            alt=""
            width={48}
            height={48}
            className="w-10 h-10 object-contain opacity-60"
            aria-hidden="true"
          />
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Panaderos Felices
          </h2>
        </div>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="rounded-2xl border border-white/10 p-8 hover:border-pastry-yellow/30 transition-colors"
            >
              <span
                className="block text-5xl text-pastry-yellow leading-none mb-4 font-serif"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="text-white/80 text-lg leading-relaxed mb-6">
                {t.quote}
              </p>
              <div>
                <p className="text-white font-semibold">{t.author}</p>
                <p className="text-white/40 text-sm">{t.bakery}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
