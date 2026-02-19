"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import Image from "next/image"
import useEmblaCarousel from "embla-carousel-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ChevronLeft, ChevronRight } from "lucide-react"

const products = [
  {
    title: "Croissant Clásico",
    subtitle: "Hojaldrado con mantequilla — Listo para hornear desde congelado",
    gradient: "from-amber-900/80 to-amber-700/40",
  },
  {
    title: "Pain au Chocolat",
    subtitle: "Relleno de chocolate belga — Fermentación lenta de 24h",
    gradient: "from-stone-900/80 to-stone-700/40",
  },
  {
    title: "Baguette Artesanal",
    subtitle: "Corteza crujiente, miga abierta — Pre-cocido ultracongelado",
    gradient: "from-orange-900/80 to-orange-600/40",
  },
  {
    title: "Danish de Frutas",
    subtitle: "Hojaldre con rellenos de fruta natural colombiana",
    gradient: "from-yellow-900/80 to-yellow-600/40",
  },
  {
    title: "Pan de Semillas",
    subtitle: "Chía, linaza y ajonjolí — Alto en fibra, congelado individual",
    gradient: "from-yellow-800/80 to-amber-600/40",
  },
]

export default function ProductsShowcase() {
  const sectionRef = useRef<HTMLElement>(null)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
  }, [emblaApi, onSelect])

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
      id="productos"
      className="relative z-10 bg-[#FAFAFA] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between mb-12">
          <div className="flex items-center gap-4">
            <Image
              src="/landing/icon-dark.png"
              alt=""
              width={48}
              height={48}
              className="w-10 h-10 object-contain opacity-30"
              aria-hidden="true"
            />
            <h2 className="text-3xl md:text-5xl font-bold text-[#0A0A0A]">
              Nuestros Productos
            </h2>
          </div>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              className="landing-focus h-10 w-10 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-colors disabled:opacity-30"
              aria-label="Producto anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              className="landing-focus h-10 w-10 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-colors disabled:opacity-30"
              aria-label="Siguiente producto"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-4 md:gap-6">
            {products.map((product) => (
              <div
                key={product.title}
                className="flex-none w-[80%] md:w-[calc(33.333%-16px)] aspect-[3/4] rounded-2xl overflow-hidden relative group"
              >
                {/* Placeholder background */}
                <div className="absolute inset-0 bg-gradient-to-br from-stone-300 to-stone-200" />
                {/* Overlay gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${product.gradient} opacity-80 group-hover:opacity-90 transition-opacity`}
                />
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {product.title}
                  </h3>
                  <p className="text-white/70 text-sm">{product.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
