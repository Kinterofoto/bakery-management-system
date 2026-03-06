import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Register a clean font
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

export interface CatalogProduct {
  name: string
  subcategory: string
  photoUrl: string | null
  variants: {
    weight: string
    unitsPerPackage: number | null
    price: number
    taxRate: number
  }[]
}

interface CatalogPDFProps {
  products: CatalogProduct[]
  includePrices: boolean
  logoUrl: string
  generatedDate: string
}

const DARK = '#27282E'
const YELLOW = '#DFD860'
const LIGHT_GRAY = '#F5F5F5'
const MEDIUM_GRAY = '#E0E0E0'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  // Cover page
  coverPage: {
    padding: 0,
    fontFamily: 'Helvetica',
    backgroundColor: DARK,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLogo: {
    width: 180,
    height: 180,
    marginBottom: 30,
    borderRadius: 10,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: YELLOW,
    marginBottom: 10,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  coverDate: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
    marginTop: 30,
  },
  // Header
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
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  headerPage: {
    fontSize: 8,
    color: '#999999',
  },
  // Category section
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
    fontFamily: 'Helvetica-Bold',
    color: YELLOW,
  },
  // Product card
  productRow: {
    flexDirection: 'row',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: MEDIUM_GRAY,
    borderRadius: 6,
    overflow: 'hidden',
    minHeight: 90,
  },
  productImage: {
    width: 90,
    height: 90,
    backgroundColor: LIGHT_GRAY,
  },
  productImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: LIGHT_GRAY,
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
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  variantsTable: {
    marginTop: 4,
  },
  variantHeaderRow: {
    flexDirection: 'row',
    backgroundColor: LIGHT_GRAY,
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
    width: '35%',
    fontSize: 8,
  },
  variantUnits: {
    width: '30%',
    fontSize: 8,
  },
  variantPrice: {
    width: '35%',
    fontSize: 8,
    textAlign: 'right',
  },
  variantHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#666666',
  },
  variantValueText: {
    fontSize: 8,
    color: '#333333',
  },
  vatBadge: {
    fontSize: 6,
    color: '#999999',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: MEDIUM_GRAY,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#999999',
  },
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(price))
}

// Cover page component
function CoverPage({ logoUrl, generatedDate }: { logoUrl: string; generatedDate: string }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Image src={logoUrl} style={styles.coverLogo} />
      <Text style={styles.coverTitle}>CATALOGO</Text>
      <Text style={styles.coverSubtitle}>Productos Terminados</Text>
      <Text style={styles.coverSubtitle}>PASTRY</Text>
      <Text style={styles.coverDate}>{generatedDate}</Text>
    </Page>
  )
}

// Group products by category
function groupByCategory(products: CatalogProduct[]): Record<string, CatalogProduct[]> {
  const groups: Record<string, CatalogProduct[]> = {}
  for (const product of products) {
    const cat = product.subcategory || 'Otros'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(product)
  }
  // Sort categories
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  )
}

function ProductCard({ product, includePrices }: { product: CatalogProduct; includePrices: boolean }) {
  const hasMultipleVariants = product.variants.length > 1

  return (
    <View style={styles.productRow} wrap={false}>
      {/* Product Image */}
      {product.photoUrl ? (
        <Image src={product.photoUrl} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.placeholderText}>Sin foto</Text>
        </View>
      )}

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>

        {/* Variants table */}
        <View style={styles.variantsTable}>
          {/* Header row */}
          <View style={styles.variantHeaderRow}>
            <View style={styles.variantWeight}>
              <Text style={styles.variantHeaderText}>PESO</Text>
            </View>
            <View style={styles.variantUnits}>
              <Text style={styles.variantHeaderText}>UND/PAQ</Text>
            </View>
            {includePrices && (
              <View style={styles.variantPrice}>
                <Text style={styles.variantHeaderText}>PRECIO PAQ</Text>
              </View>
            )}
          </View>

          {/* Variant rows */}
          {product.variants.map((variant, idx) => (
            <View style={styles.variantRow} key={idx}>
              <View style={styles.variantWeight}>
                <Text style={styles.variantValueText}>{variant.weight}</Text>
              </View>
              <View style={styles.variantUnits}>
                <Text style={styles.variantValueText}>
                  {variant.unitsPerPackage || '-'}
                </Text>
              </View>
              {includePrices && (
                <View style={styles.variantPrice}>
                  <Text style={styles.variantValueText}>
                    ${formatPrice(variant.price)}
                    {variant.taxRate === 19 && (
                      <Text style={styles.vatBadge}> +IVA</Text>
                    )}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

export function CatalogDocument({ products, includePrices, logoUrl, generatedDate }: CatalogPDFProps) {
  const grouped = groupByCategory(products)
  const categories = Object.entries(grouped)

  return (
    <Document>
      <CoverPage logoUrl={logoUrl} generatedDate={generatedDate} />

      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image src={logoUrl} style={styles.headerLogo} />
            <Text style={styles.headerTitle}>PASTRY</Text>
          </View>
          <Text style={styles.headerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

        {/* Products by category */}
        {categories.map(([category, prods]) => (
          <View key={category}>
            <View style={styles.categoryHeader} wrap={false}>
              <Text style={styles.categoryTitle}>{category}</Text>
            </View>

            {prods.map((product, idx) => (
              <ProductCard key={`${product.name}-${idx}`} product={product} includePrices={includePrices} />
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>PASTRY - Catalogo de Productos</Text>
          <Text style={styles.footerText}>{generatedDate}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateCatalogPDFBlob(
  products: CatalogProduct[],
  includePrices: boolean,
  logoUrl: string,
): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer')
  const generatedDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return await pdf(
    <CatalogDocument
      products={products}
      includePrices={includePrices}
      logoUrl={logoUrl}
      generatedDate={generatedDate}
    />
  ).toBlob()
}
