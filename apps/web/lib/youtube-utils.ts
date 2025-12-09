/**
 * YouTube URL handling utilities for video tutorials
 */

/**
 * Extracts YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - Direct video ID (11 characters)
 *
 * @param url - YouTube URL or video ID
 * @returns Video ID or null if invalid
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  // Remove whitespace
  url = url.trim()

  // Regular expressions for different YouTube URL formats
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Old embed: youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // Direct video ID (11 characters)
    /^([a-zA-Z0-9_-]{11})$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Converts any YouTube URL to embed format
 *
 * @param url - YouTube URL or video ID
 * @returns Embed URL or null if invalid
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return null

  return `https://www.youtube.com/embed/${videoId}`
}

/**
 * Validates if a URL is a valid YouTube URL or video ID
 *
 * @param url - YouTube URL or video ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null
}

/**
 * Gets YouTube thumbnail URL for a video
 *
 * @param url - YouTube URL or video ID
 * @param quality - Thumbnail quality: 'default' | 'medium' | 'high' | 'maxres'
 * @returns Thumbnail URL or null if invalid
 */
export function getYouTubeThumbnailUrl(
  url: string,
  quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'
): string | null {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return null

  const qualityMap = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    maxres: 'maxresdefault.jpg'
  }

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`
}
