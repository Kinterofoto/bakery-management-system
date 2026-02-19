"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    gsap.fromTo(
      sectionRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
      }
    )
  }, [])

  return (
    <section
      ref={sectionRef}
      id="contacto"
      className="relative z-10 bg-[#E7DBCC] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Left - Info */}
          <div>
            <Image
              src="/landing/logo-dark.png"
              alt="Pastry"
              width={140}
              height={50}
              className="h-10 w-auto object-contain mb-8"
            />
            <h2 className="text-4xl md:text-6xl font-bold text-[#27282E] mb-8">
              Hablemos.
            </h2>
            <p className="text-[#27282E]/60 text-lg leading-relaxed mb-12 max-w-md">
              Queremos ser el aliado de tu cocina. Cuéntanos sobre tu
              negocio y te armamos una propuesta a la medida.
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#27282E]">
                  <Mail className="h-4 w-4 text-pastry-yellow" />
                </div>
                <span className="text-[#27282E]">hola@pastry.app</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#27282E]">
                  <Phone className="h-4 w-4 text-pastry-yellow" />
                </div>
                <span className="text-[#27282E]">+57 (1) 234 5678</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#27282E]">
                  <MapPin className="h-4 w-4 text-pastry-yellow" />
                </div>
                <span className="text-[#27282E]">Bogotá, Colombia</span>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="space-y-6"
              aria-label="Formulario de contacto"
            >
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-sm font-medium text-[#27282E]/70 mb-2"
                >
                  Nombre
                </label>
                <input
                  id="contact-name"
                  type="text"
                  className="landing-focus w-full rounded-lg border border-[#27282E]/10 bg-white px-4 py-3 text-[#27282E] outline-none focus:border-pastry-yellow transition-colors"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-[#27282E]/70 mb-2"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="landing-focus w-full rounded-lg border border-[#27282E]/10 bg-white px-4 py-3 text-[#27282E] outline-none focus:border-pastry-yellow transition-colors"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-bakery"
                  className="block text-sm font-medium text-[#27282E]/70 mb-2"
                >
                  Negocio
                </label>
                <input
                  id="contact-bakery"
                  type="text"
                  className="landing-focus w-full rounded-lg border border-[#27282E]/10 bg-white px-4 py-3 text-[#27282E] outline-none focus:border-pastry-yellow transition-colors"
                  placeholder="Hotel, restaurante, café..."
                />
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-[#27282E]/70 mb-2"
                >
                  Mensaje
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  className="landing-focus w-full rounded-lg border border-[#27282E]/10 bg-white px-4 py-3 text-[#27282E] outline-none focus:border-pastry-yellow transition-colors resize-none"
                  placeholder="Cuéntanos qué productos te interesan..."
                />
              </div>
              <button
                type="submit"
                className="landing-focus w-full rounded-lg bg-[#27282E] px-6 py-3 text-white font-semibold hover:bg-[#27282E]/90 transition-colors"
              >
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
