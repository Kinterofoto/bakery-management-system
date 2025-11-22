"use client"

import { useState, useRef, useEffect, DOMAttributes } from "react"
import { Check, ChevronDown } from "lucide-react"

interface Option {
  id: string
  label: string
}

interface MultiSelectFilterProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  placeholder = "Buscar...",
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id]
    onChange(newSelected)
  }

  // Get selected labels
  const selectedLabels = options
    .filter((opt) => selected.includes(opt.id))
    .map((opt) => opt.label)

  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect())
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-left text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between gap-2 transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
          {selected.length > 0 ? (
            <span className="text-xs font-medium text-blue-600 flex-shrink-0">
              ({selected.length})
            </span>
          ) : (
            <span className="text-xs text-gray-400 flex-shrink-0">-</span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && buttonRect && (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-lg z-50"
          style={{
            top: `${buttonRect.bottom + 4}px`,
            left: `${buttonRect.left}px`,
            width: `${buttonRect.width}px`,
            maxHeight: '240px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Input */}
          <div className="sticky top-0 p-2 border-b border-gray-200 bg-white">
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs text-gray-700 border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => toggleSelection(option.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <span className="flex-1">{option.label}</span>
                  {selected.includes(option.id) && (
                    <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
