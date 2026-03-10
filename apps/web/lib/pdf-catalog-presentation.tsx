import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Svg,
  Line,
  Rect,
  Circle,
} from '@react-pdf/renderer'
import type { CatalogProduct } from './pdf-catalog'

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: '/fonts/Montserrat-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Montserrat-SemiBold.ttf', fontWeight: 600 as any },
    { src: '/fonts/Montserrat-Bold.ttf', fontWeight: 'bold' },
  ],
})

// ---------------------------------------------------------------------------
// Brand palette
// ---------------------------------------------------------------------------
const DARK = '#27282E'
const YELLOW = '#DFD860'
const CREAM = '#E7DBCC'
const LIGHT = '#F5EDE3'
const WHITE = '#FFFFFF'
const DARK_TEXT = '#1A1B1F'
const SUBTLE = '#9B9B9B'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface PresentationCatalogProps {
  products: CatalogProduct[]
  logoDarkUrl: string
  logoYellowUrl: string
  historyImages: (string | null)[]
  allianceLogos: (string | null)[]
  generatedDate: string
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // ---- Common -----------------------------------------------------------
  darkPage: {
    padding: 0,
    fontFamily: 'Montserrat',
    backgroundColor: DARK,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  creamPage: {
    padding: 0,
    fontFamily: 'Montserrat',
    backgroundColor: CREAM,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },

  // ---- Cover ------------------------------------------------------------
  coverLogo: {
    width: 160,
    height: 160,
    marginBottom: 32,
    borderRadius: 16,
  },
  coverBrand: {
    fontSize: 52,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: YELLOW,
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverTagline: {
    fontSize: 14,
    color: WHITE,
    textAlign: 'center',
    letterSpacing: 2,
  },

  // ---- Manifesto --------------------------------------------------------
  manifestoTitle: {
    fontSize: 44,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: YELLOW,
    textAlign: 'left',
    lineHeight: 1.15,
  },

  // ---- Values -----------------------------------------------------------
  valueNumber: {
    fontSize: 72,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: YELLOW,
    opacity: 0.25,
    position: 'absolute',
    top: -10,
    right: 0,
  },
  valueTitle: {
    fontSize: 22,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: YELLOW,
    marginBottom: 10,
  },
  valueDescription: {
    fontSize: 13,
    color: '#D0D0D0',
    lineHeight: 1.65,
  },

  // ---- Stats ------------------------------------------------------------
  statNumber: {
    fontSize: 38,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: WHITE,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#B0B0B0',
    lineHeight: 1.5,
  },

  // ---- History ----------------------------------------------------------
  historyTitle: {
    fontSize: 32,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: DARK_TEXT,
    marginBottom: 30,
  },
  historyYear: {
    fontSize: 20,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: DARK_TEXT,
    marginBottom: 4,
  },
  historyDesc: {
    fontSize: 10,
    color: '#4A4A4A',
    lineHeight: 1.5,
  },
  historyImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
  },

  // ---- Alliances --------------------------------------------------------
  allianceLogo: {
    width: 120,
    height: 80,
    objectFit: 'contain' as any,
  },

  // ---- Contact ----------------------------------------------------------
  contactTitle: {
    fontSize: 48,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: DARK_TEXT,
    marginBottom: 18,
  },
  contactBody: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 1.7,
    marginBottom: 24,
    maxWidth: 380,
  },
  contactDetail: {
    fontSize: 13,
    color: DARK_TEXT,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    marginBottom: 6,
  },

  // ---- Closing ----------------------------------------------------------
  closingLine1: {
    fontSize: 44,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: YELLOW,
    textAlign: 'center',
  },
  closingLine2: {
    fontSize: 44,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: CREAM,
    textAlign: 'center',
  },

  // ---- Catalog (product pages) ------------------------------------------
  catalogPage: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Montserrat',
    backgroundColor: WHITE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: YELLOW,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: DARK,
  },
  headerPage: {
    fontSize: 8,
    color: SUBTLE,
  },
  categoryHeader: {
    backgroundColor: DARK,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 10,
    marginTop: 5,
  },
  categoryTitle: {
    fontSize: 13,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: YELLOW,
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    minHeight: 90,
  },
  productImage: {
    width: 90,
    height: 90,
    backgroundColor: '#F5F5F5',
  },
  productImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#F5F5F5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 7,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  productInfo: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 11,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: DARK,
    marginBottom: 4,
  },
  variantsTable: {
    marginTop: 4,
  },
  variantHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 2,
  },
  variantRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
  },
  variantWeight: {
    width: '50%',
    fontSize: 8,
  },
  variantUnits: {
    width: '50%',
    fontSize: 8,
  },
  variantHeaderText: {
    fontSize: 7,
    fontFamily: 'Montserrat', fontWeight: 'bold' as any,
    color: '#666666',
  },
  variantValueText: {
    fontSize: 8,
    color: '#333333',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: SUBTLE,
  },
})

