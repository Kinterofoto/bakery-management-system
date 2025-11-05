"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, FileText, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PDFViewerProps {
  fileName: string | null
  className?: string
}

export function PDFViewer({ fileName, className = "" }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileName) {
      setPdfUrl(null)
      return
    }

    const fetchPdfUrl = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const { data, error } = await supabase.storage
          .from('ordenesdecompra')
          .createSignedUrl(`oc/${fileName}`, 3600) // 1 hour expiration

        if (error) {
          console.error('Error fetching PDF URL:', error)
          setError('Error al cargar el PDF')
          return
        }

        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl)
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Error al cargar el PDF')
      } finally {
        setLoading(false)
      }
    }

    fetchPdfUrl()
  }, [fileName])

  if (!fileName) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <CardContent className="text-center p-6">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay PDF disponible para este pedido</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <CardContent className="text-center p-6">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando PDF...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !pdfUrl) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <CardContent className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Error al cargar el PDF'}</p>
          <p className="text-sm text-gray-500 mt-2">Archivo: {fileName}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`h-96 ${className}`}>
      <CardContent className="p-2 h-full">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0 rounded"
          title={`PDF - ${fileName}`}
        />
      </CardContent>
    </Card>
  )
}