'use client'

import { useState, useEffect } from 'react'
import { ImageIcon } from 'lucide-react'

interface OptimizedImageProps {
  src: string | null
  alt: string
  fallbackEmoji?: string
  className?: string
  priority?: boolean
}

/**
 * Optimized image component with lazy loading, blur placeholder, and fallback
 * Perfect for e-commerce product images loaded from Supabase Storage
 */
export function OptimizedImage({
  src,
  alt,
  fallbackEmoji,
  className = '',
  priority = false
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!src) {
      setHasError(true)
      return
    }

    // Reset states when src changes
    setIsLoaded(false)
    setHasError(false)
    setImageSrc(src)

    // Preload image for priority images
    if (priority) {
      const img = new Image()
      img.src = src
      img.onload = () => setIsLoaded(true)
      img.onerror = () => setHasError(true)
    }
  }, [src, priority])

  if (!src || hasError) {
    // Fallback: Show emoji if provided, otherwise show placeholder icon
    return (
      <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
        {fallbackEmoji ? (
          <div className="text-5xl">{fallbackEmoji}</div>
        ) : (
          <ImageIcon className="w-12 h-12 text-gray-300" />
        )}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder - shown while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}

      {/* Actual image */}
      <img
        src={imageSrc || ''}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`
          w-full h-full object-cover transition-all duration-300
          ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
        style={{
          // Force hardware acceleration
          transform: 'translateZ(0)',
          willChange: 'opacity, transform'
        }}
      />
    </div>
  )
}
