"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getYouTubeEmbedUrl } from "@/lib/youtube-utils"
import { AlertCircle } from "lucide-react"

interface VideoPlayerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoUrl: string
  title?: string
  description?: string
}

export function VideoPlayerModal({
  open,
  onOpenChange,
  videoUrl,
  title = "Tutorial de Video",
  description
}: VideoPlayerModalProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (videoUrl) {
      const url = getYouTubeEmbedUrl(videoUrl)
      setEmbedUrl(url)
    }
  }, [videoUrl])

  // Add autoplay parameter when modal opens
  const autoplayEmbedUrl = embedUrl ? `${embedUrl}?autoplay=1&rel=0` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="w-full">
          {autoplayEmbedUrl ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={autoplayEmbedUrl}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                aria-label={`Video tutorial: ${title}`}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <p className="text-gray-600">No se pudo cargar el video. URL inválida.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
