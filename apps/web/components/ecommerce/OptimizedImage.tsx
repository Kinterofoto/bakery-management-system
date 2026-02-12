'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [isLoaded, setIsLoaded] = useState(() => {
    // Check if image is already in browser cache on mount
    if (!src || typeof window === 'undefined') return false
    const img = new Image()
    img.src = src
    return img.complete && img.naturalWidth > 0
  })
  const [hasError, setHasError] = useState(false)
  const currentSrcRef = useRef(src)

  useEffect(() => {
    // Track the current src to prevent stale callbacks
    currentSrcRef.current = src

    if (!src) {
      setHasError(true)
      setIsLoaded(false)
      return
    }

    setHasError(false)

    // Check if image is already cached
    const img = new Image()
    img.src = src
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true)
    } else {
      setIsLoaded(false)
      if (priority) {
        img.onload = () => {
          if (currentSrcRef.current === src) {
            setIsLoaded(true)
          }
        }
        img.onerror = () => {
          if (currentSrcRef.current === src) {
            setHasError(true)
          }
        }
      }
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

      {/* Actual image - use src prop directly to avoid empty-string race condition */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => {
          if (currentSrcRef.current === src) {
            setIsLoaded(true)
          }
        }}
        onError={() => {
          if (currentSrcRef.current === src) {
            setHasError(true)
          }
        }}
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
