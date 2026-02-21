"use client"

import Image from "next/image"

export default function NewsletterSection() {
  return (
    <section id="newsletter" className="relative z-10 bg-pastry-yellow px-6 py-20 md:py-24 overflow-hidden">
      {/* Decorative icon */}
      <div className="absolute -right-8 -top-8 opacity-10 pointer-events-none" aria-hidden="true">
        <Image src="/landing/icon-dark.png" alt="" width={200} height={200} className="w-40 h-40" />
      </div>
      <div className="absolute -left-8 -bottom-8 opacity-10 pointer-events-none" aria-hidden="true">
        <Image src="/landing/icon-dark.png" alt="" width={160} height={160} className="w-32 h-32" />
      </div>

      <div className="mx-auto max-w-3xl text-center relative">
        <Image
          src="/landing/icon-dark.png"
          alt=""
          width={48}
          height={48}
          className="w-10 h-10 object-contain mx-auto mb-6 opacity-30"
          aria-hidden="true"
        />
        <h2 className="text-3xl md:text-4xl font-bold text-[#27282E] mb-4">
          Mantente al día
        </h2>
        <p className="text-[#27282E]/70 mb-8 max-w-md mx-auto">
          Nuevos productos, recetas para tu carta y tips para sacarle el
          máximo provecho a nuestros congelados.
        </p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          aria-label="Suscripción al newsletter"
        >
          <input
            type="email"
            placeholder="tu@email.com"
            className="landing-focus flex-1 rounded-lg border border-[#27282E]/20 bg-white px-4 py-3 text-[#27282E] outline-none focus:border-[#27282E] transition-colors"
            aria-label="Dirección de email para newsletter"
          />
          <button
            type="submit"
            className="landing-focus rounded-lg bg-[#27282E] px-6 py-3 text-white font-semibold hover:bg-[#27282E]/90 transition-colors whitespace-nowrap"
          >
            Suscribirse
          </button>
        </form>
      </div>
    </section>
  )
}
