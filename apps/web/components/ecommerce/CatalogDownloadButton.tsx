'use client'

import { useState } from 'react'
import { Download, X, FileText, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { generateCatalogPDFBlob, type CatalogProduct } from '@/lib/pdf-catalog'
import { generatePresentationCatalogPDFBlob } from '@/lib/pdf-catalog-presentation'
import { toast } from 'sonner'

type Product = Database['public']['Tables']['products']['Row']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

// History images from landing page
const HISTORY_IMAGE_PATHS = [
  '/landing/historia/historia-2011.jpg',
  '/landing/historia/historia-2017.jpg',
  '/landing/historia/historia-2019.jpg',
  '/landing/historia/historia-2020.jpg',
  '/landing/historia/historia-2025.jpg',
]

// Alliance logos from landing page
const ALLIANCE_LOGO_PATHS = [
  '/landing/logos-clientes/Colsubsidio_logo.svg.png',
  '/landing/logos-clientes/OXXO-Logo.png',
  '/landing/logos-clientes/logo_4.png',
  '/landing/logos-clientes/starbucks-logo-white-text.png',
]

type DownloadMode = 'with_prices' | 'without_prices' | 'presentation'

export function CatalogDownloadButton() {
  const { user, hasRole } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Only show for authenticated commercial users (or admins)
  const isCommercial = user && (hasRole('commercial') || hasRole('super_admin') || hasRole('administrator'))
  if (!isCommercial) return null

  const imageToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const fetchProducts = async (): Promise<CatalogProduct[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_config (
          units_per_package
        ),
        product_media!product_media_product_id_fkey (
          file_url,
          is_primary
        )
      `)
      .eq('category', 'PT')
      .eq('visible_in_ecommerce', true)
      .eq('is_active', true)
      .not('subcategory', 'is', null)
      .order('subcategory')
      .order('name')

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('No se encontraron productos para el catalogo')
    }

    // Group variants by product name + subcategory
    const productMap = new Map<string, CatalogProduct>()

    for (const product of data) {
      const key = `${product.subcategory}-${product.name}`
      const primaryMedia = (product as any).product_media?.find((m: any) => m.is_primary)
      const firstMedia = (product as any).product_media?.[0]
      const photoUrl = primaryMedia?.file_url || firstMedia?.file_url || null
      const config = (product as any).product_config?.[0]

      if (!productMap.has(key)) {
        productMap.set(key, {
          name: product.name,
          subcategory: product.subcategory || 'Otros',
          photoUrl,
          variants: [],
        })
      } else if (!productMap.get(key)!.photoUrl && photoUrl) {
        productMap.get(key)!.photoUrl = photoUrl
      }

      productMap.get(key)!.variants.push({
        weight: product.weight || 'N/A',
        unitsPerPackage: config?.units_per_package || null,
        price: product.price || 0,
        taxRate: product.tax_rate || 0,
      })
    }

    // Sort variants by weight within each product
    const catalogProducts = Array.from(productMap.values())
    for (const p of catalogProducts) {
      p.variants.sort((a, b) => {
        const numA = parseFloat(a.weight) || 0
        const numB = parseFloat(b.weight) || 0
        return numA - numB
      })
    }

    // Convert all product photos to base64 in parallel
    await Promise.all(
      catalogProducts.map(async (p) => {
        if (p.photoUrl) {
          p.photoUrl = await imageToBase64(p.photoUrl)
        }
      })
    )

    return catalogProducts
  }

  const handleDownload = async (mode: DownloadMode) => {
    setIsGenerating(true)
    try {
      const catalogProducts = await fetchProducts()
      const origin = window.location.origin
      const logoUrl = await imageToBase64(`${origin}/Logo_Pastry-06 2.jpg`) || `${origin}/Logo_Pastry-06 2.jpg`

      let blob: Blob
      let filename: string
      const date = new Date().toISOString().split('T')[0]

      if (mode === 'presentation') {
        // Fetch additional assets for presentation PDF
        const [logoDarkUrl, logoYellowUrl, ...historyAndAlliance] = await Promise.all([
          imageToBase64(`${origin}/landing/logo-dark.png`),
          imageToBase64(`${origin}/landing/logo-yellow.png`),
          ...HISTORY_IMAGE_PATHS.map((p) => imageToBase64(`${origin}${p}`)),
          ...ALLIANCE_LOGO_PATHS.map((p) => imageToBase64(`${origin}${p}`)),
        ])

        const historyImages = historyAndAlliance.slice(0, HISTORY_IMAGE_PATHS.length)
        const allianceLogos = historyAndAlliance.slice(HISTORY_IMAGE_PATHS.length)

        const generatedDate = new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        blob = await generatePresentationCatalogPDFBlob({
          products: catalogProducts,
          logoDarkUrl: logoDarkUrl || logoUrl,
          logoYellowUrl: logoYellowUrl || logoUrl,
          historyImages,
          allianceLogos,
          generatedDate,
        })
        filename = `Presentacion_PASTRY_${date}.pdf`
      } else {
        const includePrices = mode === 'with_prices'
        blob = await generateCatalogPDFBlob(catalogProducts, includePrices, logoUrl)
        const suffix = includePrices ? 'con_precios' : 'sin_precios'
        filename = `Catalogo_PASTRY_${suffix}_${date}.pdf`
      }

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Catalogo descargado exitosamente')
      setShowModal(false)
    } catch (err: any) {
      console.error('Error generating catalog:', err)
      toast.error(err?.message || 'Error al generar el catalogo')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      {/* Floating Download Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 bg-[#27282E] text-white rounded-full p-3 shadow-lg hover:bg-gray-800 transition group"
        title="Descargar catalogo PDF"
      >
        <Download className="w-5 h-5" />
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-[#27282E] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none hidden md:block">
          Descargar Catalogo
        </span>
      </button>

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => !isGenerating && setShowModal(false)}
          />

          {/* Mobile: Bottom Sheet / Desktop: Center Modal */}
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
            <div className="bg-white w-full md:w-[420px] md:rounded-xl rounded-t-2xl shadow-2xl p-6 pointer-events-auto animate-in slide-in-from-bottom duration-300">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#DFD860] p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-[#27282E]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#27282E]">Descargar Catalogo</h2>
                    <p className="text-xs text-gray-500">Formato PDF con todos los productos</p>
                  </div>
                </div>
                <button
                  onClick={() => !isGenerating && setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition"
                  disabled={isGenerating}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-[#DFD860] animate-spin" />
                  <p className="text-sm text-gray-600">Generando catalogo...</p>
                  <p className="text-xs text-gray-400">Esto puede tardar unos segundos</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-5">
                    Selecciona el tipo de catalogo que deseas descargar:
                  </p>

                  <div className="space-y-3">
                    {/* Presentation option - highlighted */}
                    <button
                      onClick={() => handleDownload('presentation')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-[#DFD860] rounded-xl bg-[#DFD860]/5 hover:bg-[#DFD860]/15 transition text-left relative overflow-hidden"
                    >
                      <div className="bg-[#27282E] p-2 rounded-lg flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-[#DFD860]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#27282E]">Presentacion + Portafolio</p>
                        <p className="text-xs text-gray-500">Presentacion de marca completa + catalogo sin precios</p>
                      </div>
                      <span className="absolute top-2 right-2 text-[10px] font-semibold bg-[#DFD860] text-[#27282E] px-2 py-0.5 rounded-full">
                        NUEVO
                      </span>
                    </button>

                    <button
                      onClick={() => handleDownload('with_prices')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#DFD860] hover:bg-yellow-50 transition text-left"
                    >
                      <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                        <span className="text-lg">$</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#27282E]">Con precios</p>
                        <p className="text-xs text-gray-500">Incluye precios por paquete e IVA</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDownload('without_prices')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#DFD860] hover:bg-yellow-50 transition text-left"
                    >
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <span className="text-lg">📋</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#27282E]">Sin precios</p>
                        <p className="text-xs text-gray-500">Solo productos, pesos y presentaciones</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
