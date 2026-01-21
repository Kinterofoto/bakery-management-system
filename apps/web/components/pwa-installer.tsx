"use client"

import { useEffect } from 'react'

const isDevelopment = process.env.NODE_ENV === 'development'

export function PWAInstaller() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // In development, unregister any existing service workers to prevent
      // the offline page from appearing during hot reload
      if (isDevelopment) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister()
            console.log('Service Worker unregistered (development mode)')
          })
        })
        return
      }

      // Register service worker only in production
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available')
                  // Could show a notification to user here
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}