// ---------------------------------------------------------------------------
// Decorative helpers
// ---------------------------------------------------------------------------

/** Horizontal yellow accent line */
function YellowLine({ width = 60, y = 0 }: { width?: number; y?: number }) {
  return (
    <Svg width={width} height={3} style={{ marginTop: y }}>
      <Rect x="0" y="0" width={String(width)} height="3" fill={YELLOW} rx="1.5" />
    </Svg>
  )
}

/** Small decorative yellow circle */
function YellowDot({ size = 8 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <Circle cx={String(size / 2)} cy={String(size / 2)} r={String(size / 2)} fill={YELLOW} />
    </Svg>
  )
}

/** Subtle corner decoration for dark pages */
function CornerAccent() {
  return (
    <Svg
      width={120}
      height={120}
      style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.06 }}
    >
      <Circle cx="120" cy="120" r="100" fill={YELLOW} />
    </Svg>
  )
}

/** Top-left corner accent */
function TopLeftAccent() {
  return (
    <Svg
      width={80}
      height={80}
      style={{ position: 'absolute', top: 0, left: 0, opacity: 0.05 }}
    >
      <Circle cx="0" cy="0" r="70" fill={YELLOW} />
    </Svg>
  )
}

/** Yellow logo (square 1:1) in top-right corner for dark pages */
function PageLogoYellow({ src }: { src: string }) {
  return (
    <Image
      src={src}
      style={{
        position: 'absolute',
        top: 16,
        right: 20,
        width: 80,
        height: 80,
      }}
    />
  )
}

