"use client"

import { useState } from "react"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface PhotoUploadProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  multiple?: boolean
  label?: string
}

export function PhotoUpload({
  photos,
  onPhotosChange,
  multiple = false,
  label = "Agregar foto"
}: PhotoUploadProps) {
  const [previews, setPreviews] = useState<string[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length > 0) {
      const newPhotos = multiple ? [...photos, ...files] : files
      onPhotosChange(newPhotos)

      // Generate previews
      files.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
    setPreviews(newPreviews)
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        multiple={multiple}
        className="hidden"
        id={`photo-upload-${label.replace(/\s/g, '-')}`}
      />

      <label htmlFor={`photo-upload-${label.replace(/\s/g, '-')}`}>
        <Button
          type="button"
          variant="outline"
          className="w-full h-16 border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50"
          asChild
        >
          <div className="flex items-center justify-center gap-2 cursor-pointer">
            <Camera className="h-6 w-6 text-teal-600" />
            <span className="text-base font-medium text-gray-700">{label}</span>
          </div>
        </Button>
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square relative rounded-lg overflow-hidden border-2 border-gray-200">
                <Image
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
