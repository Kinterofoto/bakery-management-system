"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Mail, Phone } from "lucide-react"

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
      <div className="mx-auto max-w-3xl text-center">
        <Image
          src="/landing/logo-dark.png"
          alt="Pastry"
          width={140}
          height={50}
          className="h-10 w-auto object-contain mb-8 mx-auto"
        />
        <h2 className="text-4xl md:text-6xl font-bold text-[#27282E] mb-8">
          Hablemos.
        </h2>
        <p className="text-[#27282E]/60 text-lg leading-relaxed mb-14 max-w-xl mx-auto">
          Queremos ser el aliado de tu cocina. Cuéntanos sobre tu
          negocio y te armamos una propuesta a la medida.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <a
            href="mailto:info@pastrychef.com.co"
            className="flex items-center gap-4 group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#27282E] group-hover:bg-[#27282E]/80 transition-colors">
              <Mail className="h-5 w-5 text-pastry-yellow" />
            </div>
            <span className="text-[#27282E] text-lg">info@pastrychef.com.co</span>
          </a>
          <a
            href="tel:+573023418757"
            className="flex items-center gap-4 group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#27282E] group-hover:bg-[#27282E]/80 transition-colors">
              <Phone className="h-5 w-5 text-pastry-yellow" />
            </div>
            <span className="text-[#27282E] text-lg">302 341 8757</span>
          </a>
        </div>
      </div>
    </section>
  )
}