/** Dark logo (wide ~1.78:1) in top-right corner for cream pages */
function PageLogoDark({ src }: { src: string }) {
  return (
    <Image
      src={src}
      style={{
        position: 'absolute',
        top: 16,
        right: 20,
        width: 56,
        height: 31,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// 1. Cover Page
// ---------------------------------------------------------------------------
function CoverPage({ logoYellowUrl }: { logoYellowUrl: string }) {
  return (
    <Page size="A4" style={s.darkPage}>
      <TopLeftAccent />
      <CornerAccent />

      <Image src={logoYellowUrl} style={{ width: 280, height: 280, marginBottom: 32 }} />
      <YellowLine width={80} y={6} />
      <Text style={[s.coverTagline, { marginTop: 18 }]}>
        Nosotros amasamos, tu horneas.
      </Text>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 2. Manifesto Page
// ---------------------------------------------------------------------------
function ManifestoPage({ logoYellowUrl }: { logoYellowUrl: string }) {
  return (
    <Page size="A4" style={s.darkPage}>
      <TopLeftAccent />
      <CornerAccent />
      <PageLogoYellow src={logoYellowUrl} />

      <View style={{ paddingHorizontal: 60, width: '100%' }}>
        <YellowLine width={40} y={0} />
        <Text style={[s.manifestoTitle, { marginTop: 20 }]}>
          Lo que{'\n'}nos define.
        </Text>
      </View>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 3. Values Pages (2 values per page)
// ---------------------------------------------------------------------------
const VALUES = [
  {
    number: '01',
    title: 'Obsesión por el producto',
    description:
      'Seleccionamos cada ingrediente con rigor. Nuestras masas congeladas conservan el sabor y la textura de lo recién horneado.',
  },
  {
    number: '02',
    title: 'Expertos en hojaldre',
    description:
      'Dominamos cada capa, cada pliegue, cada laminado. Nuestro hojaldre llega listo para que tu horno haga el resto.',
  },
  {
    number: '03',
    title: 'Pasión y conciencia',
    description:
      'Producción 100% colombiana con ingredientes locales, procesos sostenibles y respeto por la tradición panadera.',
  },
  {
    number: '04',
    title: 'Creamos momentos únicos',
    description:
      'Cada croissant, cada pan, cada hojaldre que sale de tu horno es una experiencia que tus clientes recordarán.',
  },
]

function ValueBlock({
  value,
}: {
  value: { number: string; title: string; description: string }
}) {
  return (
    <View
      style={{
        position: 'relative',
        paddingHorizontal: 60,
        paddingVertical: 36,
        width: '100%',
      }}
      wrap={false}
    >
      <Text style={s.valueNumber}>{value.number}</Text>
      <YellowDot size={10} />
      <Text style={[s.valueTitle, { marginTop: 8 }]}>{value.title}</Text>
      <Text style={s.valueDescription}>{value.description}</Text>
    </View>
  )
}

function ValuesPage({ values, logoYellowUrl }: { values: typeof VALUES; logoYellowUrl: string }) {
  return (
    <Page
      size="A4"
      style={[s.darkPage, { justifyContent: 'center', alignItems: 'stretch' }]}
    >
      <TopLeftAccent />
      <CornerAccent />
      <PageLogoYellow src={logoYellowUrl} />
      {values.map((v) => (
        <ValueBlock key={v.number} value={v} />
      ))}
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 4. Stats Page
// ---------------------------------------------------------------------------
const STATS = [
  { number: '100+', label: 'Corazones unidos' },
  { number: '1,300', label: 'Metros para crear\nsin límites' },
  { number: '15', label: 'Años amasando' },
  { number: '30M', label: 'Bocados por año' },
]

function StatsPage({ logoYellowUrl }: { logoYellowUrl: string }) {
  return (
    <Page size="A4" style={s.darkPage}>
      <TopLeftAccent />
      <CornerAccent />
      <PageLogoYellow src={logoYellowUrl} />

      <View style={{ paddingHorizontal: 60, width: '100%', marginBottom: 44 }}>
        <Text
          style={{
            fontSize: 32,
            fontFamily: 'Montserrat', fontWeight: 'bold' as any,
            color: WHITE,
            marginBottom: 4,
          }}
        >
          Nuestras cifras
        </Text>
        <YellowLine width={50} y={4} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 60,
          width: '100%',
        }}
      >
        {STATS.map((stat, i) => (
          <View
            key={i}
            style={{
              width: '50%',
              marginBottom: 40,
              paddingRight: i % 2 === 0 ? 20 : 0,
              paddingLeft: i % 2 === 1 ? 20 : 0,
            }}
          >
            <Text style={s.statNumber}>{stat.number}</Text>
            <YellowLine width={36} y={2} />
            <Text style={[s.statLabel, { marginTop: 8 }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 5. History Page
// ---------------------------------------------------------------------------
const MILESTONES = [
  { year: '2011', description: 'Una idea que nace' },
  {
    year: '2017',
    description:
      'Desde una planta de 350 m2, iniciamos nuestro camino como expertos en hojaldre',
  },
  { year: '2019', description: 'Crecemos y nos pasamos a una planta de 1300 M2' },
  { year: '2020', description: 'Llega la pandemia y nos revolucionamos' },
  { year: '2026', description: '100 corazones y seguimos creciendo' },
]

function HistoryPage({ historyImages, logoDarkUrl }: { historyImages: (string | null)[]; logoDarkUrl: string }) {
  return (
    <Page size="A4" style={[s.creamPage, { padding: 40, paddingTop: 36 }]}>
      <PageLogoDark src={logoDarkUrl} />

      <Text style={[s.historyTitle, { marginBottom: 20 }]}>Nuestra historia</Text>

      {/* Container with continuous vertical line behind milestones */}
      <View style={{ position: 'relative' }}>
        {/* Continuous vertical line — from center of first dot to center of last dot */}
        {/* Each row = 100px photo + 40px gap = 140px. Dot center at y=50 in each row. */}
        <View
          style={{
            position: 'absolute',
            left: 21,
            top: 50,
            width: 2,
            height: (MILESTONES.length - 1) * 140,
            backgroundColor: DARK_TEXT,
            opacity: 0.2,
          }}
        />

        {MILESTONES.map((m, i) => (
          <View
            key={m.year}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: i < MILESTONES.length - 1 ? 40 : 0,
              paddingLeft: 10,
            }}
            wrap={false}
          >
            {/* Timeline dot — centered with 100px photo (center at y=43) */}
            <View
              style={{
                alignItems: 'center',
                width: 24,
                marginRight: 16,
                paddingTop: 43,
              }}
            >
              <Svg width={14} height={14}>
                <Circle cx="7" cy="7" r="7" fill={DARK_TEXT} />
              </Svg>
            </View>

            {/* Image */}
            {historyImages[i] ? (
              <Image
                src={historyImages[i]!}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  marginRight: 18,
                }}
              />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  marginRight: 18,
                  backgroundColor: '#D4C8B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 10, color: '#A09080' }}>{m.year}</Text>
              </View>
            )}

            {/* Text content */}
            <View style={{ flex: 1, paddingTop: 20 }}>
              <Text style={{ fontSize: 24, fontFamily: 'Montserrat', fontWeight: 'bold' as any, color: DARK_TEXT, marginBottom: 6 }}>{m.year}</Text>
              <Text style={{ fontSize: 12, color: '#4A4A4A', lineHeight: 1.6 }}>{m.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 6. Alliances Page
// ---------------------------------------------------------------------------
function AlliancesPage({ allianceLogos, logoDarkUrl }: { allianceLogos: (string | null)[]; logoDarkUrl: string }) {
  const validLogos = allianceLogos.filter(Boolean) as string[]
  if (validLogos.length === 0) return null

  return (
    <Page size="A4" style={[s.creamPage, { padding: 40, paddingTop: 36, justifyContent: 'center', alignItems: 'center' }]}>
      <PageLogoDark src={logoDarkUrl} />

      <View style={{ width: '100%', marginBottom: 32 }}>
        <Text
          style={{
            fontSize: 28,
            fontFamily: 'Montserrat', fontWeight: 'bold' as any,
            color: DARK_TEXT,
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          Alianzas que nos enorgullecen
        </Text>
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <YellowLine width={50} y={0} />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          width: '100%',
        }}
      >
        {validLogos.map((logo, i) => (
          <View
            key={i}
            style={{
              backgroundColor: WHITE,
              borderRadius: 12,
              padding: 14,
              margin: 10,
              alignItems: 'center',
              justifyContent: 'center',
              width: 145,
              height: 90,
            }}
          >
            <Image src={logo} style={{ width: 120, height: 65, objectFit: 'contain' as any }} />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 32, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Montserrat', fontWeight: 600 as any,
            color: DARK_TEXT,
            textAlign: 'center',
          }}
        >
          Más de 150 clientes en más de 800 puntos
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Montserrat', fontWeight: 600 as any,
            color: DARK_TEXT,
            textAlign: 'center',
          }}
        >
          por todo Colombia.
        </Text>
      </View>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 7. FAQ Page
// ---------------------------------------------------------------------------
const FAQS = [
  {
    q: '¿Qué tipo de productos ofrece Pastry?',
    a: 'Producimos una línea completa de panadería congelada: croissants, pain au chocolat, danish, panadería petit colombiana, hojaldritos y más. Todo listo para hornear directamente desde congelado.',
  },
  {
    q: '¿Necesito un panadero profesional para hornear los productos?',
    a: 'No. Nuestros productos vienen listos para hornear. Solo necesitas cualquier horno de la tecnología que tengas y nuestro equipo te capacitará con los tiempos y temperaturas ideales para cada producto, garantizando resultados perfectos desde el primer horneo.',
  },
  {
    q: '¿Cuál es el pedido mínimo?',
    a: 'Trabajamos con pedidos mínimos accesibles adaptados al canal HORECA. Contáctanos para conocer las condiciones según tu ciudad y volumen estimado.',
  },
  {
    q: '¿Cómo garantizan la cadena de frío?',
    a: 'Trabajamos con aliados logísticos certificados y cada entrega se monitorea con sensores de temperatura para garantizar que el producto llegue en condiciones óptimas.',
  },
  {
    q: '¿Cuál es la vida útil de los productos congelados?',
    a: 'Nuestros productos tienen una vida útil de 3 a 6 meses en congelación (-18°C). Cada empaque incluye fecha de vencimiento y lote para trazabilidad completa.',
  },
  {
    q: '¿Hacen entregas a nivel nacional?',
    a: 'Actualmente cubrimos las principales ciudades de Colombia: Bogotá, Medellín, Cali, Barranquilla y Cartagena. Estamos en expansión constante a nuevas zonas.',
  },
  {
    q: '¿Pueden desarrollar productos personalizados?',
    a: 'Sí. Nuestro equipo de I+D puede desarrollar formulaciones exclusivas para tu marca a partir de un mínimo de 500 unidades, con los sabores, tamaños y empaques que necesites.',
  },
]

function FAQPage({ logoYellowUrl }: { logoYellowUrl: string }) {
  return (
    <Page size="A4" style={[s.darkPage, { justifyContent: 'flex-start', alignItems: 'stretch', padding: 40, paddingTop: 80 }]}>
      <TopLeftAccent />
      <CornerAccent />
      <PageLogoYellow src={logoYellowUrl} />

      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 28,
            fontFamily: 'Montserrat', fontWeight: 'bold' as any,
            color: WHITE,
            marginBottom: 6,
          }}
        >
          Preguntas Frecuentes
        </Text>
        <YellowLine width={50} y={4} />
      </View>

      {FAQS.map((faq, i) => (
        <View key={i} style={{ marginBottom: 14 }} wrap={false}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
            <YellowDot size={8} />
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Montserrat', fontWeight: 600 as any,
                color: YELLOW,
                marginLeft: 8,
                flex: 1,
              }}
            >
              {faq.q}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 9,
              color: '#C0C0C0',
              lineHeight: 1.6,
              paddingLeft: 16,
            }}
          >
            {faq.a}
          </Text>
        </View>
      ))}
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 8. Contact / CTA Page
// ---------------------------------------------------------------------------
function ContactPage({ logoDarkUrl }: { logoDarkUrl: string }) {
  return (
    <Page size="A4" style={[s.creamPage, { padding: 60, justifyContent: 'center' }]}>
      <PageLogoDark src={logoDarkUrl} />

      <Text style={s.contactTitle}>Hablemos.</Text>
      <Text style={s.contactBody}>
        Queremos ser el aliado de tu cocina. Cuéntanos sobre tu negocio y te armamos
        una propuesta a la medida.
      </Text>

      <YellowLine width={50} y={0} />

      <View style={{ marginTop: 24 }}>
        <Text style={s.contactDetail}>comercial@pastrychef.com.co</Text>
        <Text style={s.contactDetail}>313 801 6374</Text>
      </View>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 9. Closing Phrase / Transition Page
// ---------------------------------------------------------------------------
function TransitionPage({ logoYellowUrl }: { logoYellowUrl: string }) {
  return (
    <Page size="A4" style={s.darkPage}>
      <TopLeftAccent />
      <CornerAccent />
      <PageLogoYellow src={logoYellowUrl} />

      <Text style={s.closingLine1}>Nuestro universo</Text>
      <Text style={[s.closingLine2, { marginTop: 6 }]}>de productos.</Text>

      <YellowLine width={60} y={20} />
    </Page>
  )
}

// ---------------------------------------------------------------------------
// 10. Product Catalog Pages (no prices)
// ---------------------------------------------------------------------------
function groupByCategory(products: CatalogProduct[]): Record<string, CatalogProduct[]> {
  const groups: Record<string, CatalogProduct[]> = {}
  for (const product of products) {
    const cat = product.subcategory || 'Otros'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(product)
  }
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
  )
}

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <View style={s.productRow} wrap={false}>
      {product.photoUrl ? (
        <Image src={product.photoUrl} style={s.productImage} />
      ) : (
        <View style={s.productImagePlaceholder}>
          <Text style={s.placeholderText}>Sin foto</Text>
        </View>
      )}

      <View style={s.productInfo}>
        <Text style={s.productName}>{product.name}</Text>
        {product.description && (
          <Text style={{ fontSize: 7, color: '#666666', marginBottom: 4, lineHeight: 1.4 }}>
            {product.description}
          </Text>
        )}

        <View style={s.variantsTable}>
          <View style={s.variantHeaderRow}>
            <View style={s.variantWeight}>
              <Text style={s.variantHeaderText}>PESO</Text>
            </View>
            <View style={s.variantUnits}>
              <Text style={s.variantHeaderText}>UND/PAQ</Text>
            </View>
          </View>

          {product.variants.map((variant, idx) => (
            <View style={s.variantRow} key={idx}>
              <View style={s.variantWeight}>
                <Text style={s.variantValueText}>{variant.weight}</Text>
              </View>
              <View style={s.variantUnits}>
                <Text style={s.variantValueText}>
                  {variant.unitsPerPackage || '-'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

function CatalogPages({
  products,
  logoDarkUrl,
  generatedDate,
}: {
  products: CatalogProduct[]
  logoDarkUrl: string
  generatedDate: string
}) {
  const grouped = groupByCategory(products)
  const categories = Object.entries(grouped)

  return (
    <Page size="A4" style={s.catalogPage} wrap>
      {/* Fixed header */}
      <View style={s.header} fixed>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image src={logoDarkUrl} style={{ width: 62, height: 35 }} />
        </View>
        <Text
          style={s.headerPage}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>

      {/* Product groups */}
      {categories.map(([category, prods]) => (
        <View key={category}>
          <View style={s.categoryHeader} wrap={false}>
            <Text style={s.categoryTitle}>{category}</Text>
          </View>
          {prods.map((product, idx) => (
            <ProductCard key={`${product.name}-${idx}`} product={product} />
          ))}
        </View>
      ))}

      {/* Fixed footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>PASTRY - Portafolio de Productos</Text>
        <Text style={s.footerText}>{generatedDate}</Text>
      </View>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
export function PresentationCatalogDocument({
  products,
  logoDarkUrl,
  logoYellowUrl,
  historyImages,
  allianceLogos,
  generatedDate,
}: PresentationCatalogProps) {
  return (
    <Document>
      {/* Presentation slides */}
      <CoverPage logoYellowUrl={logoYellowUrl} />
      <ManifestoPage logoYellowUrl={logoYellowUrl} />
      <ValuesPage values={VALUES.slice(0, 2)} logoYellowUrl={logoYellowUrl} />
      <ValuesPage values={VALUES.slice(2, 4)} logoYellowUrl={logoYellowUrl} />
      <StatsPage logoYellowUrl={logoYellowUrl} />
      <HistoryPage historyImages={historyImages} logoDarkUrl={logoDarkUrl} />
      <AlliancesPage allianceLogos={allianceLogos} logoDarkUrl={logoDarkUrl} />
      <FAQPage logoYellowUrl={logoYellowUrl} />
      <TransitionPage logoYellowUrl={logoYellowUrl} />

      {/* Product catalog (no prices) */}
      <CatalogPages
        products={products}
        logoDarkUrl={logoDarkUrl}
        generatedDate={generatedDate}
      />

      {/* Contact page last */}
      <ContactPage logoDarkUrl={logoDarkUrl} />
    </Document>
  )
}

// ---------------------------------------------------------------------------
// Blob generator
// ---------------------------------------------------------------------------
export async function generatePresentationCatalogPDFBlob(
  props: PresentationCatalogProps,
): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer')
  return await pdf(<PresentationCatalogDocument {...props} />).toBlob()
}
