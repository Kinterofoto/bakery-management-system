"use client"

const footerLinks = {
  Producto: ["Características", "Precios", "Demo", "Integraciones"],
  Empresa: ["Nosotros", "Blog", "Carreras", "Prensa"],
  Soporte: ["Centro de ayuda", "Documentación", "API", "Estado"],
  Legal: ["Privacidad", "Términos", "Cookies", "Licencias"],
}

export default function FooterSection() {
  return (
    <footer className="relative z-10 bg-[#0A0A0A] px-6 pt-20 pb-10 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
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

        {/* Giant wordmark */}
        <div className="relative mb-12">
          <span
            className="block text-[20vw] md:text-[15vw] font-bold text-white/[0.03] leading-none tracking-tighter select-none"
            aria-hidden="true"
          >
            PASTRY
          </span>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/10 pt-8">
          <p className="text-white/30 text-sm">
            &copy; {new Date().getFullYear()} Pastry. Todos los derechos
            reservados.
          </p>
          <div className="flex items-center gap-6">
            {/* Social icons as text for simplicity */}
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
