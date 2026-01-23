"use client"

import { useState, useEffect, useRef } from "react"
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Check, AlertCircle, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

// Extend window type
declare global {
  interface Window {
    google?: any
  }
}

interface AddressAutocompleteProps {
  value: string
  coordinates?: { lat: number; lng: number } | null
  onChange: (address: string, coordinates: { lat: number; lng: number } | null) => void
  placeholder?: string
  disabled?: boolean
}

// Inner component that uses the hook - only rendered when API is loaded
function AutocompleteInput({
  value,
  coordinates,
  onChange,
  placeholder,
  disabled,
}: AddressAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isInternalChange = useRef(false)

  // Check if we have valid coordinates from parent state
  const hasValidCoordinates = !!(coordinates?.lat && coordinates?.lng)

  const {
    ready,
    value: autocompleteValue,
    suggestions: { status, data },
    setValue: setAutocompleteValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "co" },
    },
    debounce: 300,
    cache: 24 * 60 * 60,
  })

  // Sync external value with internal autocomplete value (only when changed externally)
  useEffect(() => {
    if (!isInternalChange.current && value !== autocompleteValue) {
      setAutocompleteValue(value, false)
    }
    isInternalChange.current = false
  }, [value, setAutocompleteValue])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    isInternalChange.current = true
    setAutocompleteValue(newValue)
    onChange(newValue, null)
    setShowDropdown(true)
  }

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    const address = suggestion.description
    isInternalChange.current = true
    setAutocompleteValue(address, false)
    setShowDropdown(false)
    clearSuggestions()

    try {
      const results = await getGeocode({ address })
      const { lat, lng } = await getLatLng(results[0])
      onChange(address, { lat, lng })
    } catch (error) {
      console.error("Error getting coordinates:", error)
      onChange(address, null)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={autocompleteValue}
          onChange={handleInput}
          onFocus={() => {
            if (data.length > 0) {
              setShowDropdown(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled || !ready}
          className={cn(
            "pl-9 pr-9",
            hasValidCoordinates && "border-green-500"
          )}
        />
        {hasValidCoordinates && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        {value && !hasValidCoordinates && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
        )}
      </div>

      {showDropdown && status === "OK" && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion

            return (
              <button
                key={place_id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex flex-col border-b last:border-b-0"
              >
                <span className="font-medium text-sm">{main_text}</span>
                <span className="text-xs text-muted-foreground">{secondary_text}</span>
              </button>
            )
          })}
        </div>
      )}

      {value && !hasValidCoordinates && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Selecciona una dirección de la lista para validar la ubicación
        </p>
      )}
    </div>
  )
}

// Main component that handles API loading
export function AddressAutocomplete(props: AddressAutocompleteProps) {
  const [apiLoaded, setApiLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setApiError("API key de Google Maps no configurada")
      return
    }

    // Check if already loaded
    if (typeof window !== "undefined" && window.google?.maps?.places) {
      setApiLoaded(true)
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setApiLoaded(true)
          clearInterval(checkLoaded)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkLoaded)
        if (!window.google?.maps?.places) {
          setApiError("Error al cargar Google Maps. Usando campo manual.")
        }
      }, 10000)

      return () => clearInterval(checkLoaded)
    }

    // Load Google Maps script
    const script = document.createElement("script")
    script.id = "google-maps-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      // Wait a bit for places library to be ready
      setTimeout(() => {
        if (window.google?.maps?.places) {
          setApiLoaded(true)
          setApiError(null)
        } else {
          setApiError("Places library no disponible")
        }
      }, 100)
    }

    script.onerror = () => {
      console.error("Error loading Google Maps API")
      setApiError("Error al cargar Google Maps. Usando campo manual.")
    }

    document.head.appendChild(script)
  }, [])

  // Fallback to textarea if API fails to load or is still loading
  if (!apiLoaded || apiError) {
    return (
      <div className="space-y-1">
        <Textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value, null)}
          placeholder={apiError ? "Dirección (autocompletado no disponible)" : "Cargando..."}
          disabled={props.disabled || !apiLoaded}
          rows={3}
        />
        {apiError && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {apiError}
          </p>
        )}
      </div>
    )
  }

  return <AutocompleteInput {...props} />
}
