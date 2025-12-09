"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { isValidYouTubeUrl, getYouTubeThumbnailUrl } from "@/lib/youtube-utils"
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react"
import type { VideoTutorial } from "@/lib/database.types"

interface VideoConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { video_url: string; title?: string; description?: string }) => Promise<void>
  onDelete?: () => Promise<void>
  existingVideo?: VideoTutorial | null
  modulePath: string
}

export function VideoConfigModal({
  open,
  onOpenChange,
  onSave,
  onDelete,
  existingVideo,
  modulePath
}: VideoConfigModalProps) {
  const [videoUrl, setVideoUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isValid, setIsValid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset form when modal opens/closes or when existingVideo changes
  useEffect(() => {
    if (open) {
      setVideoUrl(existingVideo?.video_url || "")
      setTitle(existingVideo?.title || "")
      setDescription(existingVideo?.description || "")
    } else {
      // Clear form when modal closes
      setVideoUrl("")
      setTitle("")
      setDescription("")
    }
  }, [open, existingVideo])

  // Validate YouTube URL
  useEffect(() => {
    setIsValid(isValidYouTubeUrl(videoUrl))
  }, [videoUrl])

  const handleSave = async () => {
    if (!isValid) return

    try {
      setSaving(true)
      await onSave({
        video_url: videoUrl,
        title: title.trim() || undefined,
        description: description.trim() || undefined
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving video:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    const confirmed = confirm('¿Está seguro de eliminar este tutorial de video?')
    if (!confirmed) return

    try {
      setDeleting(true)
      await onDelete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting video:', error)
    } finally {
      setDeleting(false)
    }
  }

  const thumbnailUrl = isValid ? getYouTubeThumbnailUrl(videoUrl) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {existingVideo ? 'Editar Tutorial de Video' : 'Configurar Tutorial de Video'}
          </DialogTitle>
          <DialogDescription>
            Configura el video tutorial para: <strong>{modulePath}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video URL Field */}
          <div className="space-y-2">
            <Label htmlFor="video-url">
              URL de YouTube <span className="text-red-500">*</span>
            </Label>
            <Input
              id="video-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              aria-label="URL del video de YouTube"
              aria-required="true"
              aria-invalid={videoUrl.length > 0 && !isValid}
            />
            {videoUrl && (
              <div className="flex items-center gap-2 text-sm">
                {isValid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">URL válida</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">URL de YouTube inválida</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Preview Thumbnail */}
          {thumbnailUrl && (
            <div className="space-y-2">
              <Label>Vista Previa</Label>
              <img
                src={thumbnailUrl}
                alt="Video preview"
                className="w-full max-w-md rounded-lg border"
              />
            </div>
          )}

          {/* Title Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="video-title">Título (Opcional)</Label>
            <Input
              id="video-title"
              placeholder="Ej: Tutorial de Gestión de Pedidos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Título del tutorial"
            />
            <p className="text-sm text-muted-foreground">
              Si se deja vacío, se usará el nombre del módulo
            </p>
          </div>

          {/* Description Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="video-description">Descripción (Opcional)</Label>
            <Textarea
              id="video-description"
              placeholder="Breve descripción de lo que cubre este tutorial..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              aria-label="Descripción del tutorial"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {existingVideo && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || saving || deleting}
            >
              {saving ? 'Guardando...' : existingVideo ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
