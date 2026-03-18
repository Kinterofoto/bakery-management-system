export default function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pastry Chef S.A.S.",
    url: "https://www.pastrychef.com.co",
    logo: "https://www.pastrychef.com.co/landing/icon-dark.png",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+57-313-801-6374",
      email: "comercial@pastrychef.com.co",
      contactType: "sales",
      areaServed: "CO",
      availableLanguage: "Spanish",
    },
    sameAs: [],
  }

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: "Pastry Chef — Panadería Congelada Premium",
    url: "https://www.pastrychef.com.co/landing",
    telephone: "+57-313-801-6374",
    email: "comercial@pastrychef.com.co",
    address: {
      "@type": "PostalAddress",
      addressCountry: "CO",
    },
    areaServed: [
      { "@type": "City", name: "Bogotá" },
      { "@type": "City", name: "Medellín" },
      { "@type": "City", name: "Cali" },
      { "@type": "City", name: "Barranquilla" },
      { "@type": "City", name: "Cartagena" },
    ],
    description:
      "Proveedor líder de panadería congelada en Colombia. Croissants, hojaldre, pan y masas congeladas listas para hornear. Soluciones HORECA.",
  }

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Qué tipo de productos ofrece Pastry?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Producimos una línea completa de panadería congelada: croissants, pain au chocolat, danish, panadería petit colombiana, hojaldritos y más. Todo listo para hornear directamente desde congelado.",
        },
      },
      {
        "@type": "Question",
        name: "¿Necesito un panadero profesional para hornear los productos?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Nuestros productos vienen listos para hornear. Solo necesitas cualquier horno y nuestro equipo te capacitará con los tiempos y temperaturas ideales para cada producto.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cuál es el pedido mínimo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Trabajamos con pedidos mínimos accesibles adaptados al canal HORECA. Contáctanos para conocer las condiciones según tu ciudad y volumen estimado.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo garantizan la cadena de frío?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Trabajamos con aliados logísticos certificados y cada entrega se monitorea con sensores de temperatura para garantizar que el producto llegue en condiciones óptimas.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cuál es la vida útil de los productos congelados?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nuestros productos tienen una vida útil de 3 a 6 meses en congelación (-18°C), dependiendo de la referencia. Cada empaque incluye fecha de vencimiento y lote para trazabilidad completa.",
        },
      },
      {
        "@type": "Question",
        name: "¿Hacen entregas a nivel nacional?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Actualmente cubrimos las principales ciudades de Colombia: Bogotá, Medellín, Cali, Barranquilla y Cartagena. Estamos en expansión constante a nuevas zonas.",
        },
      },
      {
        "@type": "Question",
        name: "¿Pueden desarrollar productos personalizados para mi negocio?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Nuestro equipo de I+D puede desarrollar formulaciones exclusivas para tu marca a partir de un mínimo de 500 unidades, con los sabores, tamaños y empaques que necesites.",
        },
      },
      {
        "@type": "Question",
        name: "¿Por qué elegir a Pastry como proveedor HORECA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Somos especialistas en panadería congelada premium 100% colombiana. Ofrecemos productos listos para hornear con calidad artesanal, cadena de frío garantizada, entregas en las principales ciudades del país y desarrollo de productos personalizados para tu negocio.",
        },
      },
    ],
  }

  const products = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Croissant Congelado Premium",
      description:
        "Croissant hojaldrado con mantequilla, listo para hornear desde congelado. Calidad artesanal para hoteles, restaurantes y cafés.",
      brand: { "@type": "Brand", name: "Pastry Chef" },
      category: "Panadería Congelada",
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Pain au Chocolat Congelado",
      description:
        "Pain au chocolat relleno de chocolate belga con fermentación lenta de 24h. Producto de panadería congelada premium.",
      brand: { "@type": "Brand", name: "Pastry Chef" },
      category: "Panadería Congelada",
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Hojaldre Congelado",
      description:
        "Masa de hojaldre congelada lista para hornear. Ideal para hoteles, restaurantes y cafés en Colombia.",
      brand: { "@type": "Brand", name: "Pastry Chef" },
      category: "Panadería Congelada",
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
      {products.map((product, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }}
        />
      ))}
    </>
  )
}
