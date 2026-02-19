"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "¿Qué tipo de productos ofrece Pastry?",
    a: "Producimos una línea completa de panadería congelada: croissants, pain au chocolat, baguettes, danish, panes de semillas, hojaldritos y más. Todo listo para hornear directamente desde congelado.",
  },
  {
    q: "¿Necesito un panadero profesional para hornear los productos?",
    a: "No. Nuestros productos vienen listos para hornear. Solo necesitas un horno convencional, seguir las instrucciones de tiempo y temperatura, y en minutos tendrás pan recién horneado con calidad artesanal.",
  },
  {
    q: "¿Cuál es el pedido mínimo?",
    a: "Trabajamos con pedidos mínimos accesibles adaptados al canal HORECA. Contáctanos para conocer las condiciones según tu ciudad y volumen estimado.",
  },
  {
    q: "¿Cómo garantizan la cadena de frío?",
    a: "Contamos con transporte refrigerado propio y aliados logísticos certificados. Cada entrega se monitorea con sensores de temperatura para garantizar que el producto llegue en condiciones óptimas.",
  },
  {
    q: "¿Cuál es la vida útil de los productos congelados?",
    a: "Nuestros productos tienen una vida útil de 3 a 6 meses en congelación (-18°C), dependiendo de la referencia. Cada empaque incluye fecha de vencimiento y lote para trazabilidad completa.",
  },
  {
    q: "¿Hacen entregas a nivel nacional?",
    a: "Actualmente cubrimos las principales ciudades de Colombia: Bogotá, Medellín, Cali, Barranquilla y Cartagena. Estamos en expansión constante a nuevas zonas.",
  },
  {
    q: "¿Pueden desarrollar productos personalizados para mi negocio?",
    a: "Sí. Nuestro equipo de I+D puede desarrollar formulaciones exclusivas para tu marca, con los sabores, tamaños y empaques que necesites. Contáctanos para iniciar el proceso.",
  },
]

export default function FAQSection() {
  return (
    <section
      id="faq"
      className="relative z-10 bg-[#27282E] px-6 py-24 md:py-32"
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
