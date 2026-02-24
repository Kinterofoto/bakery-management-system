"use client"

import Image from "next/image"

const logos = [
  { src: "/landing/logos-clientes/Colsubsidio_logo.svg.png", alt: "Colsubsidio" },
  { src: "/landing/logos-clientes/OXXO-Logo.png", alt: "OXXO" },
  { src: "/landing/logos-clientes/innova-schools-logo.webp", alt: "Innova Schools" },
  { src: "/landing/logos-clientes/logo_4.png", alt: "OxoHotel" },
  { src: "/landing/logos-clientes/starbucks-logo-png-1.png", alt: "Starbucks" },
]

export default function AlliancesSection() {
  // Duplicate logos enough times for seamless infinite scroll
  const repeated = [...logos, ...logos, ...logos, ...logos]

  return (
    <section className="relative z-10 bg-[#27282E] py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-4xl text-center mb-14">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/90">
          Alianzas que nos enorgullecen
        </h2>
      </div>

      {/* Carousel container with fade edges */}
      <div className="relative">
        {/* Left shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 z-10 bg-gradient-to-r from-[#27282E] to-transparent pointer-events-none" />
        {/* Right shadow */}
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 z-10 bg-gradient-to-l from-[#27282E] to-transparent pointer-events-none" />

        {/* Sliding track */}
        <div className="flex items-center gap-16 sm:gap-20 md:gap-24 animate-logo-scroll w-max">
          {repeated.map((logo, i) => (
            <div
              key={`${logo.alt}-${i}`}
              className="flex-shrink-0 h-10 sm:h-12 md:h-14 w-28 sm:w-36 md:w-40 relative grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                className="object-contain"
                sizes="160px"
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes logo-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-logo-scroll {
          animation: logo-scroll 30s linear infinite;
        }
      `}</style>
    </section>
  )
}
