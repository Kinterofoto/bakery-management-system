"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const testimonials = [
  {
    quote:
      "Desde que implementamos Pastry, nuestra producción diaria aumentó un 40%. El control de inventario es impecable.",
    author: "Roberto Sánchez",
    bakery: "Panadería La Tradición",
  },
  {
    quote:
      "La gestión de rutas de entrega nos ahorró 3 horas diarias. Nuestros clientes reciben el pan caliente.",
    author: "Carmen Flores",
    bakery: "Pan del Valle",
  },
  {
    quote:
      "El módulo de producción nos permite planificar con exactitud. Cero desperdicio, máxima calidad.",
    author: "Diego Martínez",
    bakery: "Hornos del Sur",
  },
  {
    quote:
      "Pastry transformó cómo gestionamos nuestras 8 sucursales. Todo centralizado, todo bajo control.",
    author: "Lucía Hernández",
    bakery: "Masa Madre Co.",
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
      className="relative z-10 bg-[#0A0A0A] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-16">
          Panaderos Felices
        </h2>

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
