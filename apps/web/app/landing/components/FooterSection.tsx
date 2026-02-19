"use client"

import Image from "next/image"
import PastryLogoSVG from "./PastryLogoSVG"

const footerLinks = {
  Productos: ["Catálogo", "Novedades", "Marca Blanca", "Fichas Técnicas"],
  Empresa: ["Nosotros", "Planta", "Trabaja con Nosotros", "Prensa"],
  Clientes: ["Canal HORECA", "Distribuidores", "Pedidos", "Cobertura"],
  Legal: ["Privacidad", "Términos", "INVIMA", "Certificaciones"],
}

export default function FooterSection() {
  return (
    <footer className="relative z-10 bg-[#0A0A0A] px-6 pt-20 pb-10 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* Top: Logo + Links */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 mb-20">
          {/* Logo column */}
          <div className="md:w-1/3">
            <Image
              src="/landing/logo-recortado.png"
              alt="Pastry"
              width={160}
              height={60}
              className="h-10 w-auto object-contain brightness-0 invert mb-6"
            />
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Panadería congelada premium, 100% hecha en Colombia. Llevamos
              calidad artesanal a hoteles, restaurantes y cafés.
            </p>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
                  {category}
                </h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-white/40 hover:text-white transition-colors text-sm"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Giant SVG logo watermark */}
        <div className="relative mb-12 flex justify-center" aria-hidden="true">
          <PastryLogoSVG
            className="w-[70vw] md:w-[50vw] h-auto opacity-[0.04] [&_.logo-icon-fill]:opacity-100 [&_.logo-icon-stroke]:opacity-0 [&_.logo-letter]:opacity-100"
            color="#ffffff"
          />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/10 pt-8">
          <div className="flex items-center gap-4">
            <Image
              src="/landing/icon-yellow.png"
              alt=""
              width={24}
              height={24}
              className="w-5 h-5 object-contain opacity-40"
            />
            <p className="text-white/30 text-sm">
              &copy; {new Date().getFullYear()} Pastry. Todos los derechos
              reservados.
            </p>
          </div>
          <div className="flex items-center gap-6">
            {["Twitter", "LinkedIn", "Instagram"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-white/30 hover:text-pastry-yellow transition-colors text-sm"
                aria-label={social}
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
