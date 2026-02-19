"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Shield, Lightbulb, Heart } from "lucide-react"

const commitments = [
  {
    icon: Shield,
    title: "Calidad sin compromiso",
    desc: "Certificaciones BPM e INVIMA. Cadena de frío garantizada desde nuestra planta hasta tu puerta. Cada lote es trazable de principio a fin.",
  },
  {
    icon: Lightbulb,
    title: "Innovación constante",
    desc: "Investigamos nuevas formulaciones, técnicas de ultracongelación y empaques que alargan la vida útil sin sacrificar sabor ni textura.",
  },
  {
    icon: Heart,
    title: "Impacto positivo",
    desc: "Ingredientes colombianos, proveedores locales y procesos que minimizan el desperdicio. Creemos que el buen pan también puede ser responsable.",
  },
]

export default function CommitmentsSection() {
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
      { opacity: 0, x: -60 },
      {
        opacity: 1,
        x: 0,
        stagger: 0.2,
        duration: 0.7,
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
      id="compromisos"
      className="relative z-10 bg-[#FAFAFA] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-5xl font-bold text-[#0A0A0A] mb-16">
          Nuestro Compromiso
        </h2>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {commitments.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.title}
                className="rounded-2xl border border-[#0A0A0A]/10 p-8 hover:border-pastry-yellow/50 transition-colors"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-pastry-yellow/10">
                  <Icon className="h-6 w-6 text-pastry-yellow" />
                </div>
                <h3 className="text-xl font-semibold text-[#0A0A0A] mb-3">
                  {c.title}
                </h3>
                <p className="text-[#0A0A0A]/60 leading-relaxed">{c.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
