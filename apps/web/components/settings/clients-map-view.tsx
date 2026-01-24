"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, AlertCircle } from "lucide-react"

interface BranchLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  clientName: string
  clientId: string
  isMain: boolean
}

interface ClientsMapViewProps {
  locations: BranchLocation[]
  loading?: boolean
}

export function ClientsMapView({ locations, loading }: ClientsMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<BranchLocation | null>(null)

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setMapError("API key de Google Maps no configurada")
      return
    }

    // Check if already loaded
    if (typeof window !== "undefined" && window.google?.maps) {
      setMapLoaded(true)
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setMapLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkLoaded)
        if (!window.google?.maps) {
          setMapError("Error al cargar Google Maps")
        }
      }, 10000)

      return () => clearInterval(checkLoaded)
    }

    // Load Google Maps script
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      setTimeout(() => {
        if (window.google?.maps) {
          setMapLoaded(true)
        } else {
          setMapError("Google Maps no disponible")
        }
      }, 100)
    }

    script.onerror = () => {
      setMapError("Error al cargar Google Maps")
    }

    document.head.appendChild(script)
  }, [])

  // Initialize map when loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

    // Center on Bogota, Colombia by default
    const defaultCenter = { lat: 4.7110, lng: -74.0721 }

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 11,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    })

    infoWindowRef.current = new google.maps.InfoWindow()
  }, [mapLoaded])

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    if (locations.length === 0) return

    const bounds = new google.maps.LatLngBounds()

    locations.forEach((location) => {
      const position = { lat: location.latitude, lng: location.longitude }

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `${location.clientName} - ${location.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: location.isMain ? "#3b82f6" : "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }
      })

      marker.addListener("click", () => {
        setSelectedLocation(location)

        const content = `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${location.clientName}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
              ${location.name} ${location.isMain ? '(Principal)' : ''}
            </p>
            <p style="margin: 0; font-size: 11px; color: #888;">${location.address}</p>
          </div>
        `

        infoWindowRef.current?.setContent(content)
        infoWindowRef.current?.open(mapInstanceRef.current, marker)
      })

      markersRef.current.push(marker)
      bounds.extend(position)
    })

    // Fit map to show all markers
    if (locations.length > 1) {
      mapInstanceRef.current.fitBounds(bounds)
    } else if (locations.length === 1) {
      mapInstanceRef.current.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude })
      mapInstanceRef.current.setZoom(15)
    }
  }, [locations, mapLoaded])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando ubicaciones...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mapError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
            <p className="text-amber-600">{mapError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Mapa de Ubicaciones</h3>
          <p className="text-gray-600">
            Visualiza las sucursales de tus clientes en el mapa
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">Principal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Sucursal</span>
          </div>
          <Badge variant="outline">
            {locations.length} ubicación{locations.length !== 1 ? 'es' : ''}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="w-full h-[600px] rounded-lg"
            style={{ minHeight: "600px" }}
          />
        </CardContent>
      </Card>

      {selectedLocation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedLocation.clientName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sucursal:</span>
                <p className="font-medium">
                  {selectedLocation.name}
                  {selectedLocation.isMain && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800">Principal</Badge>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Dirección:</span>
                <p className="font-medium">{selectedLocation.address}</p>
              </div>
              <div>
                <span className="text-gray-500">Latitud:</span>
                <p className="font-medium">{selectedLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-gray-500">Longitud:</span>
                <p className="font-medium">{selectedLocation.longitude.toFixed(6)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
