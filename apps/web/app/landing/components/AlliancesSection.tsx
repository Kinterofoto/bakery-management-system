"use client"

import Image from "next/image"

const logos: { src: string; alt: string; invert?: boolean }[] = [
  { src: "/landing/logos-clientes/Colsubsidio_logo.svg.png", alt: "Colsubsidio" },
  { src: "/landing/logos-clientes/OXXO-Logo.png", alt: "OXXO" },
  { src: "/landing/logos-clientes/logo_4.png", alt: "OxoHotel" },
  { src: "/landing/logos-clientes/starbucks-logo-white-text.png", alt: "Starbucks" },
]

export default function AlliancesSection() {
  // Exactly 2 copies: -50% scrolls through first copy, loop restarts seamlessly
  const repeated = [...logos, ...logos]

  return (
    <section className="relative z-10 bg-[#27282E] py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-4xl text-center mb-14">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/90">
          Alianzas que nos enorgullecen
        </h2>
      </div>

      {/* Carousel container — center spotlight via mask */}
      <div className="relative logo-spotlight">
        {/* Sliding track — padding on items instead of gap for perfect -50% loop */}
        <div className="flex items-center animate-logo-scroll w-max" style={{ willChange: "transform" }}>
          {repeated.map((logo, i) => (
            <div
              key={`${logo.alt}-${i}`}
              className="flex-shrink-0 h-10 sm:h-12 md:h-14 w-28 sm:w-36 md:w-40 relative mx-12 sm:mx-16 md:mx-20"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                className={`object-contain${logo.invert ? " brightness-0 invert" : ""}`}
                sizes="160px"
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes logo-scroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .animate-logo-scroll {
          animation: logo-scroll 20s linear infinite;
          backface-visibility: hidden;
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
