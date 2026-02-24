"use client"

import Image from "next/image"

const logos: { src: string; alt: string; invert?: boolean }[] = [
  { src: "/landing/logos-clientes/Colsubsidio_logo.svg.png", alt: "Colsubsidio" },
  { src: "/landing/logos-clientes/OXXO-Logo.png", alt: "OXXO" },
  { src: "/landing/logos-clientes/innova-schools-logo.webp", alt: "Innova Schools" },
  { src: "/landing/logos-clientes/logo_4.png", alt: "OxoHotel" },
  { src: "/landing/logos-clientes/starbucks-logo-png-1.png", alt: "Starbucks", invert: true },
]

export default function AlliancesSection() {
  const repeated = [...logos, ...logos, ...logos, ...logos]

  return (
    <section className="relative z-10 bg-[#27282E] py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-4xl text-center mb-14">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/90">
          Alianzas que nos enorgullecen
        </h2>
      </div>

      {/* Carousel container — center spotlight via mask */}
      <div className="relative logo-spotlight">
        {/* Sliding track */}
        <div className="flex items-center gap-16 sm:gap-20 md:gap-24 animate-logo-scroll w-max">
          {repeated.map((logo, i) => (
            <div
              key={`${logo.alt}-${i}`}
              className="flex-shrink-0 h-10 sm:h-12 md:h-14 w-28 sm:w-36 md:w-40 relative"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                className={`object-contain${logo.invert ? " invert" : ""}`}
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
        .logo-spotlight {
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(0, 0, 0, 0.15) 15%,
            rgba(0, 0, 0, 0.6) 30%,
            black 45%,
            black 55%,
            rgba(0, 0, 0, 0.6) 70%,
            rgba(0, 0, 0, 0.15) 85%,
            transparent 100%
          );
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(0, 0, 0, 0.15) 15%,
            rgba(0, 0, 0, 0.6) 30%,
            black 45%,
            black 55%,
            rgba(0, 0, 0, 0.6) 70%,
            rgba(0, 0, 0, 0.15) 85%,
            transparent 100%
          );
        }
      `}</style>
    </section>
  )
}
