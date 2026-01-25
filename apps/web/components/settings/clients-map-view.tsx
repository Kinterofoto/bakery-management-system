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
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">Mapa de Ubicaciones</h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-600 text-sm">
                Visualiza las sucursales y sus días de entrega
              </p>
              {/* Legend */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border shadow-sm">
                {FREQUENCY_DAYS.map(day => (
                  <div key={day.id} className="flex items-center gap-1" title={day.fullLabel}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: day.color }}></div>
                    <span className="text-[10px] font-medium text-gray-500">{day.label}</span>
                  </div>
                ))}
                <div className="w-px h-3 bg-gray-300 mx-1"></div>
                <div className="flex items-center gap-1" title="Sin frecuencia asignada">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                  <span className="text-[10px] font-medium text-gray-500">N/A</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {filteredLocations.length} ubicación{filteredLocations.length !== 1 ? 'es' : ''}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por cliente o sucursal..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div
            ref={mapRef}
            className="w-full h-[500px] rounded-lg" // Reduced height slightly to make room for card
            style={{ minHeight: "500px" }}
          />
        </CardContent>
      </Card>

      {selectedLocation && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              {selectedLocation.clientName}
            </CardTitle>
            <Badge variant="outline" className="font-normal">
              {selectedLocation.name} {selectedLocation.isMain && "(Principal)"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wide">Dirección</span>
                  <p className="font-medium">{selectedLocation.address}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-gray-500 block text-xs uppercase tracking-wide">Latitud</span>
                    <p className="font-medium">{selectedLocation.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs uppercase tracking-wide">Longitud</span>
                    <p className="font-medium">{selectedLocation.longitude.toFixed(6)}</p>
                  </div>
                </div>
              </div>

              {onToggleFrequency && (
                <div className="space-y-2">
                  <span className="text-gray-500 block text-xs uppercase tracking-wide mb-2">
                    Días de Frecuencia (Click para editar)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {FREQUENCY_DAYS.map((day) => {
                      const isActive = activeDays.includes(day.id)
                      const isToggling = togglingDay === day.id
                      
                      return (
                        <button
                          key={day.id}
                          onClick={() => handleToggle(day.id)}
                          disabled={isToggling}
                          className={cn(
                            "h-8 px-3 rounded-full flex items-center justify-center text-xs font-bold transition-all border shadow-sm",
                            isActive 
                              ? "text-white border-transparent transform hover:scale-105" 
                              : "text-gray-500 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300",
                            isToggling && "opacity-70 cursor-wait scale-95"
                          )}
                          style={isActive ? { backgroundColor: day.color } : {}}
                          title={`Alternar ${day.fullLabel}`}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : null}
                          {day.fullLabel}
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
