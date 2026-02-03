"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, AlertCircle, Search } from "lucide-react"
import { FREQUENCY_DAYS } from "@/lib/constants/frequency-days"
import { cn } from "@/lib/utils"

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
  frequencies?: any[]
  onToggleFrequency?: (branchId: string, day: number) => Promise<any>
}

export function ClientsMapView({ locations, loading, frequencies = [], onToggleFrequency }: ClientsMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<BranchLocation | null>(null)
  const [togglingDay, setTogglingDay] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return locations
    const term = searchTerm.toLowerCase()
    return locations.filter(location => 
      location.clientName.toLowerCase().includes(term) ||
      location.name.toLowerCase().includes(term) ||
      location.address.toLowerCase().includes(term)
    )
  }, [locations, searchTerm])

  // Get active days for selected branch
  const activeDays = useMemo(() => {
    if (!selectedLocation) return []
    return frequencies
      .filter(f => f.branch_id === selectedLocation.id && f.is_active)
      .map(f => f.day_of_week)
      .sort((a, b) => a - b)
  }, [frequencies, selectedLocation])

  const handleToggle = async (dayId: number) => {
    if (!selectedLocation || !onToggleFrequency) return
    setTogglingDay(dayId)
    try {
      await onToggleFrequency(selectedLocation.id, dayId)
    } finally {
      setTogglingDay(null)
    }
  }

  // Helper to generate SVG string for marker icon
  const getMarkerIcon = (branchId: string) => {
    const branchActiveDays = frequencies
      .filter(f => f.branch_id === branchId && f.is_active)
      .map(f => f.day_of_week)
      .sort((a, b) => a - b)

    // Default gray if no days
    if (branchActiveDays.length === 0) {
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#9ca3af",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      }
    }

    // Single day: Use standard marker symbol (simpler)
    if (branchActiveDays.length === 1) {
      const day = FREQUENCY_DAYS.find(d => d.id === branchActiveDays[0])
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: day?.color || "#9ca3af",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      }
    }

    // Multiple days: Generate SVG Pie Chart
    const radius = 12
    const cx = 12
    const cy = 12
    const totalDays = branchActiveDays.length
    const anglePerDay = 360 / totalDays

    let svgPaths = ""
    
    branchActiveDays.forEach((dayId, index) => {
      const day = FREQUENCY_DAYS.find(d => d.id === dayId)
      const color = day?.color || "#9ca3af"
      
      const startAngle = index * anglePerDay
      const endAngle = (index + 1) * anglePerDay
      
      // Convert polar to cartesian
      // Note: SVG Y is down. 0 degrees is 3 o'clock. We want to start from top (12 o'clock)
      // So subtract 90 degrees (PI/2) from angles
      const startRad = (startAngle - 90) * Math.PI / 180
      const endRad = (endAngle - 90) * Math.PI / 180

      const x1 = cx + radius * Math.cos(startRad)
      const y1 = cy + radius * Math.sin(startRad)
      const x2 = cx + radius * Math.cos(endRad)
      const y2 = cy + radius * Math.sin(endRad)

      // Path command
      // M cx cy : Move to center
      // L x1 y1 : Line to start point on circle
      // A radius radius 0 0 1 x2 y2 : Arc to end point
      // Z : Close path
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
      
      svgPaths += `<path d="${d}" fill="${color}" stroke="none" />`
    })

    // Create SVG string
    // ViewBox 0 0 24 24 covers the 12 radius + center
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle cx="12" cy="12" r="11" fill="white" /> <!-- White border background -->
        ${svgPaths}
        <circle cx="12" cy="12" r="12" fill="none" stroke="white" stroke-width="2" /> <!-- Outer border -->
      </svg>
    `.trim().replace(/\n/g, '')

    const svgDataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

    return {
      url: svgDataUrl,
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 12),
    }
  }

  // Load Google Maps API (same as before)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setMapError("API key de Google Maps no configurada")
      return
    }

    if (typeof window !== "undefined" && window.google?.maps) {
      setMapLoaded(true)
      return
    }

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

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

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

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    if (filteredLocations.length === 0) return

    const bounds = new google.maps.LatLngBounds()

    filteredLocations.forEach((location) => {
      const position = { lat: location.latitude, lng: location.longitude }

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `${location.clientName} - ${location.name}`,
        icon: getMarkerIcon(location.id)
      })

      marker.addListener("click", () => {
        setSelectedLocation(location)
        
        // We don't use InfoWindow anymore, just the bottom card
        // But we can pan to the marker
        mapInstanceRef.current?.panTo(position)
      })

      markersRef.current.push(marker)
      bounds.extend(position)
    })

    if (filteredLocations.length > 1) {
      mapInstanceRef.current.fitBounds(bounds)
    } else if (filteredLocations.length === 1) {
      mapInstanceRef.current.setCenter({ lat: filteredLocations[0].latitude, lng: filteredLocations[0].longitude })
      mapInstanceRef.current.setZoom(15)
    }
  }, [filteredLocations, mapLoaded, frequencies]) // Re-render markers when frequencies change

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
      {/* Header - Mobile optimized */}
      <div className="space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600 hidden sm:block" />
            <h3 className="text-lg sm:text-xl font-semibold">Mapa de Ubicaciones</h3>
          </div>
          <Badge variant="secondary" className="font-medium">
            {filteredLocations.length} ubicaciones
          </Badge>
        </div>

        {/* Legend - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-3 py-2 min-w-max">
            {FREQUENCY_DAYS.map(day => (
              <div key={day.id} className="flex items-center gap-1.5" title={day.fullLabel}>
                <div
                  className="w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: day.color }}
                />
                <span className="text-xs font-medium text-gray-600">{day.label}</span>
              </div>
            ))}
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5" title="Sin frecuencia asignada">
              <div className="w-3 h-3 rounded-full bg-gray-400 border border-white shadow-sm" />
              <span className="text-xs font-medium text-gray-500">N/A</span>
            </div>
          </div>
        </div>

        {/* Search - Full width on mobile */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por cliente o sucursal..."
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Map - Responsive height */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="w-full h-[calc(100vh-380px)] min-h-[300px] sm:min-h-[400px] md:h-[500px]"
          />
        </CardContent>
      </Card>

      {selectedLocation && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300 border-blue-100 shadow-md">
          <CardHeader className="pb-3 space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
              <span className="truncate">{selectedLocation.clientName}</span>
            </CardTitle>
            <Badge variant="secondary" className="w-fit text-xs">
              {selectedLocation.name} {selectedLocation.isMain && "(Principal)"}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Address info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-gray-700">{selectedLocation.address || "Sin dirección"}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Lat: {selectedLocation.latitude.toFixed(4)}</span>
                  <span>Lng: {selectedLocation.longitude.toFixed(4)}</span>
                </div>
              </div>

              {/* Frequency toggles */}
              {onToggleFrequency && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Días de entrega
                  </span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {FREQUENCY_DAYS.map((day) => {
                      const isActive = activeDays.includes(day.id)
                      const isToggling = togglingDay === day.id

                      return (
                        <button
                          key={day.id}
                          onClick={() => handleToggle(day.id)}
                          disabled={isToggling}
                          className={cn(
                            "h-9 sm:h-8 px-3 sm:px-4 rounded-full flex items-center justify-center text-xs font-semibold transition-all border",
                            isActive
                              ? "text-white border-transparent shadow-sm"
                              : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50 active:bg-gray-100",
                            isToggling && "opacity-70 cursor-wait"
                          )}
                          style={isActive ? { backgroundColor: day.color } : {}}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            day.label
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
