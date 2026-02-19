"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "¿Qué es Pastry y para quién está diseñado?",
    a: "Pastry es un sistema integral de gestión para panaderías industriales. Está diseñado para maestros panaderos, gerentes de producción y dueños de negocios que buscan optimizar sus operaciones diarias.",
  },
  {
    q: "¿Necesito conocimientos técnicos para usar Pastry?",
    a: "No. Pastry fue diseñado con una interfaz intuitiva que cualquier miembro de tu equipo puede usar. Además, ofrecemos capacitación completa durante la implementación.",
  },
  {
    q: "¿Cómo maneja Pastry el inventario de materias primas?",
    a: "Nuestro módulo de inventario incluye control en tiempo real, alertas de stock mínimo, trazabilidad completa y módulo Kardex para movimientos detallados.",
  },
  {
    q: "¿Puedo gestionar múltiples sucursales?",
    a: "Sí. Pastry soporta gestión multi-sede con centralización de datos, permitiéndote controlar producción, inventario y entregas de todas tus ubicaciones.",
  },
  {
    q: "¿Pastry se integra con e-commerce?",
    a: "Absolutamente. Contamos con un módulo de e-commerce integrado que permite a tus clientes realizar pedidos en línea directamente conectados con tu sistema de producción.",
  },
  {
    q: "¿Qué pasa con mis datos si decido cambiar de sistema?",
    a: "Tus datos siempre son tuyos. Ofrecemos exportación completa en formatos estándar (Excel, CSV, PDF) en cualquier momento.",
  },
  {
    q: "¿Ofrecen soporte técnico?",
    a: "Sí, ofrecemos soporte técnico dedicado por chat, email y teléfono. Nuestro equipo responde en menos de 2 horas en horario laboral.",
  },
]

export default function FAQSection() {
  return (
    <section
      id="faq"
      className="relative z-10 bg-[#0A0A0A] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-16 text-center">
          Preguntas Frecuentes
        </h2>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border-white/10"
            >
              <AccordionTrigger className="text-left text-white hover:text-pastry-yellow transition-colors text-lg py-5 [&[data-state=open]]:text-pastry-yellow">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-white/60 leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
