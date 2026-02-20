"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, AlertCircle, Search, ChevronUp, ArrowLeft, X } from "lucide-react"
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
  onClose?: () => void
}

type SheetSnap = "peek" | "half" | "full"

export function ClientsMapView({ locations, loading, frequencies = [], onToggleFrequency, onClose }: ClientsMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersMapRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<BranchLocation | null>(null)
  const [togglingDay, setTogglingDay] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDay, setFilterDay] = useState<number | null>(null)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("peek")
  const dragStartY = useRef<number>(0)
  const dragStartSnap = useRef<SheetSnap>("peek")
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)")
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  // Filter locations
  const filteredLocations = useMemo(() => {
    let result = locations

    if (filterDay !== null) {
      const branchIdsForDay = new Set(
        frequencies
          .filter(f => f.day_of_week === filterDay && f.is_active)
          .map(f => f.branch_id)
      )
      result = result.filter(loc => branchIdsForDay.has(loc.id))
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(location =>
        location.clientName.toLowerCase().includes(term) ||
        location.name.toLowerCase().includes(term) ||
        location.address.toLowerCase().includes(term)
      )
    }

    return result
  }, [locations, searchTerm, filterDay, frequencies])

  const getActiveDays = useCallback((branchId: string) => {
    return frequencies
      .filter(f => f.branch_id === branchId && f.is_active)
      .map(f => f.day_of_week)
      .sort((a: number, b: number) => a - b)
  }, [frequencies])

  const activeDays = useMemo(() => {
    if (!selectedLocation) return []
    return getActiveDays(selectedLocation.id)
  }, [frequencies, selectedLocation, getActiveDays])

  const handleToggle = async (dayId: number) => {
    if (!selectedLocation || !onToggleFrequency) return
    setTogglingDay(dayId)
    try {
      await onToggleFrequency(selectedLocation.id, dayId)
    } finally {
      setTogglingDay(null)
    }
  }

  const getMarkerIcon = useCallback((branchId: string) => {
    const branchActiveDays = frequencies
      .filter(f => f.branch_id === branchId && f.is_active)
      .map(f => f.day_of_week)
      .sort((a: number, b: number) => a - b)

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

    const radius = 12, cx = 12, cy = 12
    const anglePerDay = 360 / branchActiveDays.length
    let svgPaths = ""

    branchActiveDays.forEach((dayId: number, index: number) => {
      const day = FREQUENCY_DAYS.find(d => d.id === dayId)
      const color = day?.color || "#9ca3af"
      const startRad = (index * anglePerDay - 90) * Math.PI / 180
      const endRad = ((index + 1) * anglePerDay - 90) * Math.PI / 180
      const x1 = cx + radius * Math.cos(startRad)
      const y1 = cy + radius * Math.sin(startRad)
      const x2 = cx + radius * Math.cos(endRad)
      const y2 = cy + radius * Math.sin(endRad)
      svgPaths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z" fill="${color}" stroke="none" />`
    })

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="white" />${svgPaths}<circle cx="12" cy="12" r="12" fill="none" stroke="white" stroke-width="2" /></svg>`
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(24, 24),
      anchor: new google.maps.Point(12, 12),
    }
  }, [frequencies])

  const handleSelectLocation = useCallback((location: BranchLocation) => {
    setSelectedLocation(location)
    setSheetSnap("half")
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: location.latitude, lng: location.longitude })
      const currentZoom = mapInstanceRef.current.getZoom()
      if (currentZoom && currentZoom < 14) {
        mapInstanceRef.current.setZoom(14)
      }
    }
  }, [])

  // Touch handlers for mobile bottom sheet
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragStartSnap.current = sheetSnap
  }, [sheetSnap])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - dragStartY.current
    const threshold = 60
    if (deltaY < -threshold) {
      if (dragStartSnap.current === "peek") setSheetSnap("half")
      else if (dragStartSnap.current === "half") setSheetSnap("full")
    } else if (deltaY > threshold) {
      if (dragStartSnap.current === "full") setSheetSnap("half")
      else if (dragStartSnap.current === "half") setSheetSnap("peek")
    }
  }, [])

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setMapError("API key de Google Maps no configurada"); return }
    if (typeof window !== "undefined" && window.google?.maps) { setMapLoaded(true); return }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) { setMapLoaded(true); clearInterval(checkLoaded) }
      }, 100)
      setTimeout(() => { clearInterval(checkLoaded); if (!window.google?.maps) setMapError("Error al cargar Google Maps") }, 10000)
      return () => clearInterval(checkLoaded)
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => { setTimeout(() => { window.google?.maps ? setMapLoaded(true) : setMapError("Google Maps no disponible") }, 100) }
    script.onerror = () => { setMapError("Error al cargar Google Maps") }
    document.head.appendChild(script)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 4.6500, lng: -74.0900 },
      zoom: 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
    })
    infoWindowRef.current = new google.maps.InfoWindow()
  }, [mapLoaded])

  // Create/destroy markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return
    const currentIds = new Set(filteredLocations.map(loc => loc.id))
    for (const [id] of markersMapRef.current) {
      if (!currentIds.has(id)) { markersMapRef.current.get(id)?.setMap(null); markersMapRef.current.delete(id) }
    }
    for (const location of filteredLocations) {
      const position = { lat: location.latitude, lng: location.longitude }
      if (!markersMapRef.current.has(location.id)) {
        const marker = new google.maps.Marker({ position, map: mapInstanceRef.current, title: `${location.clientName} - ${location.name}`, icon: getMarkerIcon(location.id) })
        marker.addListener("click", () => { setSelectedLocation(location); setSheetSnap("half"); mapInstanceRef.current?.panTo(position) })
        markersMapRef.current.set(location.id, marker)
      }
    }
  }, [filteredLocations, mapLoaded, getMarkerIcon])

  // Update marker icons on frequency change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return
    for (const [branchId, marker] of markersMapRef.current) { marker.setIcon(getMarkerIcon(branchId)) }
  }, [frequencies, mapLoaded, getMarkerIcon])

  if (loading) {
    return <Card><CardContent className="flex items-center justify-center p-8"><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /><p className="text-gray-600">Cargando ubicaciones...</p></div></CardContent></Card>
  }

  if (mapError) {
    return <Card><CardContent className="flex items-center justify-center p-8"><div className="text-center"><AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" /><p className="text-amber-600">{mapError}</p></div></CardContent></Card>
  }

  // --- Reusable UI pieces ---

  const searchBar = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input placeholder="Buscar cliente o sucursal..." className="pl-10 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
    </div>
  )

  const dayFilter = (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => setFilterDay(null)}
        className={cn("h-7 px-2.5 rounded-full text-xs font-medium transition-all border", filterDay === null ? "bg-gray-900 text-white border-gray-900" : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50")}
      >
        Todos
      </button>
      {FREQUENCY_DAYS.map((day) => (
        <button
          key={day.id}
          onClick={() => setFilterDay(filterDay === day.id ? null : day.id)}
          title={day.fullLabel}
          className={cn("h-7 w-7 rounded-full text-xs font-semibold transition-all border flex items-center justify-center", filterDay === day.id ? "text-white border-transparent shadow-sm" : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50")}
          style={filterDay === day.id ? { backgroundColor: day.color } : {}}
        >
          {day.label}
        </button>
      ))}
    </div>
  )

  const countAndLegend = (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs text-gray-500">{filteredLocations.length} ubicacion{filteredLocations.length !== 1 ? "es" : ""}</span>
      <div className="flex items-center gap-1">
        {FREQUENCY_DAYS.map(day => <div key={day.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: day.color }} title={day.fullLabel} />)}
        <div className="w-2 h-2 rounded-full bg-gray-400" title="Sin frecuencia" />
      </div>
    </div>
  )

  const clientList = (
    <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
      {filteredLocations.map((location) => {
        const isSelected = selectedLocation?.id === location.id
        const locationDays = getActiveDays(location.id)
        return (
          <button
            key={location.id}
            onClick={() => handleSelectLocation(location)}
            className={cn("w-full text-left p-2.5 rounded-lg transition-all border", isSelected ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{location.clientName}</p>
                <p className="text-xs text-gray-500 truncate">{location.name}{location.isMain && " (Principal)"}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{location.address || "Sin dirección"}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 mt-1">
                {locationDays.length > 0 ? locationDays.map((dayId: number) => {
                  const day = FREQUENCY_DAYS.find(d => d.id === dayId)
                  return <div key={dayId} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: day?.color || "#9ca3af" }} title={day?.fullLabel} />
                }) : <div className="w-2.5 h-2.5 rounded-full bg-gray-300" title="Sin frecuencia" />}
              </div>
            </div>
          </button>
        )
      })}
      {filteredLocations.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No se encontraron ubicaciones</p>
        </div>
      )}
    </div>
  )

  const selectedDetail = selectedLocation && (
    <div className="border-t pt-3 space-y-2 flex-shrink-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          {selectedLocation.clientName}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
            {selectedLocation.name} {selectedLocation.isMain && "(Principal)"}
          </Badge>
          <button onClick={() => setSelectedLocation(null)} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="bg-gray-50 rounded-md p-2 space-y-1">
        <p className="text-xs text-gray-700">{selectedLocation.address || "Sin dirección"}</p>
        <div className="flex gap-3 text-[10px] text-gray-500">
          <span>Lat: {selectedLocation.latitude.toFixed(4)}</span>
          <span>Lng: {selectedLocation.longitude.toFixed(4)}</span>
        </div>
      </div>
      {onToggleFrequency && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Días de entrega</span>
          <div className="flex flex-wrap gap-1">
            {FREQUENCY_DAYS.map((day) => {
              const isActive = activeDays.includes(day.id)
              const isToggling = togglingDay === day.id
              return (
                <button
                  key={day.id}
                  onClick={() => handleToggle(day.id)}
                  disabled={isToggling}
                  className={cn("h-7 w-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all border", isActive ? "text-white border-transparent shadow-sm" : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50", isToggling && "opacity-70 cursor-wait")}
                  style={isActive ? { backgroundColor: day.color } : {}}
                >
                  {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : day.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const sheetHeightClass = { peek: "h-[140px]", half: "h-[50vh]", full: "h-[85vh]" }[sheetSnap]

  if (isMobile) {
    // === MOBILE: Fullscreen overlay with back button + bottom sheet ===
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {/* Map fills entire screen */}
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />

        {/* Back button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
        )}

        {/* Bottom Sheet */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out flex flex-col z-10",
            sheetHeightClass
          )}
        >
          <div
            className="flex justify-center py-2.5 flex-shrink-0 cursor-grab"
            onClick={() => setSheetSnap(sheetSnap === "peek" ? "half" : sheetSnap === "half" ? "full" : "half")}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col gap-2.5 px-4 pb-4 min-h-0">
            {searchBar}
            {sheetSnap !== "peek" && (
              <>
                {dayFilter}
                {countAndLegend}
                {selectedLocation ? selectedDetail : clientList}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // === DESKTOP: Sidebar + Map ===
  return (
    <div className="relative h-[calc(100vh-220px)] min-h-[500px]">
      <div className="absolute inset-0 left-[336px] rounded-xl overflow-hidden">
        <div ref={mapRef} className="w-full h-full" />
      </div>
      <div className="flex flex-col gap-3 absolute left-0 top-0 bottom-0 w-80 overflow-hidden z-10">
        {searchBar}
        {dayFilter}
        {countAndLegend}
        {clientList}
        {selectedDetail}
      </div>
    </div>
  )
}
