"use client"

import { useState, useEffect, useRef } from "react"
import { usePrototypePhotos, PrototypePhoto } from "@/hooks/use-prototype-photos"
import { Camera, X } from "lucide-react"

interface OperationPhotosProps {
  prototypeId: string
  operationId: string
}

export function OperationPhotos({ prototypeId, operationId }: OperationPhotosProps) {
  const { getPhotosByOperation, uploadPhoto, deletePhoto, loading } = usePrototypePhotos()
  const [photos, setPhotos] = useState<PrototypePhoto[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPhotosByOperation(operationId).then(setPhotos)
  }, [operationId, getPhotosByOperation])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadPhoto(file, prototypeId, operationId, "operation")
    if (result) {
      setPhotos(prev => [...prev, result])
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async (photoId: string) => {
    const ok = await deletePhoto(photoId)
    if (ok) {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    }
  }

  return (
    <div>
      <label className="text-[10px] text-gray-400 uppercase mb-2 block">Fotos</label>
      <div className="flex items-center gap-2 flex-wrap">
        {photos.map(photo => (
          <div key={photo.id} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={photo.photo_url}
              alt={photo.caption || "Foto operación"}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleDelete(photo.id)}
              className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-bl-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
        >
          <Camera className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
