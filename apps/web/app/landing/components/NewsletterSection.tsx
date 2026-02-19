"use client"

export default function NewsletterSection() {
  return (
    <section className="relative z-10 bg-pastry-yellow px-6 py-20 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0A0A0A] mb-4">
          Mantente al día
        </h2>
        <p className="text-[#0A0A0A]/70 mb-8 max-w-md mx-auto">
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
            className="landing-focus flex-1 rounded-lg border border-[#0A0A0A]/20 bg-white px-4 py-3 text-[#0A0A0A] outline-none focus:border-[#0A0A0A] transition-colors"
            aria-label="Dirección de email para newsletter"
          />
          <button
            type="submit"
            className="landing-focus rounded-lg bg-[#0A0A0A] px-6 py-3 text-white font-semibold hover:bg-[#0A0A0A]/90 transition-colors whitespace-nowrap"
          >
            Suscribirse
          </button>
        </form>
      </div>
    </section>
  )
}
