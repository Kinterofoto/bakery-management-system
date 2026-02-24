"use client"

import PastryLogoSVG from "./PastryLogoSVG"

export default function FooterSection() {
  return (
    <footer className="relative z-10 bg-[#27282E] px-6 pt-20 pb-12 overflow-hidden">
      {/* Giant logo — side to side */}
      <div className="flex justify-center mb-16" aria-hidden="true">
        <PastryLogoSVG
          className="w-[85vw] md:w-[65vw] h-auto opacity-[0.06]"
          color="#ffffff"
        />
      </div>

      {/* Contact info + copyright */}
      <div className="mx-auto max-w-4xl text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/50 text-sm">
          <a
            href="mailto:info@pastrychef.com.co"
            className="hover:text-white transition-colors"
          >
            info@pastrychef.com.co
          </a>
          <span className="hidden sm:inline text-white/20">|</span>
          <a
            href="tel:+573023418757"
            className="hover:text-white transition-colors"
          >
            302 341 8757
          </a>
        </div>
        <p className="text-white/25 text-xs">
          &copy; {new Date().getFullYear()} Pastry Chef. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
