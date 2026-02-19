"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
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
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    // Heading char reveal
    const heading = headingRef.current
    if (heading) {
      const text = heading.innerHTML
      heading.innerHTML = ""
      const parts = text.split(/(<span[^>]*>.*?<\/span>)/)
      parts.forEach((part) => {
        if (part.startsWith("<span")) {
          const wrapper = document.createElement("span")
          wrapper.innerHTML = part
          const inner = wrapper.firstElementChild as HTMLElement
          const innerText = inner.textContent || ""
          inner.innerHTML = ""
          innerText.split("").forEach((char) => {
            const s = document.createElement("span")
            s.className = "inline-block opacity-0"
            s.textContent = char === " " ? "\u00A0" : char
            inner.appendChild(s)
          })
          heading.appendChild(inner)
        } else {
          part.split("").forEach((char) => {
            const s = document.createElement("span")
            s.className = "inline-block opacity-0"
            s.textContent = char === " " ? "\u00A0" : char
            heading.appendChild(s)
          })
        }
      })

      gsap.to(heading.querySelectorAll("span.inline-block"), {
        opacity: 1,
        stagger: 0.015,
        duration: 0.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: heading,
          start: "top 80%",
          once: true,
        },
      })
    }

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
      className="relative z-10 bg-[#FAFAFA] px-6 py-24 md:py-32 lg:py-40"
    >
      {/* Decorative icon background */}
      <div className="absolute top-12 right-8 md:right-16 opacity-[0.04] pointer-events-none" aria-hidden="true">
        <Image src="/landing/icon-dark.png" alt="" width={300} height={300} className="w-48 md:w-72 h-auto" />
      </div>

      <div className="mx-auto max-w-6xl">
        <Image
          src="/landing/icon-dark.png"
          alt=""
          width={60}
          height={60}
          className="w-12 h-12 object-contain mb-8 opacity-30"
          aria-hidden="true"
        />
        <h2
          ref={headingRef}
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#0A0A0A] leading-tight mb-16 md:mb-24"
        >
          Nosotros amasamos,{" "}
          <span className="text-pastry-yellow">tú horneas.</span>
        </h2>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"
        >
          {values.map((v) => (
            <div key={v.title} className="border-t border-[#0A0A0A]/10 pt-6">
              <h3 className="text-xl md:text-2xl font-semibold text-[#0A0A0A] mb-3">
                {v.title}
              </h3>
              <p className="text-[#0A0A0A]/60 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
