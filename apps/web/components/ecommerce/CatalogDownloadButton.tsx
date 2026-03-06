'use client'

import { useState } from 'react'
import { Download, X, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { generateCatalogPDFBlob, type CatalogProduct } from '@/lib/pdf-catalog'
import { toast } from 'sonner'

type Product = Database['public']['Tables']['products']['Row']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export function CatalogDownloadButton() {
  const { user, hasRole } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Only show for authenticated commercial users (or admins)
  const isCommercial = user && (hasRole('commercial') || hasRole('super_admin') || hasRole('administrator'))
  if (!isCommercial) return null

  const handleDownload = async (includePrices: boolean) => {
    setIsGenerating(true)
    try {
      // Fetch all visible products with config and media
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
        toast.error('No se encontraron productos para el catalogo')
        return
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
          // If the group has no photo yet but this variant does, use it
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

      // Convert product images to base64 so @react-pdf can render them
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

      // Convert all product photos to base64 in parallel
      const photoPromises = catalogProducts.map(async (p) => {
        if (p.photoUrl) {
          p.photoUrl = await imageToBase64(p.photoUrl)
        }
      })
      await Promise.all(photoPromises)

      // Convert logo to base64 too
      const logoUrl = await imageToBase64(`${window.location.origin}/Logo_Pastry-06 2.jpg`) || `${window.location.origin}/Logo_Pastry-06 2.jpg`
      const blob = await generateCatalogPDFBlob(catalogProducts, includePrices, logoUrl)

      // Download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const suffix = includePrices ? 'con_precios' : 'sin_precios'
      const date = new Date().toISOString().split('T')[0]
      a.download = `Catalogo_PASTRY_${suffix}_${date}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Catalogo descargado exitosamente')
      setShowModal(false)
    } catch (err) {
      console.error('Error generating catalog:', err)
      toast.error('Error al generar el catalogo')
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
            <div className="bg-white w-full md:w-96 md:rounded-xl rounded-t-2xl shadow-2xl p-6 pointer-events-auto animate-in slide-in-from-bottom duration-300">
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
                  <p className="text-sm text-gray-600 mb-6">
                    Selecciona el tipo de catalogo que deseas descargar:
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleDownload(true)}
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
                      onClick={() => handleDownload(false)}
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
