/**
 * Image compression utility for optimizing images before upload
 * Compresses images to JPEG format with target size of 50KB
 */

export interface CompressionOptions {
  maxSizeKB?: number
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp'
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeKB: 50,
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  format: 'jpeg'
}

/**
 * Compresses an image file to meet size requirements
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed image as File
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Load image
  const image = await loadImage(file)

  // Calculate new dimensions maintaining aspect ratio
  const { width, height } = calculateDimensions(
    image.width,
    image.height,
    opts.maxWidth!,
    opts.maxHeight!
  )

  // Try compression with initial quality
  let quality = opts.quality!
  let compressedBlob: Blob | null = null
  let attempts = 0
  const maxAttempts = 8

  // Iteratively reduce quality until size target is met
  while (attempts < maxAttempts) {
    compressedBlob = await compressToBlob(image, width, height, quality, opts.format!)

    const sizeKB = compressedBlob.size / 1024

    // If size is acceptable, break
    if (sizeKB <= opts.maxSizeKB!) {
      break
    }

    // Reduce quality for next attempt
    quality = Math.max(0.1, quality - 0.1)
    attempts++
  }

  if (!compressedBlob) {
    throw new Error('Failed to compress image')
  }

  // Convert blob to File with .jpg extension
  const fileName = file.name.replace(/\.[^/.]+$/, '.jpg')
  return new File([compressedBlob], fileName, {
    type: `image/${opts.format}`,
    lastModified: Date.now()
  })
}

/**
 * Loads an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => resolve(img)
      img.onerror = reject

      img.src = e.target?.result as string
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Calculates new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth
  let height = originalHeight

  // Scale down if needed
  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Compresses image to blob with specified parameters
 */
function compressToBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  format: 'jpeg' | 'webp'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    // Fill white background for JPEG (handles transparency)
    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    }

    // Draw image
    ctx.drawImage(image, 0, 0, width, height)

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      },
      `image/${format}`,
      quality
    )
  })
}

/**
 * Gets compressed file size in KB
 */
export function getFileSizeKB(file: File): number {
  return file.size / 1024
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
